import { supabase } from '@/integrations/supabase/client';
import type { QualityMode } from '@/types/project';
import { getActiveModels } from '@/types/project';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface GeminiRequest {
  messages: { role: string; content: string }[];
  model?: string;
  systemPrompt?: string;
}

interface ImagenRequest {
  prompt: string;
  model?: string;
  referenceImageBase64?: string;
  sceneIndex: number;
  projectName: string;
}

interface VeoRequest {
  prompt: string;
  model?: string;
  startImageBase64: string;
  endImageBase64?: string;
  pairIndex: number;
  projectName: string;
}

export async function callGemini({ messages, model, systemPrompt }: GeminiRequest): Promise<string> {
  const { data, error } = await supabase.functions.invoke('gemini-generate', {
    body: { messages, model, systemPrompt },
  });

  if (error) throw new Error(`Gemini error: ${error.message}`);
  if (data.error) throw new Error(data.error);
  return data.text;
}

export async function callImagen(req: ImagenRequest): Promise<{ imageUrl: string; imageBase64: string }> {
  const { data, error } = await supabase.functions.invoke('imagen-generate', {
    body: req,
  });

  if (error) throw new Error(`Imagen error: ${error.message}`);
  if (data.error) throw new Error(data.error);
  return { imageUrl: data.imageUrl || `data:image/png;base64,${data.imageBase64}`, imageBase64: data.imageBase64 };
}

export async function callVeo(req: VeoRequest): Promise<{ videoUrl: string; status: string }> {
  const { data, error } = await supabase.functions.invoke('veo-generate', {
    body: req,
  });

  if (error) throw new Error(`Veo error: ${error.message}`);
  if (data.error) throw new Error(data.error);
  return { videoUrl: data.videoUrl, status: data.status };
}

export function getImageModel(quality: QualityMode): string {
  const models = getActiveModels(quality);
  return models.image;
}

export function getVideoModel(quality: QualityMode): string {
  const models = getActiveModels(quality);
  return models.video;
}

export function getPlanningModel(quality: QualityMode): string {
  return quality === 'fast' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
}
