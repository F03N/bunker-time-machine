import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { ModelBadge } from '@/components/ModelBadge';
import { StickyAction } from '@/components/StickyAction';
import { getActiveModels, REPAIR_SCENES, SCENE_WORKER_PRESENCE } from '@/types/project';
import { Download, FolderOpen, Info, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';

export function ExportCenter() {
  const { name, qualityMode, scenes, transitions, ideas, selectedIdeaIndex, audio, continuityFlags, goToPrevStep } = useProjectStore();
  const [exporting, setExporting] = useState(false);
  const models = getActiveModels(qualityMode);
  const selectedIdea = selectedIdeaIndex !== null ? ideas[selectedIdeaIndex] : null;

  const sceneImages = scenes.filter(s => s.generatedImageUrl).length;
  const transitionClips = transitions.filter(t => t.generatedVideoUrl).length;

  const buildManifest = () => ({
    project: name,
    exportedAt: new Date().toISOString(),
    masterPromptVersion: '1.0 — Bunker Time Lapse (Professional)',
    idea: selectedIdea ? {
      title: selectedIdea.title,
      location: selectedIdea.location,
      era: selectedIdea.era,
      environmentType: selectedIdea.environmentType,
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
    storyStructure: '9-scene mandatory structure per master prompt',
    providerCapability: {
      imageGeneration: 'Google Imagen 4 — real API via GOOGLE_AI_API_KEY. Scene-aware personGeneration (ALLOW_ADULT for worker scenes, DONT_ALLOW for atmosphere scenes).',
      videoGeneration: 'Google Veo 3.1 — start-image guided generation. End image = visual target/guide, NOT exact end-frame match.',
      tts: 'Google Gemini TTS — text-to-speech for narration (if enabled)',
      planning: 'Google Gemini 2.5 Pro/Flash — scene planning and continuity analysis',
    },
    limitations: [
      'Veo 3.1 uses start image as initial frame. End image serves as visual guide — exact end-frame match is NOT guaranteed.',
      'Imagen 4 reference image uses STYLE_IMAGE type for continuity, not pixel-exact structural reference.',
      'Worker rendering quality varies — silhouettes and partial figures are used as fallback.',
      'Final assembly is designed for CapCut — assets are exported as individual files, not as a timeline.',
    ],
    workerPresenceMap: Object.fromEntries(
      Object.entries(SCENE_WORKER_PRESENCE).map(([k, v]) => [`scene_${Number(k) + 1}`, v])
    ),
    scenes: scenes.map((s, i) => ({
      index: i + 1,
      title: s.title,
      workerPresence: SCENE_WORKER_PRESENCE[i]?.level || 'unknown',
      imagePrompt: s.imagePrompt,
      motionPrompt: s.motionPrompt,
      narration: s.narration,
      notes: s.notes,
      workerCues: s.workerCues || [],
      hasImage: !!s.generatedImageUrl,
      assetPath: s.generatedImageUrl ? `scenes/scene_${i + 1}.png` : null,
    })),
    transitions: transitions.map((t) => ({
      pair: `${t.startSceneIndex + 1}→${t.endSceneIndex + 1}`,
      motionPrompt: t.motionPrompt,
      motionPreset: t.motionPreset,
      speed: `x${t.speedMultiplier}`,
      frameMode: t.frameMode,
      hasVideo: !!t.generatedVideoUrl,
      settings: t.motionSettings,
      assetPath: t.generatedVideoUrl ? `transitions/transition_${t.startSceneIndex + 1}_to_${t.endSceneIndex + 1}.mp4` : null,
    })),
    audio: {
      hasScript: audio.fullScript.length > 0,
      ttsReady: audio.ttsReady,
      assetPath: audio.fullScript ? 'audio/narration_script.txt' : null,
    },
    continuityFlags: continuityFlags.map(f => ({
      sceneIndex: f.sceneIndex + 1,
      type: f.type,
      message: f.message,
      severity: f.severity,
    })),
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const zip = new JSZip();
      const manifest = buildManifest();

      // /metadata
      zip.file('metadata/manifest.json', JSON.stringify(manifest, null, 2));

      // /prompts — per scene
      scenes.forEach((s, i) => {
        const sceneNum = i + 1;
        const presence = SCENE_WORKER_PRESENCE[i];
        zip.file(`prompts/scene_${sceneNum}_image.txt`, s.imagePrompt);
        zip.file(`prompts/scene_${sceneNum}_motion.txt`, s.motionPrompt);
        zip.file(`prompts/scene_${sceneNum}_narration.txt`, s.narration);
        zip.file(`prompts/scene_${sceneNum}_notes.txt`, `Title: ${s.title}\nWorker presence: ${presence?.level || 'unknown'}\nWorker cues: ${(s.workerCues || []).join('; ')}\n\nNotes:\n${s.notes}`);
      });

      // /prompts — per transition
      transitions.forEach((t) => {
        const pairLabel = `${t.startSceneIndex + 1}_to_${t.endSceneIndex + 1}`;
        zip.file(`prompts/transition_${pairLabel}.txt`, t.motionPrompt);
        zip.file(`prompts/transition_${pairLabel}_settings.json`, JSON.stringify({
          motionPreset: t.motionPreset,
          speed: `x${t.speedMultiplier}`,
          frameMode: t.frameMode,
          settings: t.motionSettings,
        }, null, 2));
      });

      // /audio — text files
      if (audio.fullScript) {
        zip.file('audio/narration_script.txt', audio.fullScript);
        zip.file('audio/scene_narrations.json', JSON.stringify(audio.sceneNarrations, null, 2));
        zip.file('audio/ambience_notes.json', JSON.stringify(audio.ambienceNotes, null, 2));
        zip.file('audio/sfx_notes.json', JSON.stringify(audio.sfxNotes, null, 2));
      }

      // /audio — download generated TTS audio files
      const audioPromises = (audio.generatedAudioUrls || []).map(async (url, i) => {
        if (!url) return;
        try {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const blob = await resp.blob();
          const ext = blob.type.includes('mp3') ? 'mp3' : 'wav';
          zip.file(`audio/scene_${i + 1}_narration.${ext}`, blob);
        } catch (err) {
          console.warn(`Could not download audio for scene ${i + 1}:`, err);
          zip.file(`audio/scene_${i + 1}_url.txt`, url);
        }
      });

      // /scenes — download actual images
      const imagePromises = scenes.map(async (s, i) => {
        if (!s.generatedImageUrl) return;
        try {
          const resp = await fetch(s.generatedImageUrl);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const blob = await resp.blob();
          zip.file(`scenes/scene_${i + 1}.png`, blob);
        } catch (err) {
          console.warn(`Could not download scene ${i + 1} image:`, err);
          zip.file(`scenes/scene_${i + 1}_url.txt`, s.generatedImageUrl!);
        }
      });

      // /transitions — download actual videos
      const videoPromises = transitions.map(async (t) => {
        if (!t.generatedVideoUrl) return;
        try {
          const resp = await fetch(t.generatedVideoUrl);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const blob = await resp.blob();
          zip.file(`transitions/transition_${t.startSceneIndex + 1}_to_${t.endSceneIndex + 1}.mp4`, blob);
        } catch (err) {
          console.warn(`Could not download transition ${t.startSceneIndex + 1}→${t.endSceneIndex + 1}:`, err);
          zip.file(`transitions/transition_${t.startSceneIndex + 1}_to_${t.endSceneIndex + 1}_url.txt`, t.generatedVideoUrl!);
        }
      });

      // Asset URL fallback list
      const assetUrls: string[] = [];
      scenes.forEach((s, i) => {
        if (s.generatedImageUrl) assetUrls.push(`Scene ${i + 1}: ${s.generatedImageUrl}`);
      });
      transitions.forEach((t) => {
        if (t.generatedVideoUrl) assetUrls.push(`Transition ${t.startSceneIndex + 1}→${t.endSceneIndex + 1}: ${t.generatedVideoUrl}`);
      });
      zip.file('metadata/asset_urls.txt', assetUrls.join('\n'));

      // CapCut import guide
      zip.file('metadata/capcut_import_guide.txt', `BUNKER TIME LAPSE — CapCut Import Guide
========================================

1. Import all images from /scenes/ in order (scene_1.png → scene_9.png)
2. Import all transition clips from /transitions/ in order
3. Place each transition clip between its corresponding scene images
4. Timeline order: Scene 1 → Transition 1→2 → Scene 2 → Transition 2→3 → … → Scene 9
5. Import narration from /audio/narration_script.txt
6. Add ambient sounds per /audio/ambience_notes.json
7. Add SFX per /audio/sfx_notes.json
8. Set project to 9:16 vertical format
9. Export for YouTube Shorts / TikTok / Instagram Reels

Duration target: 30-45 seconds total
Format: 9:16 vertical
Style: Hyper-realistic construction timelapse
`);

      toast.info('Downloading assets into ZIP…');

      await Promise.all([...imagePromises, ...videoPromises]);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '_')}_bunker_export.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('ZIP bundle exported successfully');
    } catch (err) {
      console.error('Export failed:', err);
      toast.error(`Export failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-24">
      <div className="px-1">
        <h1 className="text-xl font-bold mb-1">Export Center</h1>
        <p className="text-sm text-muted-foreground">Export your bunker restoration project as a ZIP bundle for CapCut assembly.</p>
      </div>

      <WorkshopCard>
        <h2 className="font-bold text-sm mb-3">Project Summary</h2>
        <div className="space-y-2 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Project</span><span className="font-semibold">{name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Concept</span><span className="font-semibold text-right max-w-[60%] truncate">{selectedIdea?.title}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Environment</span><span className="font-semibold capitalize">{selectedIdea?.environmentType}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Quality</span><span className="font-semibold capitalize">{qualityMode}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Scene Images</span><span className={`font-semibold ${sceneImages === 9 ? 'text-step-complete' : ''}`}>{sceneImages}/9</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Transitions</span><span className={`font-semibold ${transitionClips === 8 ? 'text-step-complete' : ''}`}>{transitionClips}/8</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Audio Script</span><span className="font-semibold">{audio.fullScript ? '✓ Ready' : '—'}</span></div>
          {continuityFlags.length > 0 && (
            <div className="flex justify-between"><span className="text-muted-foreground">Continuity Issues</span><span className="font-semibold text-destructive">{continuityFlags.length}</span></div>
          )}
        </div>
      </WorkshopCard>

      <WorkshopCard>
        <h2 className="font-bold text-sm mb-3">ZIP Bundle Structure</h2>
        <div className="space-y-1.5 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /scenes — 9 scene images (PNG, 9:16)</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /transitions — 8 transition clips (MP4)</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /prompts — image + motion + narration per scene</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /audio — narration script + ambience + SFX</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /metadata — manifest.json + CapCut guide</div>
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

      <WorkshopCard>
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs space-y-1.5">
            <p className="font-semibold">Provider Capabilities & Limitations</p>
            <p className="text-muted-foreground">• <span className="text-foreground">Imagen 4:</span> Real API. Scene-aware worker rendering (ALLOW_ADULT for worker scenes, DONT_ALLOW for atmosphere).</p>
            <p className="text-muted-foreground">• <span className="text-foreground">Veo 3.1:</span> Start image = initial frame. End image = visual guide. Exact end-frame NOT guaranteed.</p>
            <p className="text-muted-foreground">• <span className="text-foreground">Workers:</span> Scene-aware presence. Silhouettes/partial figures used as quality fallback.</p>
            <p className="text-muted-foreground">• <span className="text-foreground">Export:</span> Designed for CapCut manual assembly. Not an auto-edited timeline.</p>
          </div>
        </div>
      </WorkshopCard>

      <StickyAction
        label={exporting ? 'Exporting…' : 'Export ZIP Bundle'}
        onClick={handleExport}
        disabled={exporting}
        secondary={{ label: 'Back', onClick: goToPrevStep }}
      />
    </div>
  );
}
