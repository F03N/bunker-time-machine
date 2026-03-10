import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const KIE_API_KEY = Deno.env.get("KIE_API_KEY");
    if (!KIE_API_KEY) throw new Error("KIE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const mode = body.mode || "start";

    if (mode === "poll") {
      return await handlePoll(body.taskId, KIE_API_KEY, supabase, body.projectName, body.pairIndex);
    }

    return await handleStart(body, KIE_API_KEY, supabase);
  } catch (e) {
    console.error("veo-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function uploadBase64ToStorage(supabase: any, base64: string, projectName: string, label: string): Promise<string> {
  const cleanBase64 = base64.includes(",") ? base64.split(",")[1] : base64;
  const bytes = Uint8Array.from(atob(cleanBase64), c => c.charCodeAt(0));
  const safeName = (projectName || "project").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${safeName}/frames/${label}_${Date.now()}.png`;

  const { error } = await supabase.storage
    .from("bunker-assets")
    .upload(fileName, bytes, { contentType: "image/png", upsert: true });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  const { data } = supabase.storage.from("bunker-assets").getPublicUrl(fileName);
  return data.publicUrl;
}

async function handleStart(body: any, apiKey: string, supabase: any) {
  const { prompt, model, startImageBase64, endImageBase64, projectName } = body;
  if (!prompt) throw new Error("prompt is required");

  // Upload images to storage to get public URLs for KIE API
  const imageUrls: string[] = [];

  if (startImageBase64) {
    const startUrl = await uploadBase64ToStorage(supabase, startImageBase64, projectName, "start");
    imageUrls.push(startUrl);
    console.log(`Uploaded start frame: ${startUrl}`);
  }

  if (endImageBase64) {
    const endUrl = await uploadBase64ToStorage(supabase, endImageBase64, projectName, "end");
    imageUrls.push(endUrl);
    console.log(`Uploaded end frame: ${endUrl}`);
  }

  const kieModel = model === "veo-3.1-fast-generate-preview" ? "veo3_fast" : "veo3";

  const requestBody: any = {
    prompt,
    model: kieModel,
    aspect_ratio: "9:16",
    enableTranslation: false,
  };

  if (imageUrls.length > 0) {
    requestBody.imageUrls = imageUrls;
    requestBody.generationType = "FIRST_AND_LAST_FRAMES_2_VIDEO";
  } else {
    requestBody.generationType = "TEXT_2_VIDEO";
  }

  console.log(`Starting Veo generation via KIE: model=${kieModel}, images=${imageUrls.length}`);

  const response = await fetch("https://api.kie.ai/api/v1/veo/generate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  const data = await response.json();

  if (data.code !== 200 || !data.data?.taskId) {
    console.error("KIE API error:", JSON.stringify(data));

    if (data.code === 429) {
      return new Response(JSON.stringify({
        error: "تم تجاوز حصة API. حاول مرة أخرى بعد دقائق.",
        errorCode: "RATE_LIMITED",
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      error: data.msg || `KIE API error (${data.code})`,
      details: JSON.stringify(data).substring(0, 500),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`KIE Veo task started: ${data.data.taskId}`);

  return new Response(JSON.stringify({
    status: "started",
    taskId: data.data.taskId,
    // Keep operationName for backward compat with client
    operationName: data.data.taskId,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handlePoll(taskId: string, apiKey: string, supabase: any, projectName: string, pairIndex: number) {
  if (!taskId) throw new Error("taskId is required for polling");

  console.log(`Polling KIE Veo task: ${taskId}`);

  const response = await fetch(`https://api.kie.ai/api/v1/veo/record-info?taskId=${taskId}`, {
    headers: { "Authorization": `Bearer ${apiKey}` },
  });

  const data = await response.json();

  if (data.code !== 200) {
    return new Response(JSON.stringify({
      status: "polling",
      done: false,
      error: data.msg || `Poll error (${data.code})`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const successFlag = data.data?.successFlag;

  // 0 = generating
  if (successFlag === 0) {
    return new Response(JSON.stringify({
      status: "polling",
      done: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 2 or 3 = failed
  if (successFlag === 2 || successFlag === 3) {
    return new Response(JSON.stringify({
      status: "error",
      done: true,
      error: data.data?.errorMessage || "Veo generation failed via KIE",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // 1 = success
  const resultUrl = data.data?.response?.resultUrls?.[0] || data.data?.response?.originUrls?.[0];

  if (!resultUrl) {
    console.error("No video URL in KIE result:", JSON.stringify(data).substring(0, 1000));
    return new Response(JSON.stringify({
      status: "error",
      done: true,
      error: "No video URL in KIE result",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Download video and upload to our storage
  console.log(`Downloading video from KIE: ${resultUrl}`);
  const dlResponse = await fetch(resultUrl);
  if (!dlResponse.ok) {
    // Return the KIE URL directly if download fails
    return new Response(JSON.stringify({
      status: "complete",
      done: true,
      videoUrl: resultUrl,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const arrayBuffer = await dlResponse.arrayBuffer();
  const videoBytes = new Uint8Array(arrayBuffer);
  const safeName = (projectName || "project").replace(/[^a-zA-Z0-9_-]/g, "_");
  const fileName = `${safeName}/transitions/transition_${(pairIndex ?? 0) + 1}_${Date.now()}.mp4`;

  const { error: uploadError } = await supabase.storage
    .from("bunker-assets")
    .upload(fileName, videoBytes, { contentType: "video/mp4", upsert: true });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return new Response(JSON.stringify({
      status: "complete",
      done: true,
      videoUrl: resultUrl,
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
