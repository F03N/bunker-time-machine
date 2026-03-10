import { supabase } from '@/integrations/supabase/client';
import type { QualityMode } from '@/types/project';
import { getActiveModels } from '@/types/project';

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

interface ImagenResponse {
  imageUrl: string;
  imageBase64: string;
  storagePath?: string;
}

interface VeoRequest {
  prompt: string;
  model?: string;
  startImageBase64: string;
  endImageBase64?: string;
  pairIndex: number;
  projectName: string;
}

interface VeoResponse {
  videoUrl?: string;
  status: string;
  operationName?: string;
  message?: string;
  storagePath?: string;
}

export async function callGemini({ messages, model, systemPrompt }: GeminiRequest): Promise<string> {
  const { data, error } = await supabase.functions.invoke('gemini-generate', {
    body: { messages, model, systemPrompt },
  });

  if (error) throw new Error(`Gemini error: ${error.message}`);
  if (data?.error) throw new Error(`${data.error}${data.details ? ': ' + data.details : ''}`);
  return data.text;
}

export async function callImagen(req: ImagenRequest): Promise<ImagenResponse> {
  const { data, error } = await supabase.functions.invoke('imagen-generate', {
    body: req,
  });

  if (error) throw new Error(`Imagen error: ${error.message}`);
  if (data?.error) throw new Error(`${data.error}${data.details ? ': ' + data.details : ''}`);

  const imageUrl = data.imageUrl || (data.imageBase64 ? `data:image/png;base64,${data.imageBase64}` : '');
  if (!imageUrl && !data.imageBase64) throw new Error('No image returned from Imagen');

  return {
    imageUrl,
    imageBase64: data.imageBase64,
    storagePath: data.storagePath,
  };
}

export async function callVeo(req: VeoRequest): Promise<VeoResponse> {
  const { data, error } = await supabase.functions.invoke('veo-generate', {
    body: req,
  });

  if (error) throw new Error(`Veo error: ${error.message}`);
  if (data?.error) throw new Error(`${data.error}${data.details ? ': ' + data.details : ''}`);

  if (data.status === 'timeout') {
    throw new Error(`Video generation timed out. Operation: ${data.operationName}. Try again or check Google AI Studio.`);
  }

  return {
    videoUrl: data.videoUrl,
    status: data.status || 'complete',
    operationName: data.operationName,
    message: data.message,
    storagePath: data.storagePath,
  };
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

/**
 * Convert a storage URL or data URL to base64 string.
 * Used for chaining scene images as references.
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    return url.split(',')[1];
  }

  // For storage URLs, fetch through a proxy or re-download
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error('Failed to fetch image');
    const blob = await response.blob();
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    throw new Error('Cannot convert image to base64 for reference chaining');
  }
}
