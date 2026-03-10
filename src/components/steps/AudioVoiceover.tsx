import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { callGemini, getPlanningModel } from '@/lib/google-ai';
import { MASTER_SYSTEM_PROMPT, getAudioPlanPrompt } from '@/lib/prompts';
import { toast } from 'sonner';

export function AudioVoiceover() {
  const { scenes, audio, setAudio, goToNextStep, goToPrevStep, qualityMode } = useProjectStore();
  const [generating, setGenerating] = useState(false);
  const hasScript = audio.fullScript.length > 0;

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const text = await callGemini({
        messages: [{ role: 'user', content: getAudioPlanPrompt(scenes.map(s => ({ title: s.title, narration: s.narration }))) }],
        model: getPlanningModel(qualityMode),
        systemPrompt: MASTER_SYSTEM_PROMPT,
      });

      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const parsed = JSON.parse(cleanText);
      setAudio({
        fullScript: parsed.fullScript || '',
        sceneNarrations: parsed.sceneNarrations || [],
        ambienceNotes: parsed.ambienceNotes || [],
        sfxNotes: parsed.sfxNotes || [],
        ttsReady: true,
      });
      toast.success('Generated audio plan');
    } catch (err) {
      console.error('Audio generation failed:', err);
      toast.error(`Failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-bold mb-1">Audio / Voiceover</h1>
        <p className="text-sm text-muted-foreground">Generate narration script, ambience notes, and SFX cues via Gemini.</p>
      </div>

      {!hasScript ? (
        <WorkshopCard generating={generating}>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4 text-sm">
              {generating ? 'Generating voiceover script via Gemini…' : 'Generate full audio plan for all 9 scenes.'}
            </p>
            {!generating && (
              <button
                onClick={handleGenerate}
                className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-md touch-target"
              >
                Generate Audio Plan
              </button>
            )}
          </div>
        </WorkshopCard>
      ) : (
        <>
          <WorkshopCard>
            <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide mb-2 block">Full Script</label>
            <pre className="text-xs font-mono text-foreground whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
              {audio.fullScript}
            </pre>
          </WorkshopCard>

          <Accordion type="single" collapsible className="flex flex-col gap-2">
            {scenes.map((scene, idx) => (
              <AccordionItem key={idx} value={`audio-${idx}`} className="border-0">
                <WorkshopCard>
                  <AccordionTrigger className="hover:no-underline py-0">
                    <div className="flex items-center gap-3 text-left">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-semibold text-sm">{scene.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-3 space-y-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold uppercase">Narration</label>
                      <p className="text-xs font-mono mt-0.5">{audio.sceneNarrations[idx]}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold uppercase">Ambience</label>
                      <p className="text-xs font-mono mt-0.5 text-muted-foreground">{audio.ambienceNotes[idx]}</p>
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground font-semibold uppercase">SFX</label>
                      <p className="text-xs font-mono mt-0.5 text-muted-foreground">{audio.sfxNotes[idx]}</p>
                    </div>
                  </AccordionContent>
                </WorkshopCard>
              </AccordionItem>
            ))}
          </Accordion>

          {audio.ttsReady && (
            <WorkshopCard>
              <p className="text-xs text-step-complete font-semibold">✓ Script is TTS-ready for export.</p>
            </WorkshopCard>
          )}
        </>
      )}

      <StickyAction
        label="Continue to Export"
        onClick={goToNextStep}
        disabled={!hasScript}
        secondary={{ label: 'Back', onClick: goToPrevStep }}
      />
    </div>
  );
}
