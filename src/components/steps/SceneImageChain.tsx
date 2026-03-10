import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import { Button } from '@/components/ui/button';
import { Check, RefreshCw, ArrowRight, ImageIcon } from 'lucide-react';

export function SceneImageChain() {
  const { scenes, updateScene, goToNextStep, goToPrevStep } = useProjectStore();
  const [activeScene, setActiveScene] = useState(0);

  const handleGenerate = (idx: number) => {
    updateScene(idx, { generating: true });
    // Simulate image generation
    setTimeout(() => {
      updateScene(idx, {
        generating: false,
        generatedImageUrl: `https://placehold.co/720x1280/1C1C1E/FFC700?text=Scene+${idx + 1}%0A${encodeURIComponent(scenes[idx].title)}`,
      });
    }, 2000);
  };

  const handleApprove = (idx: number) => {
    updateScene(idx, { approved: true });
    if (idx < 8) setActiveScene(idx + 1);
  };

  const allApproved = scenes.every(s => s.approved);
  const currentScene = scenes[activeScene];
  const prevScene = activeScene > 0 ? scenes[activeScene - 1] : null;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-bold mb-1">Scene Image Chain</h1>
        <p className="text-sm text-muted-foreground">Generate images sequentially. Each uses the previous as reference.</p>
      </div>

      {/* Scene selector strip */}
      <div className="flex gap-1.5 overflow-x-auto px-1 py-1 scrollbar-none">
        {scenes.map((s, i) => (
          <button
            key={i}
            onClick={() => setActiveScene(i)}
            className={`
              shrink-0 w-9 h-9 rounded-md flex items-center justify-center text-xs font-bold transition-all
              ${i === activeScene ? 'bg-primary text-primary-foreground' : ''}
              ${s.approved ? 'bg-step-complete/20 text-step-complete border border-step-complete/30' : ''}
              ${!s.approved && i !== activeScene ? 'bg-secondary text-muted-foreground' : ''}
              ${s.generating ? 'generation-pulse' : ''}
            `}
          >
            {s.approved ? <Check className="w-4 h-4" /> : i + 1}
          </button>
        ))}
      </div>

      {/* Reference indicator */}
      {prevScene && (
        <WorkshopCard className="border-primary/20 bg-primary/5">
          <div className="flex items-center gap-2 text-xs">
            <ImageIcon className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground">Reference:</span>
            <span className="text-foreground font-semibold">Scene {activeScene} — {prevScene.title}</span>
            {prevScene.approved && <Check className="w-3 h-3 text-step-complete ml-auto" />}
          </div>
          {prevScene.generatedImageUrl && (
            <img
              src={prevScene.generatedImageUrl}
              alt={`Scene ${activeScene} reference`}
              className="w-full mt-2 rounded-md aspect-[9/16] object-cover opacity-60"
              style={{ maxHeight: '120px', objectPosition: 'top' }}
            />
          )}
        </WorkshopCard>
      )}

      {/* Active scene */}
      <WorkshopCard generating={currentScene.generating}>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="font-bold text-base">Scene {activeScene + 1}</h2>
            <p className="text-xs text-primary">{currentScene.title}</p>
          </div>
          {currentScene.approved && (
            <span className="flex items-center gap-1 text-xs text-step-complete font-semibold">
              <Check className="w-4 h-4" /> Approved
            </span>
          )}
        </div>

        {currentScene.generatedImageUrl ? (
          <div className="relative">
            <img
              src={currentScene.generatedImageUrl}
              alt={`Scene ${activeScene + 1}`}
              className="w-full rounded-md aspect-[9/16] object-cover"
            />
            <div className="flex gap-2 mt-3">
              {!currentScene.approved && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerate(activeScene)}
                    className="flex-1 touch-target"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApprove(activeScene)}
                    className="flex-1 touch-target"
                  >
                    <Check className="w-4 h-4 mr-1" /> Approve Scene {activeScene + 1}
                  </Button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center py-8">
            <div className="w-full aspect-[9/16] bg-secondary rounded-md flex items-center justify-center mb-4">
              <ImageIcon className="w-12 h-12 text-muted-foreground/30" />
            </div>
            <Button
              onClick={() => handleGenerate(activeScene)}
              disabled={currentScene.generating || (activeScene > 0 && !prevScene?.approved)}
              className="touch-target"
            >
              {currentScene.generating ? 'Generating…' : `Generate Scene ${activeScene + 1}`}
            </Button>
            {activeScene > 0 && !prevScene?.approved && (
              <p className="text-xs text-destructive mt-2">Approve Scene {activeScene} first</p>
            )}
          </div>
        )}

        {/* Prompt info collapsed */}
        <details className="mt-3">
          <summary className="text-xs text-muted-foreground cursor-pointer">View prompt details</summary>
          <div className="mt-2 space-y-2">
            <p className="text-xs font-mono text-foreground">{currentScene.imagePrompt}</p>
            <p className="text-xs font-mono text-primary">{currentScene.motionPrompt}</p>
          </div>
        </details>
      </WorkshopCard>

      <StickyAction
        label="Continue to Continuity Review"
        onClick={goToNextStep}
        disabled={!allApproved}
        secondary={{ label: 'Back', onClick: goToPrevStep }}
      />
    </div>
  );
}
