import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const GOOGLE_AI_API_KEY = Deno.env.get("GOOGLE_AI_API_KEY");
    if (!GOOGLE_AI_API_KEY) throw new Error("GOOGLE_AI_API_KEY is not configured");

    const { messages, model, systemPrompt, imageInputs } = await req.json();

    const modelId = model || "gemini-2.5-pro";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:generateContent?key=${GOOGLE_AI_API_KEY}`;

    // Convert messages to Gemini format
    const contents: any[] = [];
    if (systemPrompt) {
      contents.push({ role: "user", parts: [{ text: systemPrompt }] });
      contents.push({ role: "model", parts: [{ text: "Understood. I will follow these instructions." }] });
    }

    for (const msg of messages) {
      const parts: any[] = [{ text: msg.content }];
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts,
      });
    }

    // If image inputs are provided, add them to the last user message for Gemini Vision
    if (imageInputs && imageInputs.length > 0) {
      const lastUserIdx = contents.length - 1;
      if (lastUserIdx >= 0 && contents[lastUserIdx].role === "user") {
        for (const img of imageInputs) {
          // Add label before image
          contents[lastUserIdx].parts.push({ text: `\n[${img.label}]` });
          // Add inline image data
          contents[lastUserIdx].parts.push({
            inlineData: {
              mimeType: "image/png",
              data: img.base64,
            },
          });
        }
        console.log(`Added ${imageInputs.length} images to Gemini request for vision analysis`);
      }
    }

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(JSON.stringify({ error: `Gemini API error: ${response.status}`, details: errorText }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return new Response(JSON.stringify({ text }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("gemini-generate error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
