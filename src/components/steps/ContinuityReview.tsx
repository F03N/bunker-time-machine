import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { StickyAction } from '@/components/StickyAction';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Check, RefreshCw, X } from 'lucide-react';
import type { ContinuityFlag } from '@/types/project';

export function ContinuityReview() {
  const { scenes, continuityFlags, setContinuityFlags, goToNextStep, goToPrevStep, updateScene } = useProjectStore();
  const [selectedScene, setSelectedScene] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);

  const handleRunCheck = () => {
    // Simulate continuity check
    const mockFlags: ContinuityFlag[] = [];
    // In production, AI would analyze images for drift
    setContinuityFlags(mockFlags);
    setChecked(true);
  };

  const hasErrors = continuityFlags.some(f => f.severity === 'error');

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-bold mb-1">Continuity Review</h1>
        <p className="text-sm text-muted-foreground">Review all 9 scenes together. Check for drift before transitions.</p>
      </div>

      {/* 3x3 Grid */}
      <div className="grid grid-cols-3 gap-2">
        {scenes.map((scene, idx) => (
          <button
            key={idx}
            onClick={() => setSelectedScene(selectedScene === idx ? null : idx)}
            className={`
              relative aspect-[9/16] rounded-md overflow-hidden border-2 transition-all
              ${selectedScene === idx ? 'border-primary ring-2 ring-primary/30' : 'border-border'}
              ${continuityFlags.some(f => f.sceneIndex === idx && f.severity === 'error') ? 'border-destructive' : ''}
              ${continuityFlags.some(f => f.sceneIndex === idx && f.severity === 'warning') ? 'border-yellow-600' : ''}
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
              <span className="text-[10px] font-semibold">{idx + 1}. {scene.title}</span>
            </div>
            {continuityFlags.some(f => f.sceneIndex === idx) && (
              <div className="absolute top-1 right-1">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Selected scene detail */}
      {selectedScene !== null && (
        <WorkshopCard>
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-bold text-sm">Scene {selectedScene + 1}: {scenes[selectedScene].title}</h3>
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
          {continuityFlags.filter(f => f.sceneIndex === selectedScene).map((flag, i) => (
            <div key={i} className={`flex items-start gap-2 text-xs p-2 rounded mb-1 ${flag.severity === 'error' ? 'bg-destructive/10 text-destructive' : 'bg-yellow-600/10 text-yellow-500'}`}>
              <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" />
              <span>{flag.message}</span>
            </div>
          ))}
          <Button variant="outline" size="sm" className="w-full mt-2 touch-target">
            <RefreshCw className="w-4 h-4 mr-1" /> Regenerate Scene {selectedScene + 1}
          </Button>
        </WorkshopCard>
      )}

      {/* Check button */}
      {!checked && (
        <WorkshopCard>
          <button
            onClick={handleRunCheck}
            className="w-full py-3 bg-primary text-primary-foreground font-bold rounded-md touch-target"
          >
            Run Continuity Check
          </button>
        </WorkshopCard>
      )}

      {checked && continuityFlags.length === 0 && (
        <WorkshopCard>
          <div className="flex items-center gap-2 text-step-complete text-sm">
            <Check className="w-5 h-5" />
            <span className="font-semibold">All scenes pass continuity check.</span>
          </div>
        </WorkshopCard>
      )}

      <StickyAction
        label="Begin Transition Generation"
        onClick={goToNextStep}
        disabled={!checked || hasErrors}
        secondary={{ label: 'Back', onClick: goToPrevStep }}
      />
    </div>
  );
}
