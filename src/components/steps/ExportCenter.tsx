import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { ModelBadge } from '@/components/ModelBadge';
import { StickyAction } from '@/components/StickyAction';
import { getActiveModels } from '@/types/project';
import { Download, FileArchive, FolderOpen } from 'lucide-react';

export function ExportCenter() {
  const { name, qualityMode, scenes, transitions, ideas, selectedIdeaIndex, audio, goToPrevStep } = useProjectStore();
  const models = getActiveModels(qualityMode);
  const selectedIdea = selectedIdeaIndex !== null ? ideas[selectedIdeaIndex] : null;

  const sceneImages = scenes.filter(s => s.generatedImageUrl).length;
  const transitionClips = transitions.filter(t => t.generatedVideoUrl).length;

  const manifest = {
    project: name,
    idea: selectedIdea?.title,
    qualityMode,
    models,
    scenes: scenes.map((s, i) => ({
      index: i + 1,
      title: s.title,
      imagePrompt: s.imagePrompt,
      motionPrompt: s.motionPrompt,
      narration: s.narration,
      hasImage: !!s.generatedImageUrl,
    })),
    transitions: transitions.map((t, i) => ({
      pair: `${t.startSceneIndex + 1}→${t.endSceneIndex + 1}`,
      motionPreset: t.motionPreset,
      speed: `x${t.speedMultiplier}`,
      frameMode: t.frameMode,
      hasVideo: !!t.generatedVideoUrl,
      settings: t.motionSettings,
    })),
    audio: {
      hasScript: audio.fullScript.length > 0,
      ttsReady: audio.ttsReady,
    },
    exportedAt: new Date().toISOString(),
  };

  const handleExport = () => {
    // In production, this creates a real ZIP
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_')}_manifest.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-bold mb-1">Export Center</h1>
        <p className="text-sm text-muted-foreground">Export your bunker restoration project for CapCut assembly.</p>
      </div>

      <WorkshopCard>
        <h2 className="font-bold text-sm mb-3">Project Summary</h2>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Project</span><span className="font-semibold">{name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Concept</span><span className="font-semibold text-right max-w-[60%]">{selectedIdea?.title}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Quality</span><span className="font-semibold capitalize">{qualityMode}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Scene Images</span><span className="font-semibold">{sceneImages}/9</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Transitions</span><span className="font-semibold">{transitionClips}/8</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Audio Script</span><span className="font-semibold">{audio.fullScript ? '✓' : '—'}</span></div>
        </div>
      </WorkshopCard>

      <WorkshopCard>
        <h2 className="font-bold text-sm mb-3">Export Structure</h2>
        <div className="space-y-1.5 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /scenes — 9 scene images</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /transitions — 8 transition clips</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /prompts — all text prompts</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /audio — narration script + notes</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /metadata — manifest.json</div>
        </div>
      </WorkshopCard>

      <WorkshopCard>
        <h2 className="font-bold text-sm mb-3">Active Models</h2>
        <div className="flex flex-wrap gap-2">
          <ModelBadge label="Plan" model={models.planning} />
          <ModelBadge label="Image" model={models.image} />
          <ModelBadge label="Video" model={models.video} />
          <ModelBadge label="TTS" model={models.tts} />
        </div>
      </WorkshopCard>

      <WorkshopCard>
        <h2 className="font-bold text-sm mb-2">Manifest Preview</h2>
        <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
          {JSON.stringify(manifest, null, 2)}
        </pre>
      </WorkshopCard>

      <StickyAction
        label="Export ZIP Bundle"
        onClick={handleExport}
        secondary={{ label: 'Back', onClick: goToPrevStep }}
      />
    </div>
  );
}
