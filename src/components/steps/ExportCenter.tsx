import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { ModelBadge } from '@/components/ModelBadge';
import { StickyAction } from '@/components/StickyAction';
import { getActiveModels, REPAIR_SCENES, ATMOSPHERE_ONLY_SCENES } from '@/types/project';
import { Download, FolderOpen, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner';

export function ExportCenter() {
  const { name, qualityMode, scenes, transitions, ideas, selectedIdeaIndex, audio, continuityFlags, goToPrevStep } = useProjectStore();
  const models = getActiveModels(qualityMode);
  const selectedIdea = selectedIdeaIndex !== null ? ideas[selectedIdeaIndex] : null;

  const sceneImages = scenes.filter(s => s.generatedImageUrl).length;
  const transitionClips = transitions.filter(t => t.generatedVideoUrl).length;

  const manifest = {
    project: name,
    exportedAt: new Date().toISOString(),
    idea: selectedIdea ? {
      title: selectedIdea.title,
      location: selectedIdea.location,
      era: selectedIdea.era,
      description: selectedIdea.description,
      visualHook: selectedIdea.visualHook,
    } : null,
    qualityMode,
    activeModels: {
      planning: models.planning,
      image: models.image,
      video: models.video,
      tts: models.tts,
    },
    providerCapability: {
      imageGeneration: 'Google Imagen 4 — text-to-image, reference image for continuity via Gemini vision',
      videoGeneration: 'Google Veo 3.1 — start-image guided generation. End image used as visual target/guide, NOT exact end-frame match.',
      tts: 'Google Gemini TTS — text-to-speech for narration',
      planning: 'Google Gemini 2.5 Pro/Flash — scene planning and continuity analysis',
    },
    warnings: [
      'Veo 3.1 uses start image as initial frame. End image is a visual guide — exact end-frame is NOT guaranteed.',
      'Image generation uses Gemini vision for structural reference continuity, not native Imagen 4 reference.',
      'Worker/tool cues are enforced in repair scenes but image generators cannot render human figures.',
    ],
    scenes: scenes.map((s, i) => ({
      index: i + 1,
      title: s.title,
      type: REPAIR_SCENES.includes(i) ? 'repair' : 'atmosphere',
      imagePrompt: s.imagePrompt,
      motionPrompt: s.motionPrompt,
      narration: s.narration,
      notes: s.notes,
      workerCues: s.workerCues || [],
      hasImage: !!s.generatedImageUrl,
      assetPath: s.generatedImageUrl ? `/scenes/scene_${i + 1}.png` : null,
    })),
    transitions: transitions.map((t, i) => ({
      pair: `${t.startSceneIndex + 1}→${t.endSceneIndex + 1}`,
      motionPrompt: t.motionPrompt,
      motionPreset: t.motionPreset,
      speed: `x${t.speedMultiplier}`,
      frameMode: t.frameMode,
      hasVideo: !!t.generatedVideoUrl,
      settings: t.motionSettings,
      assetPath: t.generatedVideoUrl ? `/transitions/transition_${t.startSceneIndex + 1}_to_${t.endSceneIndex + 1}.mp4` : null,
    })),
    audio: {
      hasScript: audio.fullScript.length > 0,
      ttsReady: audio.ttsReady,
      assetPath: audio.fullScript ? '/audio/narration_script.txt' : null,
    },
    continuityFlags: continuityFlags.map(f => ({
      sceneIndex: f.sceneIndex + 1,
      type: f.type,
      message: f.message,
      severity: f.severity,
    })),
    assetStructure: {
      '/scenes': '9 scene images (PNG, 9:16)',
      '/transitions': '8 transition clips (MP4)',
      '/prompts': 'All text prompts per scene and pair',
      '/audio': 'Narration script, ambience notes, SFX cues',
      '/metadata': 'manifest.json with full project data',
    },
  };

  const handleExport = async () => {
    try {
      // Build a comprehensive export bundle
      const files: Record<string, string> = {};

      // Manifest
      files['metadata/manifest.json'] = JSON.stringify(manifest, null, 2);

      // Prompts per scene
      scenes.forEach((s, i) => {
        files[`prompts/scene_${i + 1}_image.txt`] = s.imagePrompt;
        files[`prompts/scene_${i + 1}_motion.txt`] = s.motionPrompt;
      });

      // Transition prompts
      transitions.forEach((t) => {
        files[`prompts/transition_${t.startSceneIndex + 1}_to_${t.endSceneIndex + 1}.txt`] = t.motionPrompt;
      });

      // Audio
      if (audio.fullScript) {
        files['audio/narration_script.txt'] = audio.fullScript;
        files['audio/scene_narrations.json'] = JSON.stringify(audio.sceneNarrations, null, 2);
        files['audio/ambience_notes.json'] = JSON.stringify(audio.ambienceNotes, null, 2);
        files['audio/sfx_notes.json'] = JSON.stringify(audio.sfxNotes, null, 2);
      }

      // Asset URLs list (for manual download)
      const assetUrls: string[] = [];
      scenes.forEach((s, i) => {
        if (s.generatedImageUrl) {
          assetUrls.push(`Scene ${i + 1}: ${s.generatedImageUrl}`);
        }
      });
      transitions.forEach((t) => {
        if (t.generatedVideoUrl) {
          assetUrls.push(`Transition ${t.startSceneIndex + 1}→${t.endSceneIndex + 1}: ${t.generatedVideoUrl}`);
        }
      });
      files['metadata/asset_urls.txt'] = assetUrls.join('\n');

      // Download manifest as JSON for now (ZIP requires JSZip library)
      const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '_')}_manifest.json`;
      a.click();
      URL.revokeObjectURL(url);

      // Also download asset URLs
      const urlsBlob = new Blob([assetUrls.join('\n')], { type: 'text/plain' });
      const urlsUrl = URL.createObjectURL(urlsBlob);
      const urlsA = document.createElement('a');
      urlsA.href = urlsUrl;
      urlsA.download = `${name.replace(/\s+/g, '_')}_asset_urls.txt`;
      urlsA.click();
      URL.revokeObjectURL(urlsUrl);

      // Download prompts bundle
      const promptsBundle = {
        scenes: scenes.map((s, i) => ({
          scene: i + 1,
          title: s.title,
          imagePrompt: s.imagePrompt,
          motionPrompt: s.motionPrompt,
        })),
        transitions: transitions.map(t => ({
          pair: `${t.startSceneIndex + 1}→${t.endSceneIndex + 1}`,
          motionPrompt: t.motionPrompt,
          preset: t.motionPreset,
          speed: `x${t.speedMultiplier}`,
          settings: t.motionSettings,
        })),
      };
      const promptsBlob = new Blob([JSON.stringify(promptsBundle, null, 2)], { type: 'application/json' });
      const promptsUrl = URL.createObjectURL(promptsBlob);
      const promptsA = document.createElement('a');
      promptsA.href = promptsUrl;
      promptsA.download = `${name.replace(/\s+/g, '_')}_prompts.json`;
      promptsA.click();
      URL.revokeObjectURL(promptsUrl);

      toast.success('Exported manifest, asset URLs, and prompts bundle');
    } catch (err) {
      toast.error('Export failed');
      console.error(err);
    }
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
          {continuityFlags.length > 0 && (
            <div className="flex justify-between"><span className="text-muted-foreground">Continuity Issues</span><span className="font-semibold text-destructive">{continuityFlags.length}</span></div>
          )}
        </div>
      </WorkshopCard>

      <WorkshopCard>
        <h2 className="font-bold text-sm mb-3">Export Structure</h2>
        <div className="space-y-1.5 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /scenes — 9 scene images</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /transitions — 8 transition clips</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /prompts — all text prompts</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /audio — narration + SFX notes</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /metadata — manifest.json</div>
        </div>
      </WorkshopCard>

      <WorkshopCard>
        <h2 className="font-bold text-sm mb-3">Active Models (Google Only)</h2>
        <div className="flex flex-wrap gap-2">
          <ModelBadge label="Plan" model={models.planning} />
          <ModelBadge label="Image" model={models.image} />
          <ModelBadge label="Video" model={models.video} />
          <ModelBadge label="TTS" model={models.tts} />
        </div>
      </WorkshopCard>

      {/* Provider honesty */}
      <WorkshopCard>
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs space-y-1.5">
            <p className="font-semibold">Provider Capabilities & Limitations</p>
            <p className="text-muted-foreground">• <span className="text-foreground">Veo 3.1:</span> Start image is used as initial frame. End image serves as visual guide — exact end-frame match is NOT guaranteed.</p>
            <p className="text-muted-foreground">• <span className="text-foreground">Imagen 4:</span> Image generation via Gemini vision for structural reference continuity.</p>
            <p className="text-muted-foreground">• <span className="text-foreground">Worker logic:</span> Enforced in prompts but image generators cannot render human figures.</p>
          </div>
        </div>
      </WorkshopCard>

      <WorkshopCard>
        <h2 className="font-bold text-sm mb-2">Manifest Preview</h2>
        <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap max-h-40 overflow-y-auto">
          {JSON.stringify(manifest, null, 2)}
        </pre>
      </WorkshopCard>

      <StickyAction
        label="Export Bundle"
        onClick={handleExport}
        secondary={{ label: 'Back', onClick: goToPrevStep }}
      />
    </div>
  );
}
