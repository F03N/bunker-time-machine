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

    const { prompt, model, referenceImageBase64, sceneIndex, projectName } = await req.json();

    // Model selection: imagen-4.0-fast-generate-001, imagen-4.0-generate-001, imagen-4.0-ultra-generate-001
    const modelId = model || "imagen-4.0-generate-001";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:predict?key=${GOOGLE_AI_API_KEY}`;

    // Build request body
    const instances: any = [{ prompt }];
    
    // If reference image provided, include it for structural continuity
    if (referenceImageBase64) {
      instances[0].referenceImages = [{
        referenceImage: {
          bytesBase64Encoded: referenceImageBase64,
        },
        referenceType: "STYLE",
      }];
    }

    const requestBody = {
      instances,
      parameters: {
        sampleCount: 1,
        aspectRatio: "9:16",
        personGeneration: "ALLOW_ALL",
        safetyFilterLevel: "BLOCK_ONLY_HIGH",
      },
    };

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Imagen API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: `Imagen API error: ${response.status}`, details: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;

    if (!imageBase64) {
      return new Response(JSON.stringify({ error: "No image generated", raw: data }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Upload to storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const fileName = `${projectName || 'project'}/scenes/scene_${sceneIndex + 1}_${Date.now()}.png`;
    const imageBytes = Uint8Array.from(atob(imageBase64), c => c.charCodeAt(0));

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("bunker-assets")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      // Still return base64 if storage fails
      return new Response(JSON.stringify({
        imageBase64,
        storageError: uploadError.message,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: publicUrl } = supabase.storage
      .from("bunker-assets")
      .getPublicUrl(fileName);

    return new Response(JSON.stringify({
      imageUrl: publicUrl.publicUrl,
      imageBase64,
      storagePath: fileName,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("imagen-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
