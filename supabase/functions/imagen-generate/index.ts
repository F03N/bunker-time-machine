import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) throw new Error("Supabase config missing");

    const { prompt, referenceImageBase64, sceneIndex, projectName } = await req.json();

    if (!prompt) throw new Error("prompt is required");

    // Use Gemini image generation model via Lovable AI Gateway
    const model = "google/gemini-3-pro-image-preview";

    // Build messages - if we have a reference image, include it for visual continuity
    const userContent: any[] = [];

    if (referenceImageBase64) {
      userContent.push({
        type: "text",
        text: `You are generating the next scene in a bunker restoration timelapse sequence. Use the provided reference image as visual guidance for the bunker's identity, camera angle, structure, and environment. Generate a NEW image that shows the next stage of restoration based on this prompt:\n\n${prompt}\n\nCRITICAL: Maintain the EXACT same bunker structure, entrance geometry, camera angle, and surrounding environment from the reference image. Only change the restoration progress as described in the prompt. Output format: 9:16 vertical, photorealistic.`,
      });
      userContent.push({
        type: "image_url",
        image_url: {
          url: `data:image/png;base64,${referenceImageBase64}`,
        },
      });
    } else {
      userContent.push({
        type: "text",
        text: `Generate a photorealistic image based on this prompt:\n\n${prompt}\n\nOutput format: 9:16 vertical, photorealistic. Do not include any text or watermarks.`,
      });
    }

    console.log(`Calling ${model}, prompt length: ${prompt.length}, hasReference: ${!!referenceImageBase64}`);

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: userContent }],
        modalities: ["image", "text"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI Gateway error:", response.status, errorText);
      return new Response(JSON.stringify({
        error: `AI Gateway error (${response.status})`,
        details: errorText,
      }), {
        status: response.status === 429 ? 429 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const imageData = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageData) {
      console.error("No image in response:", JSON.stringify(data).substring(0, 500));
      return new Response(JSON.stringify({
        error: "No image generated",
        details: "The model did not return an image. Try simplifying the prompt.",
        raw: JSON.stringify(data).substring(0, 1000),
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Extract base64 from data URL
    const imageBase64 = imageData.startsWith("data:") ? imageData.split(",")[1] : imageData;

    // Upload to Cloud storage
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const safeName = (projectName || "project").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${safeName}/scenes/scene_${(sceneIndex ?? 0) + 1}_${Date.now()}.png`;
    const imageBytes = Uint8Array.from(atob(imageBase64), (c) => c.charCodeAt(0));

    const { error: uploadError } = await supabase.storage
      .from("bunker-assets")
      .upload(fileName, imageBytes, { contentType: "image/png", upsert: true });

    if (uploadError) {
      console.error("Storage upload error:", uploadError);
      return new Response(JSON.stringify({
        imageUrl: `data:image/png;base64,${imageBase64}`,
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
