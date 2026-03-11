import { useState, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { DEFAULT_MOTION_SETTINGS, REPAIR_SCENES, SCENE_WORKER_PRESENCE } from '@/types/project';
import type { TransitionPair, SpeedMultiplier, MotionPreset } from '@/types/project';
import { Check, RefreshCw, AlertTriangle, Loader2, Info, ChevronDown, ChevronUp, Edit3, Lock } from 'lucide-react';
import { callVeo, getVideoModel, imageUrlToBase64 } from '@/lib/google-ai';
import { buildStrictTransitionPrompt } from '@/lib/prompts';
import { toast } from 'sonner';

const SPEEDS: SpeedMultiplier[] = [1, 2, 3, 4];
const SPEED_LABELS: Record<SpeedMultiplier, { label: string; desc: string }> = {
  1: { label: 'x1 BUNKER', desc: 'Near-static. Locked camera. Almost no motion. Your manual workflow.' },
  2: { label: 'x2 STRICT', desc: 'Very minimal motion. Stationary camera. Slow changes.' },
  3: { label: 'x3 MODERATE', desc: 'Controlled motion. Gradual construction timelapse.' },
  4: { label: 'x4 DYNAMIC', desc: 'More visible motion. Still constrained.' },
};

export function PairTransitionStudio() {
  const { scenes, transitions, setTransitions, updateTransition, goToNextStep, goToPrevStep, qualityMode, name } = useProjectStore();
  const [activePair, setActivePair] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showFullPrompt, setShowFullPrompt] = useState(false);

  useEffect(() => {
    if (transitions.length === 0) {
      const pairs: TransitionPair[] = Array.from({ length: 8 }, (_, i) => ({
        index: i,
        startSceneIndex: i,
        endSceneIndex: i + 1,
        motionPrompt: scenes[i + 1]?.motionPrompt || scenes[i]?.motionPrompt || '',
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
  const endWorkerPresence = SCENE_WORKER_PRESENCE[pair.endSceneIndex];
  const endIsRepairScene = REPAIR_SCENES.includes(pair.endSceneIndex);

  const fullPrompt = buildStrictTransitionPrompt(
    pair.motionPrompt,
    pair.motionSettings,
    startScene?.title || '',
    endScene?.title || '',
    endIsRepairScene,
    pair.endSceneIndex
  );

  const handleGenerate = async () => {
    setErrorMsg(null);
    updateTransition(activePair, { generating: true });

    try {
      if (!startScene?.generatedImageUrl) throw new Error(`Scene ${pair.startSceneIndex + 1} has no generated image`);
      if (!endScene?.generatedImageUrl) throw new Error(`Scene ${pair.endSceneIndex + 1} has no generated image`);

      const startImageBase64 = await imageUrlToBase64(startScene.generatedImageUrl);
      const endImageBase64 = await imageUrlToBase64(endScene.generatedImageUrl);

      toast.info(`Generating ${activePair + 1}→${activePair + 2} via Veo. This may take 2-10 minutes…`);

      const result = await callVeo({
        prompt: fullPrompt,
        model: getVideoModel(qualityMode),
        startImageBase64,
        endImageBase64,
        pairIndex: activePair,
        projectName: name.replace(/\s+/g, '_') || 'project',
      });

      if (result.videoUrl) {
        updateTransition(activePair, { generating: false, generatedVideoUrl: result.videoUrl });
        toast.success(`Transition ${activePair + 1}→${activePair + 2} complete`);
      } else {
        throw new Error(result.message || 'No video URL returned');
      }
    } catch (err) {
      console.error('Transition generation failed:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      const isRateLimit = msg.includes('429') || msg.includes('RATE_LIMITED') || msg.includes('quota');
      setErrorMsg(isRateLimit ? 'API quota exceeded. Wait a few minutes and try again.' : msg);
      updateTransition(activePair, { generating: false });
      toast.error(isRateLimit ? 'API quota exceeded — try again in a few minutes' : `Transition failed: ${msg}`);
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

  const handleMotionPromptEdit = (value: string) => {
    updateTransition(activePair, { motionPrompt: value });
  };

  const handleSettingChange = (key: keyof typeof pair.motionSettings, value: number) => {
    updateTransition(activePair, {
      motionSettings: { ...pair.motionSettings, [key]: value },
    });
  };

  const allApproved = transitions.length === 8 && transitions.every(t => t.approved);
  const isX1 = pair.speedMultiplier === 1;

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-bold mb-1">Pair Transition Studio</h1>
        <p className="text-sm text-muted-foreground">Image A + Image B + motion prompt = one strict transition request.</p>
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

      {/* IMAGE A */}
      <WorkshopCard className="rounded-b-none border-b-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Image A — Start Frame</span>
          <span className="text-xs font-semibold">Scene {pair.startSceneIndex + 1}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2 truncate">{startScene?.title}</p>
        {startScene?.generatedImageUrl ? (
          <img src={startScene.generatedImageUrl} alt="Start" className="w-full rounded-md aspect-[9/16] object-cover" style={{ maxHeight: '180px', objectPosition: 'top' }} />
        ) : (
          <div className="w-full aspect-[9/16] bg-secondary rounded-md flex items-center justify-center text-xs text-destructive" style={{ maxHeight: '180px' }}>No image</div>
        )}
      </WorkshopCard>

      {/* MOTION PROMPT */}
      <div className={`relative border-x border-border bg-card px-4 py-3 ${pair.generating ? 'generation-pulse' : ''}`}>
        <div className="flex items-center gap-2 mb-3">
          <div className="flex-1 h-[2px] bg-primary/60" />
          <span className="text-xs font-bold text-primary uppercase tracking-widest flex items-center gap-1">
            {pair.generating && <Loader2 className="w-3 h-3 animate-spin" />}
            {isX1 ? <Lock className="w-3 h-3" /> : <Edit3 className="w-3 h-3" />}
            MOTION PROMPT
          </span>
          <div className="flex-1 h-[2px] bg-primary/60" />
        </div>

        <Textarea
          value={pair.motionPrompt}
          onChange={(e) => handleMotionPromptEdit(e.target.value)}
          placeholder="Describe the motion from Image A to Image B…"
          className="text-xs font-mono min-h-[60px] bg-secondary border-border mb-2"
        />

        {/* Worker presence */}
        <div className={`p-1.5 rounded text-[10px] mb-2 ${
          endWorkerPresence?.level === 'required' ? 'bg-primary/10 text-primary' :
          endWorkerPresence?.level === 'optional' ? 'bg-accent/30 text-accent-foreground' :
          'bg-muted text-muted-foreground'
        }`}>
          {endWorkerPresence
            ? `${endWorkerPresence.level === 'required' ? '👷' : endWorkerPresence.level === 'optional' ? '🔧' : '🌫️'} ${endWorkerPresence.description}`
            : ''}
        </div>

        {/* Speed selector */}
        <div className="space-y-2 mb-2">
          <label className="text-[10px] text-muted-foreground font-semibold">Speed / Strictness:</label>
          <div className="grid grid-cols-2 gap-1.5">
            {SPEEDS.map(s => (
              <button
                key={s}
                onClick={() => handleSpeedChange(s)}
                className={`px-2 py-2 rounded text-left transition-all ${
                  pair.speedMultiplier === s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground'
                }`}
              >
                <span className="text-xs font-bold block">{SPEED_LABELS[s].label}</span>
                <span className="text-[9px] opacity-80 block mt-0.5">{SPEED_LABELS[s].desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Fine-tune (collapsed by default, discouraged for x1) */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          {showSettings ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          Fine-tune constraints {isX1 && '(x1 already maximally strict)'}
        </button>

        {showSettings && (
          <div className="mt-2 space-y-3 p-2 rounded bg-secondary/50">
            {[
              { key: 'motionStrength' as const, label: 'Motion Amount', desc: 'Lower = more static. x1 default: 5' },
              { key: 'cameraIntensity' as const, label: 'Camera Movement', desc: 'Lower = fully locked. x1 default: 0' },
              { key: 'morphSuppression' as const, label: 'Morph Suppression', desc: 'Higher = zero morphing. x1 default: 100' },
              { key: 'continuityStrictness' as const, label: 'Identity Lock', desc: 'Higher = strictest identity. x1 default: 100' },
            ].map(({ key, label, desc }) => (
              <div key={key}>
                <div className="flex justify-between text-[10px] mb-1">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-mono font-semibold">{pair.motionSettings[key]}</span>
                </div>
                <Slider
                  value={[pair.motionSettings[key]]}
                  onValueChange={([v]) => handleSettingChange(key, v)}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <p className="text-[9px] text-muted-foreground mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        )}

        {/* Full prompt preview */}
        <button
          onClick={() => setShowFullPrompt(!showFullPrompt)}
          className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mt-2"
        >
          {showFullPrompt ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          View exact prompt sent to Veo
        </button>

        {showFullPrompt && (
          <pre className="mt-1 p-2 rounded bg-secondary text-[9px] font-mono text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
            {fullPrompt}
          </pre>
        )}
      </div>

      {/* IMAGE B */}
      <WorkshopCard className="rounded-t-none border-t-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Image B — End Frame</span>
          <span className="text-xs font-semibold">Scene {pair.endSceneIndex + 1}</span>
        </div>
        <p className="text-[10px] text-muted-foreground mb-2 truncate">{endScene?.title}</p>
        {endScene?.generatedImageUrl ? (
          <img src={endScene.generatedImageUrl} alt="End" className="w-full rounded-md aspect-[9/16] object-cover" style={{ maxHeight: '180px', objectPosition: 'top' }} />
        ) : (
          <div className="w-full aspect-[9/16] bg-secondary rounded-md flex items-center justify-center text-xs text-destructive" style={{ maxHeight: '180px' }}>No image</div>
        )}
      </WorkshopCard>

      {/* Video result */}
      <WorkshopCard generating={pair.generating}>
        {pair.generatedVideoUrl ? (
          <div>
            <div className="w-full aspect-[9/16] bg-secondary rounded-md overflow-hidden mb-3" style={{ maxHeight: '400px' }}>
              <video src={pair.generatedVideoUrl} controls playsInline className="w-full h-full object-contain" />
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
                <span className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Generating via Veo…</span>
              ) : `Generate Transition ${activePair + 1}→${activePair + 2}`}
            </Button>
            {(!startScene?.generatedImageUrl || !endScene?.generatedImageUrl) && (
              <p className="text-xs text-destructive mt-2 text-center">Both scene images required</p>
            )}
          </div>
        )}

        {/* Provider transparency */}
        <div className="mt-3 p-2 rounded bg-secondary">
          <div className="flex items-start gap-1.5">
            <Info className="w-3 h-3 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-[10px] text-muted-foreground space-y-0.5">
              <p><span className="font-semibold">How it works:</span> Image A is sent as the start frame. Image B is sent as a STYLE_IMAGE visual reference. The motion prompt describes the change.</p>
              <p><span className="font-semibold">Limitation:</span> Veo 3.1 does not guarantee the video ends exactly on Image B. It uses Image B as a visual target guide.</p>
              <p><span className="font-semibold">Mode:</span> Guided pair transition — closest possible to true A→B within current API limits.</p>
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
