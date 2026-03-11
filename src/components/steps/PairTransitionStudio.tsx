import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import { Button } from '@/components/ui/button';
import { DEFAULT_MOTION_SETTINGS, REPAIR_SCENES, SCENE_WORKER_PRESENCE } from '@/types/project';
import type { TransitionPair, SpeedMultiplier, MotionPreset } from '@/types/project';
import { Check, Play, RefreshCw, AlertTriangle, Loader2, Info } from 'lucide-react';
import { callVeo, getVideoModel, imageUrlToBase64 } from '@/lib/google-ai';
import { buildStrictTransitionPrompt } from '@/lib/prompts';
import { toast } from 'sonner';

const MOTION_PRESETS: { value: MotionPreset; label: string; desc: string }[] = [
  { value: 'strict-frame-match', label: 'Strict Frame Match', desc: 'Maximum fidelity to start+end images' },
  { value: 'minimal-motion', label: 'Minimal Motion', desc: 'Near-static, subtle changes only' },
  { value: 'soft-construction', label: 'Soft Construction', desc: 'Gentle construction progress' },
  { value: 'controlled-interior', label: 'Controlled Interior', desc: 'Interior-safe transitions' },
  { value: 'final-reveal-polish', label: 'Final Reveal Polish', desc: 'Clean reveal moment' },
];

const SPEEDS: SpeedMultiplier[] = [1, 2, 3, 4];

