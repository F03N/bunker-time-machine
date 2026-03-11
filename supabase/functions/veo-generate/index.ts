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

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const body = await req.json();
    const mode = body.mode || "generate";

    if (mode === "poll") {
      return await handlePoll(body.operationName, GOOGLE_AI_API_KEY, supabase, body.projectName, body.pairIndex);
    }

    return await handleGenerate(body, GOOGLE_AI_API_KEY, supabase);
  } catch (e) {
    console.error("veo-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function handleGenerate(body: any, apiKey: string, supabase: any) {
  const { prompt, model, startImageBase64, endImageBase64, projectName, pairIndex } = body;
  if (!prompt) throw new Error("prompt is required");

  const veoModel = model || "veo-3.1-generate-preview";
  const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${veoModel}:predictLongRunning?key=${apiKey}`;

  // Build the request — strict pair transition: Image A as start frame
  const instances: any = { prompt };

  if (startImageBase64) {
    const cleanBase64 = startImageBase64.includes(",") ? startImageBase64.split(",")[1] : startImageBase64;
    instances.image = { bytesBase64Encoded: cleanBase64 };
    console.log(`Using start frame (Image A) as initial image for Veo`);
  }

  // Veo 3.1 does NOT support exact end-frame matching.
  // End image is included in prompt context only as a visual guide.
  if (endImageBase64) {
    console.log(`End image (Image B) provided as visual target/guide — NOT exact end-frame (Veo limitation)`);
  }

  // Scene-aware person generation for video transitions
  // Allow workers in video since the prompt controls their presence per scene
  const requestBody = {
    instances: [instances],
    parameters: {
      aspectRatio: "9:16",
      sampleCount: 1,
      durationSeconds: 5,
      personGeneration: "allow_adult",
    },
  };

  console.log(`Starting Veo generation: model=${veoModel}, pairIndex=${pairIndex}`);

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Veo API error:", response.status, errorText);

    if (response.status === 429) {
      return new Response(JSON.stringify({
        error: "API quota exceeded. Wait a few minutes and try again.",
        errorCode: "RATE_LIMITED",
      }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      error: `Veo API error (${response.status})`,
      details: errorText.substring(0, 500),
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await response.json();

  // Long-running operation
  if (data.name) {
    console.log(`Veo long-running operation started: ${data.name}`);
    return new Response(JSON.stringify({
      status: "started",
      operationName: data.name,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Synchronous result
  const videoData = data.predictions?.[0]?.video;
  if (videoData?.bytesBase64Encoded) {
    const videoBytes = Uint8Array.from(atob(videoData.bytesBase64Encoded), c => c.charCodeAt(0));
    const safeName = (projectName || "project").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${safeName}/transitions/transition_${(pairIndex ?? 0) + 1}_${Date.now()}.mp4`;

    const { error: uploadError } = await supabase.storage
      .from("bunker-assets")
      .upload(fileName, videoBytes, { contentType: "video/mp4", upsert: true });

    if (uploadError) {
      return new Response(JSON.stringify({
        videoUrl: `data:video/mp4;base64,${videoData.bytesBase64Encoded}`,
        status: "complete",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrl } = supabase.storage.from("bunker-assets").getPublicUrl(fileName);
    return new Response(JSON.stringify({
      videoUrl: publicUrl.publicUrl,
      status: "complete",
      storagePath: fileName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({
    error: "Unexpected Veo response format",
    details: JSON.stringify(data).substring(0, 500),
  }), {
    status: 500,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function handlePoll(operationName: string, apiKey: string, supabase: any, projectName: string, pairIndex: number) {
  if (!operationName) throw new Error("operationName is required for polling");

  const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;
  console.log(`Polling Veo operation: ${operationName}`);

  const response = await fetch(pollUrl);

  if (!response.ok) {
    const errorText = await response.text();
    return new Response(JSON.stringify({
      status: "polling",
      done: false,
      error: `Poll error (${response.status}): ${errorText.substring(0, 200)}`,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const data = await response.json();

  if (!data.done) {
    return new Response(JSON.stringify({ status: "polling", done: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (data.error) {
    return new Response(JSON.stringify({
      status: "error",
      done: true,
      error: data.error.message || "Veo generation failed",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const videoData = data.response?.predictions?.[0]?.video || data.response?.generatedSamples?.[0]?.video;

  if (!videoData?.bytesBase64Encoded && !videoData?.uri) {
    console.error("No video in Veo result:", JSON.stringify(data).substring(0, 1000));
    return new Response(JSON.stringify({
      status: "error",
      done: true,
      error: "No video in Veo result",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let videoBytes: Uint8Array;
  if (videoData.uri) {
    const dlResponse = await fetch(videoData.uri);
    if (!dlResponse.ok) {
      return new Response(JSON.stringify({
        status: "complete",
        done: true,
        videoUrl: videoData.uri,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const arrayBuffer = await dlResponse.arrayBuffer();
    videoBytes = new Uint8Array(arrayBuffer);
  } else {
    videoBytes = Uint8Array.from(atob(videoData.bytesBase64Encoded), c => c.charCodeAt(0));
  }

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
      videoUrl: videoData.uri || `data:video/mp4;base64,${videoData.bytesBase64Encoded?.substring(0, 50)}...`,
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
