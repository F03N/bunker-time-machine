import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import { Button } from '@/components/ui/button';
import { DEFAULT_MOTION_SETTINGS } from '@/types/project';
import type { TransitionPair, SpeedMultiplier, MotionPreset } from '@/types/project';
import { Check, Play, RefreshCw } from 'lucide-react';

const MOTION_PRESETS: { value: MotionPreset; label: string }[] = [
  { value: 'strict-frame-match', label: 'Strict Frame Match' },
  { value: 'minimal-motion', label: 'Minimal Motion' },
  { value: 'soft-construction', label: 'Soft Construction' },
  { value: 'controlled-interior', label: 'Controlled Interior' },
  { value: 'final-reveal-polish', label: 'Final Reveal Polish' },
];

const SPEEDS: SpeedMultiplier[] = [1, 2, 3, 4];

export function PairTransitionStudio() {
  const { scenes, transitions, setTransitions, updateTransition, goToNextStep, goToPrevStep } = useProjectStore();
  const [activePair, setActivePair] = useState(0);

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

  const handleGenerate = () => {
    updateTransition(activePair, { generating: true });
    setTimeout(() => {
      updateTransition(activePair, {
        generating: false,
        generatedVideoUrl: 'placeholder-video',
      });
    }, 3000);
  };

  const handleApprove = () => {
    updateTransition(activePair, { approved: true });
    if (activePair < 7) setActivePair(activePair + 1);
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
        <p className="text-sm text-muted-foreground">Generate transitions pair by pair. Start + End frames + motion.</p>
      </div>

      {/* Pair selector */}
      <div className="flex gap-1.5 overflow-x-auto px-1 py-1 scrollbar-none">
        {transitions.map((t, i) => (
          <button
            key={i}
            onClick={() => setActivePair(i)}
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

      {/* Signature Moment: Split view */}
      <div className="flex flex-col">
        {/* Start Image */}
        <WorkshopCard className="rounded-b-none border-b-0">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Start Frame</span>
            <span className="text-xs font-semibold">Scene {pair.startSceneIndex + 1}</span>
          </div>
          {startScene?.generatedImageUrl ? (
            <img src={startScene.generatedImageUrl} alt="Start" className="w-full rounded-md aspect-[9/16] object-cover" style={{ maxHeight: '160px', objectPosition: 'top' }} />
          ) : (
            <div className="w-full aspect-[9/16] bg-secondary rounded-md" style={{ maxHeight: '160px' }} />
          )}
        </WorkshopCard>

        {/* Motion Divider */}
        <div className={`
          relative border-x border-border bg-card px-4 py-3
          ${pair.generating ? 'generation-pulse' : ''}
        `}>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-[2px] bg-primary/60" />
            <span className="text-xs font-bold text-primary uppercase tracking-widest">MOTION</span>
            <div className="flex-1 h-[2px] bg-primary/60" />
          </div>
          <details className="mt-2">
            <summary className="text-xs text-muted-foreground cursor-pointer">Motion settings</summary>
            <div className="mt-2 space-y-3">
              <div>
                <label className="text-xs text-muted-foreground">Motion Prompt</label>
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
            <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">End Frame</span>
            <span className="text-xs font-semibold">Scene {pair.endSceneIndex + 1}</span>
          </div>
          {endScene?.generatedImageUrl ? (
            <img src={endScene.generatedImageUrl} alt="End" className="w-full rounded-md aspect-[9/16] object-cover" style={{ maxHeight: '160px', objectPosition: 'top' }} />
          ) : (
            <div className="w-full aspect-[9/16] bg-secondary rounded-md" style={{ maxHeight: '160px' }} />
          )}
        </WorkshopCard>
      </div>

      {/* Video result or generate */}
      <WorkshopCard generating={pair.generating}>
        {pair.generatedVideoUrl ? (
          <div>
            <div className="w-full aspect-[9/16] bg-surface-sunken rounded-md flex items-center justify-center mb-3" style={{ maxHeight: '300px' }}>
              <Play className="w-12 h-12 text-primary/40" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleGenerate} className="flex-1 touch-target">
                <RefreshCw className="w-4 h-4 mr-1" /> Regenerate
              </Button>
              <Button size="sm" onClick={handleApprove} disabled={pair.approved} className="flex-1 touch-target">
                <Check className="w-4 h-4 mr-1" /> {pair.approved ? 'Approved' : 'Approve'}
              </Button>
            </div>
          </div>
        ) : (
          <Button
            onClick={handleGenerate}
            disabled={pair.generating}
            className="w-full touch-target font-bold"
          >
            {pair.generating ? 'Generating Transition…' : `Generate Transition ${activePair + 1}→${activePair + 2}`}
          </Button>
        )}

        {/* Frame mode disclosure */}
        <div className="mt-3 p-2 rounded bg-secondary">
          <p className="text-[10px] text-muted-foreground">
            <span className="font-semibold">Frame Mode:</span> Start + End Frames (Guided).
            The video model receives both frames as guidance. True exact end-frame matching depends on provider capability.
          </p>
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
