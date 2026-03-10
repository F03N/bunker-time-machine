import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function AudioVoiceover() {
  const { scenes, audio, setAudio, goToNextStep, goToPrevStep } = useProjectStore();
  const [generating, setGenerating] = useState(false);
  const hasScript = audio.fullScript.length > 0;

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      setAudio({
        fullScript: scenes.map((s, i) => `[Scene ${i + 1}: ${s.title}]\n${s.narration}`).join('\n\n'),
        sceneNarrations: scenes.map(s => s.narration),
        ambienceNotes: scenes.map((_, i) => i < 4 ? 'Wind, distant birds, crunching gravel' : i < 8 ? 'Echo, dripping water, power tools' : 'Warm ambient hum, soft music'),
        sfxNotes: scenes.map((_, i) => i === 0 ? 'Creaking metal door' : i < 4 ? 'Hammer strikes, concrete mixing' : i < 8 ? 'Welding sparks, drill sounds' : 'Light switch click, appliance hum'),
        ttsReady: true,
      });
      setGenerating(false);
    }, 1500);
  };

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-bold mb-1">Audio / Voiceover</h1>
        <p className="text-sm text-muted-foreground">Generate narration script, ambience notes, and SFX cues.</p>
      </div>

      {!hasScript ? (
        <WorkshopCard generating={generating}>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4 text-sm">
              {generating ? 'Generating voiceover script…' : 'Generate full audio plan for all 9 scenes.'}
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
