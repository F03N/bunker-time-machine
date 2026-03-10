import { useProjectStore } from '@/store/useProjectStore';
import { StepProgress } from '@/components/StepProgress';
import { STEP_LABELS } from '@/types/project';
import { ProjectSetup } from '@/components/steps/ProjectSetup';
import { IdeaGenerator } from '@/components/steps/IdeaGenerator';
import { ScenePlan } from '@/components/steps/ScenePlan';
import { SceneImageChain } from '@/components/steps/SceneImageChain';
import { ContinuityReview } from '@/components/steps/ContinuityReview';
import { PairTransitionStudio } from '@/components/steps/PairTransitionStudio';
import { AudioVoiceover } from '@/components/steps/AudioVoiceover';
import { ExportCenter } from '@/components/steps/ExportCenter';

const STEP_COMPONENTS = {
  1: ProjectSetup,
  2: IdeaGenerator,
  3: ScenePlan,
  4: SceneImageChain,
  5: ContinuityReview,
  6: PairTransitionStudio,
  7: AudioVoiceover,
  8: ExportCenter,
} as const;

const Index = () => {
  const { currentStep, name } = useProjectStore();
  const StepComponent = STEP_COMPONENTS[currentStep];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold text-sm tracking-tight">W&W</span>
            {name && <span className="text-xs text-muted-foreground truncate max-w-[120px]">/ {name}</span>}
          </div>
          <span className="text-xs text-muted-foreground font-semibold">
            {STEP_LABELS[currentStep]}
          </span>
        </div>
        <StepProgress />
      </header>

      {/* Content */}
      <main className="px-4 py-4 max-w-lg mx-auto">
        <StepComponent />
      </main>
    </div>
  );
};

export default Index;
