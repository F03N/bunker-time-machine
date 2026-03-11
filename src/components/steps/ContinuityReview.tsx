import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, RefreshCw, X, Loader2, Eye, ChevronLeft, ChevronRight } from 'lucide-react';
import { callGemini, callImagen, getImageModel, getPlanningModel, imageUrlToBase64 } from '@/lib/google-ai';
import { getContinuityReviewPrompt } from '@/lib/prompts';
import { validateRepairLogic, REPAIR_SCENES, ATMOSPHERE_ONLY_SCENES, SCENE_WORKER_PRESENCE } from '@/types/project';
import type { ContinuityFlag } from '@/types/project';
import { toast } from 'sonner';

export function ContinuityReview() {
  const { scenes, updateScene, continuityFlags, setContinuityFlags, goToNextStep, goToPrevStep, qualityMode, name } = useProjectStore();
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [checking, setChecking] = useState(false);
  const [checked, setChecked] = useState(false);
  const [regenerating, setRegenerating] = useState<number | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareIndex, setCompareIndex] = useState(0);

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

      // 3. Scene-aware worker presence validation
      scenes.forEach((scene, idx) => {
        const presence = SCENE_WORKER_PRESENCE[idx];
        if (!presence || !scene.imagePrompt) return;

        const hasWorkerRef = /worker|crew|silhouette|figure|person|team|staff|laborer/i.test(scene.imagePrompt);
        const hasToolRef = /scaffold|tool|equipment|welding|construction|machinery|cable|debris|paint|mount|drill|hammer|generator|light.?set|material/i.test(scene.imagePrompt);

        if (presence.level === 'required' && !hasWorkerRef && !hasToolRef) {
          flags.push({
            sceneIndex: idx,
            type: 'worker-logic',
            message: `Scene ${idx + 1} (${scene.title}): Workers REQUIRED per master prompt but no worker/tool cues found in image prompt.`,
            severity: 'error',
          });
        }

        if (presence.level === 'none') {
          const hasRepairRef = /repair|fix|construct|build|install|weld|scaffold|worker|crew/i.test(scene.imagePrompt);
          if (hasRepairRef) {
            flags.push({
              sceneIndex: idx,
              type: 'worker-logic',
              message: `Scene ${idx + 1} (${scene.title}): Atmosphere-only scene contains construction/worker language. Only environmental state allowed.`,
              severity: 'warning',
            });
          }
        }
      });

      // 4. Prompt-level continuity checks (camera angle, bunker identity keywords)
      const firstPrompt = scenes[0]?.imagePrompt || '';
      for (let i = 1; i < 9; i++) {
        const prompt = scenes[i]?.imagePrompt || '';
        if (!prompt || !firstPrompt) continue;

        // Check if prompts maintain structural consistency keywords
        const structuralTerms = firstPrompt.match(/(?:concrete|steel|metal|stone|brick|bunker|entrance|door|hatch)\s+\w+/gi) || [];
        const missingTerms = structuralTerms.filter(term => {
          const keyword = term.split(/\s+/)[0].toLowerCase();
          return !prompt.toLowerCase().includes(keyword);
        });

        if (missingTerms.length > structuralTerms.length * 0.5 && structuralTerms.length > 2) {
          flags.push({
            sceneIndex: i,
            type: 'identity',
            message: `Scene ${i + 1}: Prompt may drift from bunker identity. Missing structural terms found in Scene 1.`,
            severity: 'warning',
          });
        }
      }

      // 5. Progression logic: ensure scenes progress forward, not backward
      const progressionKeywords = [
        ['damaged', 'abandoned', 'broken', 'rust', 'debris', 'crack'],
        ['arriving', 'tools', 'inspecting', 'setup'],
        ['removing', 'welding', 'reinforcing', 'repair'],
        ['restored', 'clean', 'fresh', 'organized'],
        ['entering', 'underground', 'dark', 'interior'],
        ['installing', 'cables', 'flooring', 'lighting'],
        ['modern', 'polished', 'functional', 'bright'],
        ['furniture', 'design', 'decor', 'aesthetic'],
        ['reveal', 'futuristic', 'impressive', 'cinematic'],
      ];

      for (let i = 0; i < 9; i++) {
        const prompt = scenes[i]?.imagePrompt?.toLowerCase() || '';
        const expected = progressionKeywords[i] || [];
        const matches = expected.filter(kw => prompt.includes(kw));
        if (matches.length === 0 && expected.length > 0 && prompt.length > 0) {
          flags.push({
            sceneIndex: i,
            type: 'progression',
            message: `Scene ${i + 1}: Prompt doesn't match expected progression stage. Expected keywords like: ${expected.slice(0, 3).join(', ')}.`,
            severity: 'warning',
          });
        }
      }

      // 6. AI-based continuity check if we have images
      const scenesWithImages = scenes.filter(s => s.generatedImageUrl);
      if (scenesWithImages.length >= 4) {
        try {
          const sceneDescriptions = scenes.map((s, i) => {
            const presence = SCENE_WORKER_PRESENCE[i];
            return `Scene ${i + 1} (${s.title}): ${s.generatedImageUrl ? 'HAS IMAGE' : 'NO IMAGE'} | Workers: ${presence?.level || 'unknown'} | Prompt excerpt: ${s.imagePrompt.substring(0, 200)}`;
          }).join('\n');

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
        approved: false,
      });

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

  const hasBlockingErrors = continuityFlags.some(f => f.severity === 'error' && f.type !== 'identity');
  const sceneFlags = (idx: number) => continuityFlags.filter(f => f.sceneIndex === idx);

  // Compare mode: side-by-side consecutive pairs
  const comparePairA = scenes[compareIndex];
  const comparePairB = scenes[compareIndex + 1];

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-bold mb-1">Continuity Review</h1>
        <p className="text-sm text-muted-foreground">Inspect all 9 scenes for drift, worker logic, and progression consistency.</p>
      </div>

      {/* Scene type legend */}
      <div className="flex gap-2 px-1 text-[10px] flex-wrap">
        <span className="flex items-center gap-1">👷 Workers required</span>
        <span className="flex items-center gap-1">🔧 Workers optional</span>
        <span className="flex items-center gap-1">🌫️ Atmosphere only</span>
      </div>

      {/* View mode toggle */}
      <div className="flex gap-2 px-1">
        <button
          onClick={() => setCompareMode(false)}
          className={`px-3 py-1.5 rounded text-xs font-semibold ${!compareMode ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
        >
          Grid View
        </button>
        <button
          onClick={() => setCompareMode(true)}
          className={`px-3 py-1.5 rounded text-xs font-semibold ${compareMode ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}
        >
          Pair Compare
        </button>
      </div>

      {compareMode ? (
        /* Pair comparison view */
        <div>
          <div className="flex items-center justify-between px-1 mb-2">
            <button
              onClick={() => setCompareIndex(Math.max(0, compareIndex - 1))}
              disabled={compareIndex === 0}
              className="p-1 rounded bg-secondary disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold">Scene {compareIndex + 1} → Scene {compareIndex + 2}</span>
            <button
              onClick={() => setCompareIndex(Math.min(7, compareIndex + 1))}
              disabled={compareIndex >= 7}
              className="p-1 rounded bg-secondary disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {[comparePairA, comparePairB].map((scene, si) => {
              const idx = compareIndex + si;
              const presence = SCENE_WORKER_PRESENCE[idx];
              const flags = sceneFlags(idx);
              return (
                <div key={idx} className="flex flex-col gap-1">
                  <div className={`relative aspect-[9/16] rounded-md overflow-hidden border-2 ${flags.some(f => f.severity === 'error') ? 'border-destructive' : flags.some(f => f.severity === 'warning') ? 'border-yellow-600' : 'border-border'}`}>
                    {scene?.generatedImageUrl ? (
                      <img src={scene.generatedImageUrl} alt={`Scene ${idx + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-secondary flex items-center justify-center text-xs text-muted-foreground">{idx + 1}</div>
                    )}
                    {checked && flags.length === 0 && scene?.generatedImageUrl && (
                      <div className="absolute top-1 right-1"><Check className="w-4 h-4 text-step-complete" /></div>
                    )}
                    {flags.length > 0 && (
                      <div className="absolute top-1 right-1"><AlertTriangle className={`w-4 h-4 ${flags.some(f => f.severity === 'error') ? 'text-destructive' : 'text-yellow-500'}`} /></div>
                    )}
                  </div>
                  <p className="text-[10px] font-semibold truncate">{idx + 1}. {scene?.title?.split('(')[0].trim()}</p>
                  <p className="text-[9px] text-muted-foreground">
                    {presence ? `${presence.level === 'required' ? '👷' : presence.level === 'optional' ? '🔧' : '🌫️'} ${presence.level}` : ''}
                  </p>
                  {flags.map((f, fi) => (
                    <p key={fi} className={`text-[9px] ${f.severity === 'error' ? 'text-destructive' : 'text-yellow-500'}`}>
                      [{f.type}] {f.message.substring(0, 60)}…
                    </p>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* 3x3 Grid view */
        <div className="grid grid-cols-3 gap-2">
          {scenes.map((scene, idx) => {
            const flags = sceneFlags(idx);
            const hasError = flags.some(f => f.severity === 'error');
            const hasWarning = flags.some(f => f.severity === 'warning');
            const presence = SCENE_WORKER_PRESENCE[idx];
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
                    <span className="text-[9px]">
                      {presence?.level === 'required' ? '👷' : presence?.level === 'optional' ? '🔧' : '🌫️'}
                    </span>
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
      )}

      {/* Selected scene detail */}
      {selectedScene !== null && !compareMode && (
        <WorkshopCard>
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="font-bold text-sm">Scene {selectedScene + 1}: {scenes[selectedScene].title}</h3>
              <span className={`text-[10px] font-semibold ${REPAIR_SCENES.includes(selectedScene) ? 'text-primary' : 'text-muted-foreground'}`}>
                {SCENE_WORKER_PRESENCE[selectedScene]
                  ? `${SCENE_WORKER_PRESENCE[selectedScene].level === 'required' ? '👷' : SCENE_WORKER_PRESENCE[selectedScene].level === 'optional' ? '🔧' : '🌫️'} ${SCENE_WORKER_PRESENCE[selectedScene].description}`
                  : ''}
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

          {/* Worker cues */}
          {REPAIR_SCENES.includes(selectedScene) && scenes[selectedScene].workerCues?.length > 0 && (
            <div className="mb-2 p-2 rounded bg-primary/10">
              <p className="text-[10px] font-semibold text-primary mb-1">Construction Cues in Prompt:</p>
              {scenes[selectedScene].workerCues.map((cue, i) => (
                <p key={i} className="text-[10px] text-muted-foreground">• {cue}</p>
              ))}
            </div>
          )}

          {/* Flags */}
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
              <span className="flex items-center gap-1"><Loader2 className="w-4 h-4 animate-spin" /> Regenerating…</span>
            ) : (
              <span className="flex items-center gap-1"><RefreshCw className="w-4 h-4" /> Regenerate Scene {selectedScene + 1}</span>
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
              <><Loader2 className="w-4 h-4 animate-spin" /> Running Continuity Check…</>
            ) : (
              <><Eye className="w-4 h-4" /> Run Continuity Check</>
            )}
          </button>
        ) : continuityFlags.length === 0 ? (
          <div className="flex items-center gap-2 text-step-complete text-sm">
            <Check className="w-5 h-5" />
            <span className="font-semibold">All 9 scenes pass continuity check.</span>
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
            <div className="max-h-32 overflow-y-auto space-y-1">
              {continuityFlags.map((flag, i) => (
                <div key={i} className={`text-[10px] p-1.5 rounded ${flag.severity === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-yellow-600/10 text-yellow-500'}`}>
                  <span className="font-semibold">Scene {flag.sceneIndex + 1} [{flag.type}]:</span> {flag.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </WorkshopCard>

      <StickyAction
        label="Begin Transition Generation"
        onClick={goToNextStep}
        disabled={!checked || hasBlockingErrors}
        secondary={{ label: 'Back', onClick: goToPrevStep }}
      />
    </div>
  );
}
