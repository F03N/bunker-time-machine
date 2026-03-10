import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import { SCENE_TITLES } from '@/types/project';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export function ScenePlan() {
  const { scenes, setScenes, selectedIdeaIndex, ideas, goToNextStep, goToPrevStep } = useProjectStore();
  const [generating, setGenerating] = useState(false);
  const selectedIdea = selectedIdeaIndex !== null ? ideas[selectedIdeaIndex] : null;
  const hasPrompts = scenes.some(s => s.imagePrompt.length > 0);

  const handleGenerate = () => {
    setGenerating(true);
    setTimeout(() => {
      const generated = scenes.map((s, i) => ({
        ...s,
        imagePrompt: `Photorealistic view of ${selectedIdea?.title || 'bunker'}. Scene ${i + 1}: ${SCENE_TITLES[i]}. ${selectedIdea?.description || ''}. Highly detailed architectural photography, 9:16 vertical composition, natural lighting, construction timelapse style. ${i === 0 ? 'Abandoned, deteriorated state.' : i < 4 ? 'Exterior restoration in progress with workers and equipment visible.' : i < 8 ? 'Interior renovation with tools, dust, and construction materials.' : 'Fully restored, magazine-quality interior design reveal.'}`,
        motionPrompt: [
          'Slow pan across deteriorated exterior, dust particles in air',
          'Camera slowly approaches entrance, slight wind movement',
          'Workers begin exterior repairs, subtle tool movements',
          'Near-complete exterior, fresh materials settling',
          'Camera enters through doorway, light shift from exterior to interior',
          'Interior work underway, sparks from welding, dust in light beams',
          'Final interior touches, smooth surfaces, clean lines appearing',
          'Design elements placed, warm lighting activating',
          'Full reveal, camera slowly pans finished space, golden hour light',
        ][i],
        narration: `Scene ${i + 1}: ${SCENE_TITLES[i]}. ${['We discover this forgotten structure in its raw state.', 'Our team arrives on site, assessing the scope of work ahead.', 'Exterior restoration begins — concrete repair and structural reinforcement.', 'The exterior transformation nears completion.', 'We cross the threshold into the underground space.', 'Interior demolition and reconstruction is underway.', 'Fine finishing work transforms raw surfaces into livable space.', 'The interior design vision comes to life.', 'The final reveal — from ruin to refuge.'][i]}`,
        notes: `Maintain exact camera position. ${i > 0 ? 'Use previous scene image as structural reference.' : 'Establish primary camera angle and framing.'} ${i >= 2 && i <= 7 ? 'Workers/tools must be visible for any structural change.' : ''}`,
      }));
      setScenes(generated);
      setGenerating(false);
    }, 2000);
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
              {generating ? 'Generating 9 scene prompts and narration…' : 'Generate the complete scene plan.'}
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
