import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, RefreshCw, X, Loader2, Eye } from 'lucide-react';
import { callGemini, callImagen, getImageModel, getPlanningModel, imageUrlToBase64 } from '@/lib/google-ai';
import { getContinuityReviewPrompt } from '@/lib/prompts';
import { validateRepairLogic, REPAIR_SCENES, ATMOSPHERE_ONLY_SCENES } from '@/types/project';
import type { ContinuityFlag } from '@/types/project';
import { toast } from 'sonner';

export function ContinuityReview() {
  const { scenes, updateScene, continuityFlags, setContinuityFlags, goToNextStep, goToPrevStep, qualityMode, name } = useProjectStore();
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [regenerating, setRegenerating] = useState<number | null>(null);

  const handleRunCheck = async () => {
    setChecking(true);
    const flags: ContinuityFlag[] = [];

    try {
      // 1. Local logic checks: worker-based repair validation
      for (let i = 0; i < 8; i++) {
        const motionPrompt = scenes[i + 1]?.motionPrompt || '';
        const flag = validateRepairLogic(i, i + 1, motionPrompt);
        if (flag) flags.push(flag);
      }

      // 2. Check for missing images
      scenes.forEach((scene, idx) => {
        if (!scene.generatedImageUrl) {
          flags.push({
            sceneIndex: idx,
            type: 'identity',
            message: `Scene ${idx + 1} has no generated image — cannot verify continuity.`,
            severity: 'error',
          });
        }
      });

      // 3. Check repair scenes have worker/tool cues in prompts
      REPAIR_SCENES.forEach(idx => {
        const scene = scenes[idx];
        if (!scene) return;
        const hasWorkerRef = /scaffold|tool|equipment|welding|construction|machinery|cable|debris|paint|mount|drill|hammer|generator|light.?set|material/i.test(scene.imagePrompt);
        if (!hasWorkerRef) {
          flags.push({
            sceneIndex: idx,
            type: 'worker-logic',
            message: `Scene ${idx + 1} (${scene.title}): Construction scene but no tool/equipment evidence in prompt. Structural changes require visible construction cues.`,
            severity: 'warning',
          });
        }
      });

      // 4. Check atmosphere scenes don't have repair language
      ATMOSPHERE_ONLY_SCENES.forEach(idx => {
        const scene = scenes[idx];
        if (!scene) return;
        const hasRepairRef = /repair|fix|restore|construct|build|install|weld|scaffold/i.test(scene.imagePrompt);
        if (hasRepairRef) {
          flags.push({
            sceneIndex: idx,
            type: 'worker-logic',
            message: `Scene ${idx + 1} (${scene.title}): Atmosphere-only scene contains construction language. Only environmental state allowed (dust, decay, light, or pristine completion).`,
            severity: 'warning',
          });
        }
      });

      // 5. AI-based continuity check if images are available
      const scenesWithImages = scenes.filter(s => s.generatedImageUrl);
      if (scenesWithImages.length >= 2) {
        try {
          const sceneDescriptions = scenes.map((s, i) => 
            `Scene ${i + 1} (${s.title}): ${s.generatedImageUrl ? 'Has image' : 'No image'} | Type: ${REPAIR_SCENES.includes(i) ? 'Construction' : 'Atmosphere'} | Prompt: ${s.imagePrompt.substring(0, 150)}...`
          ).join('\n');

          const result = await callGemini({
            messages: [{ 
              role: 'user', 
              content: `${getContinuityReviewPrompt()}\n\nScene descriptions for analysis:\n${sceneDescriptions}` 
            }],
            model: getPlanningModel(qualityMode),
          });

          let cleanText = result.trim();
          if (cleanText.startsWith('```')) {
            cleanText = cleanText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
          }
          
          const aiFlags: ContinuityFlag[] = JSON.parse(cleanText);
          flags.push(...aiFlags);
        } catch (aiErr) {
          console.warn('AI continuity check failed, using local checks only:', aiErr);
          toast.info('AI analysis unavailable — using local validation only.');
        }
      }

      setContinuityFlags(flags);
      setChecked(true);
      
      if (flags.length === 0) {
        toast.success('All scenes pass continuity check');
      } else {
        const errors = flags.filter(f => f.severity === 'error').length;
        const warnings = flags.filter(f => f.severity === 'warning').length;
        toast.warning(`Found ${errors} errors and ${warnings} warnings`);
      }
    } catch (err) {
      console.error('Continuity check failed:', err);
      toast.error(`Check failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setChecking(false);
    }
  };

  const handleRegenerate = async (idx: number) => {
    setRegenerating(idx);
    try {
      let referenceImageBase64: string | undefined;

      // Chain from previous scene if available
      if (idx > 0 && scenes[idx - 1].generatedImageUrl) {
        referenceImageBase64 = await imageUrlToBase64(scenes[idx - 1].generatedImageUrl!);
      }

      const result = await callImagen({
        prompt: scenes[idx].imagePrompt,
        model: getImageModel(qualityMode),
        referenceImageBase64,
        sceneIndex: idx,
        projectName: name.replace(/\s+/g, '_') || 'project',
      });

      updateScene(idx, {
        generatedImageUrl: result.imageUrl,
        approved: false, // Reset approval after regeneration
      });

      // Remove flags for this scene
      const updatedFlags = continuityFlags.filter(f => f.sceneIndex !== idx);
      setContinuityFlags(updatedFlags);

      toast.success(`Scene ${idx + 1} regenerated`);
    } catch (err) {
      console.error(`Scene ${idx + 1} regeneration failed:`, err);
      toast.error(`Regeneration failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setRegenerating(null);
    }
  };

  const hasErrors = continuityFlags.some(f => f.severity === 'error' && f.type !== 'identity'); // Allow proceeding if only missing images
  const sceneFlags = (idx: number) => continuityFlags.filter(f => f.sceneIndex === idx);

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-bold mb-1">Continuity Review</h1>
        <p className="text-sm text-muted-foreground">Review all 9 scenes for drift, worker logic, and visual consistency.</p>
      </div>

      {/* Scene type legend */}
      <div className="flex gap-3 px-1 text-[10px]">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-primary" /> Construction Scene (tools required)
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground" /> Atmosphere Only
        </span>
      </div>

      {/* 3x3 Grid */}
      <div className="grid grid-cols-3 gap-2">
        {scenes.map((scene, idx) => {
          const flags = sceneFlags(idx);
          const hasError = flags.some(f => f.severity === 'error');
          const hasWarning = flags.some(f => f.severity === 'warning');
          const isRepair = REPAIR_SCENES.includes(idx);
          const isRegenerating = regenerating === idx;
          
          return (
            <button
              key={idx}
              onClick={() => setSelectedScene(selectedScene === idx ? null : idx)}
              className={`
                relative aspect-[9/16] rounded-md overflow-hidden border-2 transition-all
                ${selectedScene === idx ? 'border-primary ring-2 ring-primary/30' : 'border-border'}
                ${hasError ? 'border-destructive' : ''}
                ${hasWarning && !hasError ? 'border-yellow-600' : ''}
                ${isRegenerating ? 'generation-pulse' : ''}
              `}
            >
              {scene.generatedImageUrl ? (
                <img src={scene.generatedImageUrl} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-secondary flex items-center justify-center">
                  <span className="text-xs text-muted-foreground">{idx + 1}</span>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-background/80 px-1 py-0.5">
                <div className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${isRepair ? 'bg-primary' : 'bg-muted-foreground'}`} />
                  <span className="text-[10px] font-semibold truncate">{idx + 1}. {scene.title.split('(')[0].trim()}</span>
                </div>
              </div>
              {flags.length > 0 && (
                <div className="absolute top-1 right-1">
                  <AlertTriangle className={`w-4 h-4 ${hasError ? 'text-destructive' : 'text-yellow-500'}`} />
                </div>
              )}
              {checked && flags.length === 0 && scene.generatedImageUrl && (
                <div className="absolute top-1 right-1">
                  <Check className="w-4 h-4 text-step-complete" />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected scene detail */}
      {selectedScene !== null && (
        <WorkshopCard>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-sm">Scene {selectedScene + 1}: {scenes[selectedScene].title}</h3>
              <span className={`text-[10px] font-semibold ${REPAIR_SCENES.includes(selectedScene) ? 'text-primary' : 'text-muted-foreground'}`}>
                {REPAIR_SCENES.includes(selectedScene) ? '🔧 Construction Scene — Tools/Equipment Required' : '🌫️ Atmosphere Only — No Construction'}
              </span>
            </div>
            <button onClick={() => setSelectedScene(null)}>
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>
          
          {scenes[selectedScene].generatedImageUrl && (
            <img
              src={scenes[selectedScene].generatedImageUrl}
              alt={`Scene ${selectedScene + 1} full`}
              className="w-full rounded-md aspect-[9/16] object-cover mb-3"
            />
          )}

          {/* Worker cues for repair scenes */}
          {REPAIR_SCENES.includes(selectedScene) && scenes[selectedScene].workerCues?.length > 0 && (
            <div className="mb-2 p-2 rounded bg-primary/10">
              <p className="text-[10px] font-semibold text-primary mb-1">Required Construction Cues:</p>
              {scenes[selectedScene].workerCues.map((cue, i) => (
                <p key={i} className="text-[10px] text-muted-foreground">• {cue}</p>
              ))}
            </div>
          )}

          {/* Flags for this scene */}
          {sceneFlags(selectedScene).map((flag, i) => (
            <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded mb-1 ${flag.severity === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-yellow-600/10 text-yellow-500'}`}>
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <div>
                <span className="font-semibold">[{flag.type}]</span> {flag.message}
              </div>
            </div>
          ))}

          {checked && sceneFlags(selectedScene).length === 0 && scenes[selectedScene].generatedImageUrl && (
            <div className="flex items-center gap-2 text-xs text-step-complete p-2">
              <Check className="w-3 h-3" />
              <span>Scene passes all checks</span>
            </div>
          )}

          <Button
            variant="outline"
            size="sm"
            className="w-full mt-2 touch-target"
            onClick={() => handleRegenerate(selectedScene)}
            disabled={regenerating !== null}
          >
            {regenerating === selectedScene ? (
              <span className="flex items-center gap-1">
                <Loader2 className="w-4 h-4 animate-spin" /> Regenerating…
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <RefreshCw className="w-4 h-4" /> Regenerate Scene {selectedScene + 1}
              </span>
            )}
          </Button>
        </WorkshopCard>
      )}

      {/* Check button */}
      <WorkshopCard generating={checking}>
        {!checked ? (
          <button
            onClick={handleRunCheck}
            disabled={checking}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-md touch-target flex items-center justify-center gap-2"
          >
            {checking ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Running Continuity Check…
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                Run Continuity Check
              </>
            )}
          </button>
        ) : continuityFlags.length === 0 ? (
          <div className="flex items-center gap-2 text-step-complete text-sm">
            <Check className="w-5 h-5" />
            <span className="font-semibold">All scenes pass continuity check.</span>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold">
                {continuityFlags.filter(f => f.severity === 'error').length} errors, {continuityFlags.filter(f => f.severity === 'warning').length} warnings
              </p>
              <Button variant="outline" size="sm" onClick={() => { setChecked(false); setContinuityFlags([]); }}>
                Re-check
              </Button>
            </div>
          </div>
        )}
      </WorkshopCard>

      <StickyAction
        label="Begin Transition Generation"
        onClick={goToNextStep}
        disabled={!checked || hasErrors}
        secondary={{ label: 'Back', onClick: goToPrevStep }}
      />
    </div>
  );
}
