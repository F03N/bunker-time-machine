import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Textarea } from '@/components/ui/textarea';
import { callGemini, getPlanningModel } from '@/lib/google-ai';
import { MASTER_SYSTEM_PROMPT, getScenePlanPrompt } from '@/lib/prompts';
import { REPAIR_SCENES, ATMOSPHERE_ONLY_SCENES } from '@/types/project';
import { toast } from 'sonner';

export function ScenePlan() {
  const { scenes, setScenes, updateScene, selectedIdeaIndex, ideas, goToNextStep, goToPrevStep, qualityMode } = useProjectStore();
  const [generating, setGenerating] = useState(false);
  const selectedIdea = selectedIdeaIndex !== null ? ideas[selectedIdeaIndex] : null;
  const hasPrompts = scenes.some(s => s.imagePrompt.length > 0);

  const handleGenerate = async () => {
    if (!selectedIdea) return;
    setGenerating(true);
    try {
      const text = await callGemini({
        messages: [{ role: 'user', content: getScenePlanPrompt(selectedIdea.title, selectedIdea.description) }],
        model: getPlanningModel(qualityMode),
        systemPrompt: MASTER_SYSTEM_PROMPT,
      });

      let cleanText = text.trim();
      if (cleanText.startsWith('```')) {
        cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      }
      const parsed = JSON.parse(cleanText);
      const updated = scenes.map((s, i) => ({
        ...s,
        title: parsed[i]?.title || s.title,
        imagePrompt: parsed[i]?.imagePrompt || '',
        motionPrompt: parsed[i]?.motionPrompt || '',
        narration: parsed[i]?.narration || '',
        notes: parsed[i]?.notes || '',
      }));
      setScenes(updated);
      toast.success('Generated 9-scene plan from master prompt');
    } catch (err) {
      console.error('Scene plan generation failed:', err);
      toast.error(`Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
  };

  const handlePromptEdit = (idx: number, field: 'imagePrompt' | 'motionPrompt' | 'narration', value: string) => {
    updateScene(idx, { [field]: value });
  };

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-bold mb-1">Scene Plan</h1>
        <p className="text-sm text-muted-foreground">
          9-scene restoration sequence for: <span className="text-primary font-semibold">{selectedIdea?.title}</span>
        </p>
      </div>

      {!hasPrompts ? (
        <WorkshopCard generating={generating}>
          <div className="text-center py-8">
            <p className="text-muted-foreground mb-4 text-sm">
              {generating ? 'Generating 9 scene prompts via Gemini (following master prompt structure)…' : 'Generate the complete scene plan per the master prompt specification.'}
            </p>
            {!generating && (
              <button
                onClick={handleGenerate}
                className="px-6 py-3 bg-primary text-primary-foreground font-bold rounded-md touch-target"
              >
                Generate Scene Plan
              </button>
            )}
          </div>
        </WorkshopCard>
      ) : (
        <Accordion type="single" collapsible className="flex flex-col gap-2">
          {scenes.map((scene, idx) => {
            const isRepair = REPAIR_SCENES.includes(idx);
            const isAtmosphere = ATMOSPHERE_ONLY_SCENES.includes(idx);
            return (
              <AccordionItem key={idx} value={`scene-${idx}`} className="border-0">
                <WorkshopCard>
                  <AccordionTrigger className="hover:no-underline py-0">
                    <div className="flex items-center gap-3 text-left">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div className="min-w-0">
                        <span className="font-semibold text-sm block">{scene.title}</span>
                        <span className={`text-[10px] ${isRepair ? 'text-primary' : 'text-muted-foreground'}`}>
                          {isAtmosphere ? '🌫️ Atmosphere only' : '🔧 Construction scene'}
                        </span>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-3 space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Image Prompt</label>
                      <Textarea
                        value={scene.imagePrompt}
                        onChange={(e) => handlePromptEdit(idx, 'imagePrompt', e.target.value)}
                        className="text-xs font-mono mt-1 min-h-[80px] bg-secondary border-border"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Animation Prompt</label>
                      <Textarea
                        value={scene.motionPrompt}
                        onChange={(e) => handlePromptEdit(idx, 'motionPrompt', e.target.value)}
                        className="text-xs font-mono mt-1 min-h-[40px] bg-secondary border-border"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Narration</label>
                      <Textarea
                        value={scene.narration}
                        onChange={(e) => handlePromptEdit(idx, 'narration', e.target.value)}
                        className="text-xs font-mono mt-1 min-h-[40px] bg-secondary border-border"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Continuity Notes</label>
                      <p className="text-xs text-muted-foreground mt-1">{scene.notes}</p>
                    </div>
                    {isRepair && scene.workerCues?.length > 0 && (
                      <div className="p-2 rounded bg-primary/10">
                        <p className="text-[10px] font-semibold text-primary mb-1">Required Construction Cues (auto-enforced):</p>
                        {scene.workerCues.map((cue, i) => (
                          <p key={i} className="text-[10px] text-muted-foreground">• {cue}</p>
                        ))}
                      </div>
                    )}
                  </AccordionContent>
                </WorkshopCard>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      <StickyAction
        label="Begin Image Generation"
        onClick={goToNextStep}
        disabled={!hasPrompts}
        secondary={{ label: 'Back', onClick: goToPrevStep }}
      />
    </div>
  );
}