export function PairTransitionStudio() {
  const { scenes, transitions, setTransitions, updateTransition, goToNextStep, goToPrevStep, qualityMode, name } = useProjectStore();
  const [activePair, setActivePair] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (transitions.length === 0) {
      const pairs: TransitionPair[] = Array.from({ length: 8 }, (_, i) => ({
        index: i,
        startSceneIndex: i,
        endSceneIndex: i + 1,
        motionPrompt: scenes[i]?.motionPrompt || '',
        motionPreset: 'strict-frame-match' as MotionPreset,
        speedMultiplier: 1 as SpeedMultiplier,
        frameMode: 'start-end' as const,
        approved: false,
        generating: false,
        motionSettings: { ...DEFAULT_MOTION_SETTINGS[1] },
      }));
      setTransitions(pairs);
    }
  }, []);

  const pair = transitions[activePair];
  if (!pair) return null;

  const startScene = scenes[pair.startSceneIndex];
  const endScene = scenes[pair.endSceneIndex];
  const endIsRepairScene = REPAIR_SCENES.includes(pair.endSceneIndex);

  const handleGenerate = async () => {
    setErrorMsg(null);
    updateTransition(activePair, { generating: true });

    try {
      if (!startScene?.generatedImageUrl) {
        throw new Error(`Scene ${pair.startSceneIndex + 1} has no generated image`);
      }
      if (!endScene?.generatedImageUrl) {
        throw new Error(`Scene ${pair.endSceneIndex + 1} has no generated image`);
      }

      const startImageBase64 = await imageUrlToBase64(startScene.generatedImageUrl);
      const endImageBase64 = await imageUrlToBase64(endScene.generatedImageUrl);

      // Build strict prompt — scene-aware worker logic
      const strictPrompt = buildStrictTransitionPrompt(
        pair.motionPrompt,
        pair.motionSettings,
        startScene.title,
        endScene.title,
        endIsRepairScene,
        pair.endSceneIndex
      );

      toast.info(`Generating transition ${activePair + 1}→${activePair + 2} via Veo. This may take 2-10 minutes…`);

      const result = await callVeo({
        prompt: strictPrompt,
        model: getVideoModel(qualityMode),
        startImageBase64,
        endImageBase64,
        pairIndex: activePair,
        projectName: name.replace(/\s+/g, '_') || 'project',
      });

      if (result.videoUrl) {
        updateTransition(activePair, {
          generating: false,
          generatedVideoUrl: result.videoUrl,
        });
        toast.success(`Transition ${activePair + 1}→${activePair + 2} complete`);
      } else {
        throw new Error(result.message || 'No video URL returned');
      }
    } catch (err) {
      console.error('Transition generation failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const isRateLimit = msg.includes('429') || msg.includes('RATE_LIMITED') || msg.includes('quota');
      setErrorMsg(isRateLimit
        ? 'API quota exceeded. Wait a few minutes and try again.'
        : msg);
      updateTransition(activePair, { generating: false });
      toast.error(isRateLimit
        ? 'API quota exceeded — try again in a few minutes'
        : `Transition failed: ${msg}`);
    }
  };

  const handleApprove = () => {
    updateTransition(activePair, { approved: true });
    if (activePair < 7) {
      setActivePair(activePair + 1);
      setErrorMsg(null);
    }
  };

  const handleSpeedChange = (speed: SpeedMultiplier) => {
    updateTransition(activePair, {
      speedMultiplier: speed,
      motionSettings: { ...DEFAULT_MOTION_SETTINGS[speed] },
    });
  };

  const allApproved = transitions.length === 8 && transitions.every(t => t.approved);

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-bold mb-1">Pair Transition Studio</h1>
        <p className="text-sm text-muted-foreground">Image A → Image B. Strict pair transitions via Google Veo.</p>
      </div>

      {/* Pair selector */}
      <div className="flex gap-1.5 overflow-x-auto px-1 py-1 scrollbar-none">
        {transitions.map((t, i) => (
          <button
            key={i}
            onClick={() => { setActivePair(i); setErrorMsg(null); }}
            className={`
              shrink-0 px-3 h-9 rounded-md flex items-center justify-center text-xs font-bold transition-all
              ${i === activePair ? 'bg-primary text-primary-foreground' : ''}
              ${t.approved && i !== activePair ? 'bg-step-complete/20 text-step-complete border border-step-complete/30' : ''}
              ${!t.approved && i !== activePair ? 'bg-secondary text-muted-foreground' : ''}
              ${t.generating ? 'generation-pulse' : ''}
            `}
          >
            {t.approved ? <Check className="w-3 h-3 mr-1" /> : null}
            {i + 1}→{i + 2}
          </button>
        ))}
      </div>

      {/* Error display */}
      {errorMsg && (
        <WorkshopCard className="border-destructive/40 bg-destructive/5">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-destructive">Generation Failed</p>
              <p className="text-xs text-destructive/80 font-mono mt-1 break-all">{errorMsg}</p>
            </div>
          </div>
        </WorkshopCard>
      )}

      {/* Split view: Start + End frames */}
      <div className="flex flex-col">
        <WorkshopCard className="rounded-b-none border-b-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Start Frame (Image A)</span>
            <span className="text-xs font-semibold">Scene {pair.startSceneIndex + 1}</span>
          </div>
          {startScene?.generatedImageUrl ? (
            <img src={startScene.generatedImageUrl} alt="Start" className="w-full rounded-md aspect-[9/16] object-cover" style={{ maxHeight: '160px', objectPosition: 'top' }} />
          ) : (
            <div className="w-full aspect-[9/16] bg-secondary rounded-md flex items-center justify-center text-xs text-destructive" style={{ maxHeight: '160px' }}>No image</div>
          )}
        </WorkshopCard>

        {/* Motion Divider */}
        <div className={`relative border-x border-border bg-card px-4 py-3 ${pair.generating ? 'generation-pulse' : ''}`}>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[2px] bg-primary/60" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest">
              {pair.generating ? <Loader2 className="w-4 h-4 animate-spin inline mr-1" /> : null}
              MOTION
            </span>
            <div className="flex-1 h-[2px] bg-primary/60" />
          </div>

          {/* Worker logic indicator */}
          <div className={`mt-2 p-1.5 rounded text-[10px] ${endIsRepairScene ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
            {SCENE_WORKER_PRESENCE[pair.endSceneIndex]
              ? `${SCENE_WORKER_PRESENCE[pair.endSceneIndex].level === 'required' ? '👷' : SCENE_WORKER_PRESENCE[pair.endSceneIndex].level === 'optional' ? '🔧' : '🌫️'} ${SCENE_WORKER_PRESENCE[pair.endSceneIndex].description}`
              : endIsRepairScene ? '🔧 Repair transition — tool/equipment evidence required' : '🌫️ Atmosphere transition — no structural changes'}
          </div>

          <details className="mt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer">Motion settings</summary>
            <div className="mt-2 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Motion Prompt (pair-specific)</label>
                <p className="text-xs font-mono text-primary mt-0.5">{pair.motionPrompt}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Preset</label>
                <div className="flex flex-wrap gap-1">
                  {MOTION_PRESETS.map(p => (
                    <button
                      key={p.value}
                      onClick={() => updateTransition(activePair, { motionPreset: p.value })}
                      className={`px-2 py-1 rounded text-[10px] font-semibold ${pair.motionPreset === p.value ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                      title={p.desc}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Speed</label>
                <div className="flex gap-2">
                  {SPEEDS.map(s => (
                    <button
                      key={s}
                      onClick={() => handleSpeedChange(s)}
                      className={`px-3 py-1.5 rounded text-xs font-bold ${pair.speedMultiplier === s ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
                    >
                      x{s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                <div>motion: {pair.motionSettings.motionStrength}</div>
                <div>camera: {pair.motionSettings.cameraIntensity}</div>
                <div>realism: {pair.motionSettings.realismPriority}</div>
                <div>morph sup: {pair.motionSettings.morphSuppression}</div>
                <div>target: {pair.motionSettings.targetStrictness}</div>
                <div>continuity: {pair.motionSettings.continuityStrictness}</div>
              </div>
            </div>
          </details>
        </div>

        {/* End Image */}
        <WorkshopCard className="rounded-t-none border-t-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">End Frame (Image B)</span>
            <span className="text-xs font-semibold">Scene {pair.endSceneIndex + 1}</span>
          </div>
          {endScene?.generatedImageUrl ? (
            <img src={endScene.generatedImageUrl} alt="End" className="w-full rounded-md aspect-[9/16] object-cover" style={{ maxHeight: '160px', objectPosition: 'top' }} />
          ) : (
            <div className="w-full aspect-[9/16] bg-secondary rounded-md flex items-center justify-center text-xs text-destructive" style={{ maxHeight: '160px' }}>No image</div>
          )}
        </WorkshopCard>
      </div>

      {/* Video result or generate */}
      <WorkshopCard generating={pair.generating}>
        {pair.generatedVideoUrl ? (
          <div>
            <div className="w-full aspect-[9/16] bg-surface-sunken rounded-md overflow-hidden mb-3" style={{ maxHeight: '400px' }}>
              <video
                src={pair.generatedVideoUrl}
                controls
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={pair.generating} className="flex-1 touch-target">
                <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
              </Button>
              <Button size="sm" onClick={handleApprove} disabled={pair.approved} className="flex-1 touch-target">
                <Check className="w-4 h-4 mr-1" /> {pair.approved ? 'Approved' : 'Approve'}
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button
              onClick={handleGenerate}
              disabled={pair.generating || !startScene?.generatedImageUrl || !endScene?.generatedImageUrl}
              className="w-full touch-target font-bold"
            >
              {pair.generating ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating via Veo…
                </span>
              ) : `Generate ${activePair + 1}→${activePair + 2}`}
            </Button>
            {(!startScene?.generatedImageUrl || !endScene?.generatedImageUrl) && (
              <p className="text-xs text-destructive mt-2 text-center">Both scene images required</p>
            )}
          </div>
        )}

        <div className="mt-3 p-2 rounded bg-secondary">
          <div className="flex items-start gap-1.5">
            <Info className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-[10px] text-muted-foreground space-y-1">
              <p><span className="font-semibold">Provider:</span> Google Veo 3.1 — Start image guided generation.</p>
              <p><span className="font-semibold">Frame mode:</span> Start image is used as the initial frame. End image is used as a visual target/guide — Veo does not guarantee exact end-frame matching.</p>
              <p><span className="font-semibold">Behavior:</span> Image A evolving toward Image B with strict constraints.</p>
            </div>
          </div>
        </div>
      </WorkshopCard>

      <StickyAction
        label="Continue to Audio"
        onClick={goToNextStep}
        disabled={!allApproved}
        secondary={{ label: 'Back', onClick: goToPrevStep }}
      />
    </div>
  );
}
