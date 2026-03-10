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

    const {
      model,
      prompt,
      startImageBase64,
      endImageBase64,
      pairIndex,
      projectName,
    } = await req.json();

    // Model: veo-3.1-fast-generate-preview or veo-3.1-generate-preview
    const modelId = model || "veo-3.1-generate-preview";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predictLongRunning?key=${GOOGLE_AI_API_KEY}`;

    // Build the request
    const instance: any = { prompt };

    // Include start frame
    if (startImageBase64) {
      instance.image = {
        bytesBase64Encoded: startImageBase64,
      };
    }

    // Include end frame if available (guided mode)
    if (endImageBase64) {
      instance.endImage = {
        bytesBase64Encoded: endImageBase64,
      };
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

    // Start the long-running operation
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Veo API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: `Veo API error: ${response.status}`, details: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const operationData = await response.json();
    const operationName = operationData.name;

    if (!operationName) {
      return new Response(JSON.stringify({
        status: "submitted",
        message: "Video generation submitted but no operation name returned.",
        raw: operationData,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Poll for completion (up to 5 minutes with 10s intervals)
    const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${GOOGLE_AI_API_KEY}`;
    let result = null;
    for (let i = 0; i < 30; i++) {
      await new Promise(r => setTimeout(r, 10000));

      const pollResponse = await fetch(pollUrl);
      if (!pollResponse.ok) continue;

      const pollData = await pollResponse.json();
      if (pollData.done) {
        result = pollData;
        break;
      }
    }

    if (!result) {
      return new Response(JSON.stringify({
        status: "timeout",
        operationName,
        message: "Video generation timed out after 5 minutes. Use the operation name to check status later.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract video
    const videoBase64 = result.response?.predictions?.[0]?.bytesBase64Encoded;
    if (!videoBase64) {
      return new Response(JSON.stringify({
        status: "error",
        message: "No video in result",
        raw: result,
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const fileName = `${projectName || 'project'}/transitions/transition_${pairIndex + 1}_${Date.now()}.mp4`;
    const videoBytes = Uint8Array.from(atob(videoBase64), c => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from("bunker-assets")
      .upload(fileName, videoBytes, { contentType: "video/mp4", upsert: true });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(JSON.stringify({
        videoBase64: videoBase64.substring(0, 100) + "...",
        storageError: uploadError.message,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrl } = supabase.storage
      .from("bunker-assets")
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({
      videoUrl: publicUrl.publicUrl,
      storagePath: fileName,
      status: "complete",
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("veo-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
