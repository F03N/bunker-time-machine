import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PIAPI_BASE = "https://api.piapi.ai/api/v1";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const PIAPI_API_KEY = Deno.env.get("PIAPI_API_KEY");
    if (!PIAPI_API_KEY) throw new Error("PIAPI_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const body = await req.json();
    const mode = body.mode || "start";

    if (mode === "poll") {
      return await handlePoll(body.taskId, PIAPI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, body.projectName, body.pairIndex);
    }

    return await handleStart(body, PIAPI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  } catch (e) {
    console.error("kling-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function uploadBase64ToStorage(
  base64: string,
  supabaseUrl: string,
  serviceKey: string,
  projectName: string,
  label: string
): Promise<string> {
  const supabase = createClient(supabaseUrl, serviceKey);
  const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
  const bytes = Uint8Array.from(atob(cleanBase64), (c) => c.charCodeAt(0));
  const safeName = (projectName || "project").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${safeName}/kling_frames/${label}_${Date.now()}.png`;

  const { error } = await supabase.storage
    .from("bunker-assets")
    .upload(fileName, bytes, { contentType: "image/png", upsert: true });

  if (error) throw new Error(`Failed to upload ${label} frame: ${error.message}`);

  const { data } = supabase.storage.from("bunker-assets").getPublicUrl(fileName);
  return data.publicUrl;
}

async function handleStart(body: any, apiKey: string, supabaseUrl: string, serviceKey: string) {
  const { prompt, startImageBase64, endImageBase64, projectName, pairIndex, klingVersion, klingMode, duration } = body;

  if (!prompt) throw new Error("prompt is required");

  // Upload frames to storage to get public URLs for Kling
  let imageUrl: string | undefined;
  let imageTailUrl: string | undefined;

  if (startImageBase64) {
    imageUrl = await uploadBase64ToStorage(startImageBase64, supabaseUrl, serviceKey, projectName, `start_${pairIndex}`);
    console.log(`Uploaded start frame: ${imageUrl}`);
  }

  if (endImageBase64) {
    imageTailUrl = await uploadBase64ToStorage(endImageBase64, supabaseUrl, serviceKey, projectName, `end_${pairIndex}`);
    console.log(`Uploaded end frame: ${imageTailUrl}`);
  }

  const requestBody: any = {
    model: "kling",
    task_type: "video_generation",
    input: {
      prompt,
      negative_prompt: "morphing, magical effects, dramatic camera movement, blurry, low quality",
      cfg_scale: "0.5",
      duration: duration || 5,
      mode: klingMode || "std",
      version: klingVersion || "2.6",
    },
  };

  if (imageUrl) {
    requestBody.input.image_url = imageUrl;
  } else {
    // Text-to-video needs aspect_ratio
    requestBody.input.aspect_ratio = "9:16";
  }

  if (imageTailUrl) {
    requestBody.input.image_tail_url = imageTailUrl;
  }

  console.log(`Starting Kling generation: version=${requestBody.input.version}, mode=${requestBody.input.mode}, hasStart=${!!imageUrl}, hasEnd=${!!imageTailUrl}`);

  const response = await fetch(`${PIAPI_BASE}/task`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (!response.ok || data.code !== 200) {
    console.error("Kling API error:", JSON.stringify(data));
    const isRateLimit = response.status === 429 || data.code === 429;
    return new Response(JSON.stringify({
      error: isRateLimit ? "تم تجاوز حصة Kling API. حاول مرة أخرى بعد دقائق." : `Kling API error: ${data.message || JSON.stringify(data)}`,
      errorCode: isRateLimit ? "RATE_LIMITED" : undefined,
    }), {
      status: isRateLimit ? 429 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const taskId = data.data?.task_id;
  if (!taskId) {
    return new Response(JSON.stringify({
      error: "No task_id returned from Kling",
      raw: JSON.stringify(data).substring(0, 1000),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Kling task started: ${taskId}, status: ${data.data?.status}`);

  return new Response(JSON.stringify({
    status: "started",
    taskId,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handlePoll(taskId: string, apiKey: string, supabaseUrl: string, serviceKey: string, projectName: string, pairIndex: number) {
  if (!taskId) throw new Error("taskId is required for polling");

  console.log(`Polling Kling task: ${taskId}`);

  const response = await fetch(`${PIAPI_BASE}/task/${taskId}`, {
    method: "GET",
    headers: { "x-api-key": apiKey },
  });

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(JSON.stringify({
      status: "polling",
      done: false,
      error: `Poll error (${response.status}): ${errorText}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await response.json();
  const taskStatus = data.data?.status;

  if (taskStatus === "Failed") {
    return new Response(JSON.stringify({
      status: "error",
      done: true,
      error: data.data?.error?.message || "Kling generation failed",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (taskStatus !== "Completed") {
    return new Response(JSON.stringify({
      status: "polling",
      done: false,
      taskStatus,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Completed - get video URL
  const output = data.data?.output;
  const videoUrl = output?.works?.[0]?.resource?.resource || output?.video_url || output?.works?.[0]?.video?.resource;

  if (!videoUrl) {
    console.error("No video in Kling result:", JSON.stringify(data).substring(0, 1000));
    return new Response(JSON.stringify({
      status: "error",
      done: true,
      error: "No video URL in Kling result",
      raw: JSON.stringify(data).substring(0, 1000),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Download and upload to our storage
  console.log(`Downloading Kling video: ${videoUrl}`);
  const dlResponse = await fetch(videoUrl);
  if (!dlResponse.ok) {
    // Return the original URL if download fails
    return new Response(JSON.stringify({
      status: "complete",
      done: true,
      videoUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const arrayBuffer = await dlResponse.arrayBuffer();
  const videoBytes = new Uint8Array(arrayBuffer);

  const supabase = createClient(supabaseUrl, serviceKey);
  const safeName = (projectName || "project").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${safeName}/transitions/kling_transition_${(pairIndex ?? 0) + 1}_${Date.now()}.mp4`;

  const { error: uploadError } = await supabase.storage
    .from("bunker-assets")
    .upload(fileName, videoBytes, { contentType: "video/mp4", upsert: true });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return new Response(JSON.stringify({
      status: "complete",
      done: true,
      videoUrl, // fallback to original URL
      storageError: uploadError.message,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: publicUrl } = supabase.storage.from("bunker-assets").getPublicUrl(fileName);

  return new Response(JSON.stringify({
    status: "complete",
    done: true,
    videoUrl: publicUrl.publicUrl,
    storagePath: fileName,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
