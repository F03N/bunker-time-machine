import { STEP_LABELS, type WorkflowStep } from '@/types/project';
import { useProjectStore } from '@/store/useProjectStore';
import { Check } from 'lucide-react';

export function StepProgress() {
  const { currentStep, setCurrentStep } = useProjectStore();
  const steps = Object.entries(STEP_LABELS) as [string, string][];

  return (
    <div className="flex items-center gap-1 px-3 py-2 overflow-x-auto scrollbar-none">
      {steps.map(([stepNum, label]) => {
        const num = Number(stepNum) as WorkflowStep;
        const isActive = num === currentStep;
        const isComplete = num < currentStep;
        const isPending = num > currentStep;

        return (
          <button
            key={num}
            onClick={() => isComplete ? setCurrentStep(num) : undefined}
            disabled={isPending}
            className={`
              flex items-center justify-center shrink-0
              w-8 h-8 rounded-full text-xs font-semibold
              transition-all duration-200
              ${isActive ? 'bg-primary text-primary-foreground ring-2 ring-primary/40' : ''}
              ${isComplete ? 'bg-step-complete text-foreground cursor-pointer hover:ring-2 hover:ring-step-complete/40' : ''}
              ${isPending ? 'bg-step-pending text-muted-foreground cursor-not-allowed' : ''}
            `}
            title={label}
          >
            {isComplete ? <Check className="w-4 h-4" /> : num}
          </button>
        );
      })}
    </div>
  );
}
