import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const body = await req.json();

    // Two modes: "start" (create operation) or "poll" (check operation status)
    const mode = body.mode || "start";

    if (mode === "poll") {
      return await handlePoll(body.operationName, GOOGLE_AI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, body.projectName, body.pairIndex);
    }

    return await handleStart(body, GOOGLE_AI_API_KEY);
  } catch (e) {
    console.error("veo-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleStart(body: any, apiKey: string) {
  const { prompt, model, startImageBase64, endImageBase64 } = body;

  if (!prompt) throw new Error("prompt is required");

  const modelId = model || "veo-3.1-generate-preview";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predictLongRunning?key=${apiKey}`;

  const instance: any = { prompt };

  if (startImageBase64) {
    instance.image = { bytesBase64Encoded: startImageBase64 };
  }

  if (endImageBase64) {
    instance.endImage = { bytesBase64Encoded: endImageBase64 };
  }

  const requestBody = {
    instances: [instance],
    parameters: {
      aspectRatio: "9:16",
      durationSeconds: 5,
      personGeneration: "ALLOW_ALL",
      safetyFilterLevel: "BLOCK_ONLY_HIGH",
    },
  };

  console.log(`Starting Veo generation: model=${modelId}, hasStart=${!!startImageBase64}, hasEnd=${!!endImageBase64}`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Veo API error:", response.status, errorText);
    return new Response(JSON.stringify({
      error: `Veo API error (${response.status})`,
      details: errorText,
    }), {
      status: response.status === 429 ? 429 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const operationData = await response.json();
  const operationName = operationData.name;

  if (!operationName) {
    return new Response(JSON.stringify({
      status: "error",
      error: "No operation name returned from Veo",
      raw: JSON.stringify(operationData).substring(0, 1000),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`Veo operation started: ${operationName}`);

  return new Response(JSON.stringify({
    status: "started",
    operationName,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handlePoll(operationName: string, apiKey: string, supabaseUrl: string, serviceKey: string, projectName: string, pairIndex: number) {
  if (!operationName) throw new Error("operationName is required for polling");

  const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;

  console.log(`Polling Veo operation: ${operationName}`);

  const pollResponse = await fetch(pollUrl);
  if (!pollResponse.ok) {
    const errorText = await pollResponse.text();
    return new Response(JSON.stringify({
      status: "polling",
      done: false,
      error: `Poll error (${pollResponse.status}): ${errorText}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const pollData = await pollResponse.json();

  if (!pollData.done) {
    return new Response(JSON.stringify({
      status: "polling",
      done: false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Operation complete
  const videoBase64 = pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri
    ? null // If URI is returned instead of base64
    : pollData.response?.predictions?.[0]?.bytesBase64Encoded;

  const videoUri = pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;

  if (!videoBase64 && !videoUri) {
    console.error("No video in Veo result:", JSON.stringify(pollData).substring(0, 1000));
    return new Response(JSON.stringify({
      status: "error",
      done: true,
      error: "No video in Veo result",
      raw: JSON.stringify(pollData).substring(0, 1000),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // If we got a URI, download it
  let finalVideoBytes: Uint8Array;
  if (videoUri) {
    console.log(`Downloading video from URI: ${videoUri}`);
    const downloadUrl = `${videoUri}&key=${apiKey}`;
    const dlResponse = await fetch(downloadUrl);
    if (!dlResponse.ok) {
      return new Response(JSON.stringify({
        status: "error",
        done: true,
        error: `Failed to download video: ${dlResponse.status}`,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const arrayBuffer = await dlResponse.arrayBuffer();
    finalVideoBytes = new Uint8Array(arrayBuffer);
  } else {
    finalVideoBytes = Uint8Array.from(atob(videoBase64!), c => c.charCodeAt(0));
  }

  // Upload to storage
  const supabase = createClient(supabaseUrl, serviceKey);
  const safeName = (projectName || 'project').replace(/[^a-zA-Z0-9_-]/g, '_');
  const fileName = `${safeName}/transitions/transition_${(pairIndex ?? 0) + 1}_${Date.now()}.mp4`;

  const { error: uploadError } = await supabase.storage
    .from("bunker-assets")
    .upload(fileName, finalVideoBytes, { contentType: "video/mp4", upsert: true });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    return new Response(JSON.stringify({
      status: "complete",
      done: true,
      storageError: uploadError.message,
      videoUri, // Return the original URI if storage fails
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: publicUrl } = supabase.storage
    .from("bunker-assets")
    .getPublicUrl(fileName);

  return new Response(JSON.stringify({
    status: "complete",
    done: true,
    videoUrl: publicUrl.publicUrl,
    storagePath: fileName,
  }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
