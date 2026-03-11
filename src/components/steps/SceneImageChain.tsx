import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import { Button } from '@/components/ui/button';
import { Check, RefreshCw, ImageIcon, AlertTriangle } from 'lucide-react';
import { callImagen, getImageModel, imageUrlToBase64 } from '@/lib/google-ai';
import { getWorkerPromptInstruction } from '@/types/project';
import { getStructuralAnchor } from '@/lib/prompts';
import { toast } from 'sonner';

export function SceneImageChain() {
  const { scenes, updateScene, goToNextStep, goToPrevStep, qualityMode, name, selectedIdeaIndex, ideas } = useProjectStore();
  const [activeScene, setActiveScene] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sceneBase64, setSceneBase64] = useState<Record<number, string>>({});

  const ideaTitle = selectedIdeaIndex !== null && ideas[selectedIdeaIndex]
    ? ideas[selectedIdeaIndex].title
    : name;

  const handleGenerate = async (idx: number) => {
    setErrorMsg(null);
    updateScene(idx, { generating: true });

    try {
      let referenceImageBase64: string | undefined;

      if (idx > 0) {
        const prevScene = scenes[idx - 1];
        if (!prevScene.approved || !prevScene.generatedImageUrl) {
          throw new Error(`Scene ${idx} must be approved first`);
        }
        if (sceneBase64[idx - 1]) {
          referenceImageBase64 = sceneBase64[idx - 1];
        } else if (prevScene.generatedImageUrl) {
          referenceImageBase64 = await imageUrlToBase64(prevScene.generatedImageUrl);
        }
      }

      // Build the full prompt: base + worker cues + structural anchor
      const workerInstruction = getWorkerPromptInstruction(idx);
      const structuralAnchor = getStructuralAnchor(idx, ideaTitle);
      
      let fullPrompt = scenes[idx].imagePrompt;
      if (workerInstruction) {
        fullPrompt += `\n\n${workerInstruction}`;
      }
      fullPrompt += structuralAnchor;

      const result = await callImagen({
        prompt: fullPrompt,
        model: getImageModel(qualityMode),
        referenceImageBase64,
        sceneIndex: idx,
        projectName: name.replace(/\s+/g, '_') || 'project',
      });

      if (result.imageBase64) {
        setSceneBase64(prev => ({ ...prev, [idx]: result.imageBase64 }));
      }

      updateScene(idx, {
        generating: false,
        generatedImageUrl: result.imageUrl,
      });

      toast.success(`Scene ${idx + 1} generated via Imagen`);
    } catch (err) {
      console.error(`Scene ${idx + 1} generation failed:`, err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setErrorMsg(msg);
      updateScene(idx, { generating: false });
      toast.error(`Scene ${idx + 1} failed: ${msg}`);
    }
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
        <p className="text-sm text-muted-foreground">Generate images via Imagen. Each uses the previous as structural reference.</p>
      </div>

      {/* Scene selector strip */}
      <div className="flex gap-1.5 overflow-x-auto px-1 py-1 scrollbar-none">
        {scenes.map((s, i) => (
          <button
            key={i}
            onClick={() => { setActiveScene(i); setErrorMsg(null); }}
            className={`
              shrink-0 w-9 h-9 rounded-md flex items-center justify-center text-xs font-bold transition-all
              ${i === activeScene ? 'bg-primary text-primary-foreground' : ''}
              ${s.approved && i !== activeScene ? 'bg-step-complete/20 text-step-complete border border-step-complete/30' : ''}
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
            {sceneBase64[activeScene - 1] && (
              <span className="text-[10px] text-step-complete font-mono">base64 ✓</span>
            )}
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

      {/* Error display */}
      {errorMsg && (
        <WorkshopCard className="border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-destructive">Generation Failed</p>
              <p className="text-xs text-destructive/80 font-mono mt-1">{errorMsg}</p>
            </div>
          </div>
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
                    disabled={currentScene.generating}
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
              {currentScene.generating ? 'Generating via Imagen…' : `Generate Scene ${activeScene + 1}`}
            </Button>
            {activeScene > 0 && !prevScene?.approved && (
              <p className="text-xs text-destructive mt-2">Approve Scene {activeScene} first</p>
            )}
          </div>
        )}

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
