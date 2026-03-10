import { useProjectStore } from '@/store/useProjectStore';
import { getActiveModels } from '@/types/project';
import { WorkshopCard } from '@/components/WorkshopCard';
import { ModelBadge } from '@/components/ModelBadge';
import { StickyAction } from '@/components/StickyAction';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { QualityMode } from '@/types/project';

const QUALITY_OPTIONS: { value: QualityMode; label: string; desc: string }[] = [
  { value: 'fast', label: 'Fast', desc: 'Draft quality, quick iterations' },
  { value: 'balanced', label: 'Balanced', desc: 'Production-ready output' },
  { value: 'quality', label: 'Quality', desc: 'Maximum fidelity, slower' },
];

export function ProjectSetup() {
  const { name, setName, referenceNotes, setReferenceNotes, qualityMode, setQualityMode, goToNextStep } = useProjectStore();
  const models = getActiveModels(qualityMode);

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-bold mb-1">Project Setup</h1>
        <p className="text-sm text-muted-foreground">Configure your bunker restoration project.</p>
      </div>

      <WorkshopCard>
        <label className="block text-sm font-semibold mb-2">Project Name</label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Cold War Bunker #47"
          className="bg-secondary border-border"
        />
      </WorkshopCard>

      <WorkshopCard>
        <label className="block text-sm font-semibold mb-2">Reference Notes</label>
        <Textarea
          value={referenceNotes}
          onChange={(e) => setReferenceNotes(e.target.value)}
          placeholder="Optional notes about style, location, era…"
          className="bg-secondary border-border min-h-[80px] font-mono text-sm"
        />
      </WorkshopCard>

      <WorkshopCard>
        <label className="block text-sm font-semibold mb-3">Quality Mode</label>
        <div className="flex flex-col gap-2">
          {QUALITY_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setQualityMode(opt.value)}
              className={`
                flex flex-col p-3 rounded-md border text-left transition-all
                ${qualityMode === opt.value
                  ? 'border-primary bg-primary/10'
                  : 'border-border bg-secondary hover:border-muted-foreground/30'
                }
              `}
            >
              <span className="font-semibold text-sm">{opt.label}</span>
              <span className="text-xs text-muted-foreground">{opt.desc}</span>
            </button>
          ))}
        </div>
      </WorkshopCard>

      <WorkshopCard>
        <label className="block text-sm font-semibold mb-3">Active Models</label>
        <div className="flex flex-wrap gap-2">
          <ModelBadge label="Planning" model={models.planning} />
          <ModelBadge label="Image" model={models.image} />
          <ModelBadge label="Video" model={models.video} />
          <ModelBadge label="TTS" model={models.tts} />
        </div>
      </WorkshopCard>

      <StickyAction
        label="Begin Project"
        onClick={goToNextStep}
        disabled={!name.trim()}
      />
    </div>
  );
}
