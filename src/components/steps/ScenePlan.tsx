import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { callGemini, getPlanningModel } from '@/lib/google-ai';
import { MASTER_SYSTEM_PROMPT, getScenePlanPrompt } from '@/lib/prompts';
import { toast } from 'sonner';

export function ScenePlan() {
  const { scenes, setScenes, selectedIdeaIndex, ideas, goToNextStep, goToPrevStep, qualityMode } = useProjectStore();
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
      toast.success('Generated 9-scene plan');
    } catch (err) {
      console.error('Scene plan generation failed:', err);
      toast.error(`Generation failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setGenerating(false);
    }
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
              {generating ? 'Generating 9 scene prompts via Gemini…' : 'Generate the complete scene plan.'}
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
          {scenes.map((scene, idx) => (
            <AccordionItem key={idx} value={`scene-${idx}`} className="border-0">
              <WorkshopCard>
                <AccordionTrigger className="hover:no-underline py-0">
                  <div className="flex items-center gap-3 text-left">
                    <span className="shrink-0 w-7 h-7 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="font-semibold text-sm">{scene.title}</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-3 space-y-3">
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Image Prompt</label>
                    <p className="text-xs font-mono mt-1 text-foreground leading-relaxed">{scene.imagePrompt}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Motion Prompt</label>
                    <p className="text-xs font-mono mt-1 text-primary">{scene.motionPrompt}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Narration</label>
                    <p className="text-xs font-mono mt-1 text-foreground">{scene.narration}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Notes</label>
                    <p className="text-xs text-muted-foreground mt-1">{scene.notes}</p>
                  </div>
                </AccordionContent>
              </WorkshopCard>
            </AccordionItem>
          ))}
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
