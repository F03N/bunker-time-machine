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

interface TtsRequest {
  text: string;
  model?: string;
  voiceName?: string;
  sceneIndex?: number;
  projectName: string;
}

interface TtsResponse {
  audioUrl: string;
  mimeType: string;
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

  // Veo via Google AI Studio is synchronous or returns a video URL
  if (data.videoUrl) {
    return {
      videoUrl: data.videoUrl,
      status: 'complete',
      operationName: data.operationName,
      storagePath: data.storagePath,
    };
  }

  // If polling is needed (long-running operation)
  if (data.operationName && data.status === 'started') {
    const maxPolls = 120;
    const pollInterval = 5000;

    for (let i = 0; i < maxPolls; i++) {
      await new Promise(resolve => setTimeout(resolve, pollInterval));

      const { data: pollData, error: pollError } = await supabase.functions.invoke('veo-generate', {
        body: {
          mode: 'poll',
          operationName: data.operationName,
          projectName: req.projectName,
          pairIndex: req.pairIndex,
        },
      });

      if (pollError) {
        console.warn(`Poll ${i + 1} error:`, pollError.message);
        continue;
      }

      if (pollData?.done) {
        if (pollData.status === 'error') {
          throw new Error(pollData.error || 'Veo generation failed');
        }
        return {
          videoUrl: pollData.videoUrl,
          status: 'complete',
          operationName: data.operationName,
          storagePath: pollData.storagePath,
        };
      }
    }

    throw new Error(`Video generation timed out after 10 minutes.`);
  }

  throw new Error(data.message || 'No video URL returned from Veo');
}

export function getImageModel(quality: QualityMode): string {
  return getActiveModels(quality).image;
}

export function getVideoModel(quality: QualityMode): string {
  return getActiveModels(quality).video;
}

export function getPlanningModel(quality: QualityMode): string {
  return quality === 'fast' ? 'gemini-2.5-flash' : 'gemini-2.5-pro';
}

/**
 * Convert a storage URL or data URL to base64 string.
 */
export async function imageUrlToBase64(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    return url.split(',')[1];
  }

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
