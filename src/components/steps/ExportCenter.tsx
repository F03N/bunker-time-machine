import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { WorkshopCard } from '@/components/WorkshopCard';
import { ModelBadge } from '@/components/ModelBadge';
import { StickyAction } from '@/components/StickyAction';
import { getActiveModels, SCENE_WORKER_PRESENCE } from '@/types/project';
import { Download, FolderOpen, Info, Loader2, Check, FileText, Film, Image, Music } from 'lucide-react';
import { toast } from 'sonner';
import JSZip from 'jszip';

export function ExportCenter() {
  const { name, qualityMode, scenes, transitions, ideas, selectedIdeaIndex, audio, continuityFlags, goToPrevStep } = useProjectStore();
  const [exporting, setExporting] = useState(false);
  const models = getActiveModels(qualityMode);
  const selectedIdea = selectedIdeaIndex !== null ? ideas[selectedIdeaIndex] : null;

  const sceneImages = scenes.filter(s => s.generatedImageUrl).length;
  const transitionClips = transitions.filter(t => t.generatedVideoUrl).length;
  const hasAudioFiles = (audio.generatedAudioUrls || []).filter(Boolean).length > 0;
  const hasScript = audio.fullScript.length > 0;

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
      imageGeneration: 'Google Imagen 4 — scene-aware personGeneration. STYLE_IMAGE reference for continuity.',
      videoGeneration: 'Google Veo 3.1 — start-image + STYLE_IMAGE end-frame guide. NOT exact end-frame match.',
      tts: 'Google Gemini TTS — real audio generation for narration.',
      planning: 'Google Gemini 2.5 Pro/Flash — scene planning and visual continuity analysis.',
    },
    limitations: [
      'Veo 3.1: End image serves as visual guide only — exact end-frame match is NOT guaranteed.',
      'Imagen 4: STYLE_IMAGE reference provides style consistency, not pixel-exact structural lock.',
      'Worker rendering: Silhouettes and partial figures used as quality fallback.',
      'Export: Individual asset files for CapCut manual assembly — not an auto-edited timeline.',
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
      assetFile: s.generatedImageUrl ? `scenes/scene_${String(i + 1).padStart(2, '0')}.png` : null,
    })),
    transitions: transitions.map((t) => ({
      pair: `${t.startSceneIndex + 1}→${t.endSceneIndex + 1}`,
      motionPrompt: t.motionPrompt,
      speed: `x${t.speedMultiplier}`,
      hasVideo: !!t.generatedVideoUrl,
      settings: t.motionSettings,
      assetFile: t.generatedVideoUrl ? `transitions/transition_${String(t.startSceneIndex + 1).padStart(2, '0')}_to_${String(t.endSceneIndex + 1).padStart(2, '0')}.mp4` : null,
    })),
    audio: {
      hasScript: hasScript,
      hasAudioFiles,
      ttsReady: audio.ttsReady,
    },
    continuityFlags: continuityFlags.map(f => ({
      sceneIndex: f.sceneIndex + 1,
      type: f.type,
      message: f.message,
      severity: f.severity,
    })),
  });

  const buildCapCutGuide = () => `BUNKER TIME LAPSE — CapCut Assembly Guide
=============================================
Project: ${name}
Concept: ${selectedIdea?.title || 'N/A'}
Environment: ${selectedIdea?.environmentType || 'N/A'}
Quality Mode: ${qualityMode}
Models: Imagen 4 (images) + Veo 3.1 (transitions) + Gemini TTS (audio)

TIMELINE ORDER
==============
Place assets on the CapCut timeline in this EXACT order:

  1. scene_01.png
  2. transition_01_to_02.mp4
  3. scene_02.png
  4. transition_02_to_03.mp4
  5. scene_03.png
  6. transition_03_to_04.mp4
  7. scene_04.png
  8. transition_04_to_05.mp4
  9. scene_05.png
  10. transition_05_to_06.mp4
  11. scene_06.png
  12. transition_06_to_07.mp4
  13. scene_07.png
  14. transition_07_to_08.mp4
  15. scene_08.png
  16. transition_08_to_09.mp4
  17. scene_09.png

SCENE DURATIONS (suggested)
============================
- Scene images: 0.5-1.0 seconds each (hold frames)
- Transition clips: 5 seconds each (Veo-generated)
- Total estimated: ~50-55 seconds before trimming

AUDIO TRACK
============
${hasAudioFiles ? '- Import audio files from /audio/ folder\n- Each scene_XX_narration file corresponds to its scene\n- Layer narration over the visual timeline' : hasScript ? '- Full narration script in /audio/narration_script.txt\n- Record or use external TTS to generate audio' : '- No audio generated — add narration manually'}
- Ambient sounds: see /audio/ambience_notes.json
- Sound effects: see /audio/sfx_notes.json

PROJECT SETTINGS
=================
- Aspect Ratio: 9:16 (vertical)
- Resolution: 1080×1920
- Frame Rate: 30fps
- Format: MP4 (H.264)

EXPORT FOR
===========
- YouTube Shorts (max 60s)
- TikTok (max 60s preferred)
- Instagram Reels (max 90s)

WORKER PRESENCE PER SCENE
===========================
${scenes.map((s, i) => {
  const p = SCENE_WORKER_PRESENCE[i];
  return `Scene ${String(i + 1).padStart(2, '0')} (${s.title}): ${p?.level === 'required' ? '👷 REQUIRED' : p?.level === 'optional' ? '🔧 OPTIONAL' : '🌫️ NONE'}`;
}).join('\n')}

NOTES
======
- Transitions are GUIDED (start-frame + visual target), not exact A→B frame matches.
- Check each transition for structural consistency before final export.
- Trim scene hold-frames to match voiceover pacing.
- Add subtle zoom/ken-burns in CapCut if scenes feel too static.
`;

  const handleExport = async () => {
    setExporting(true);
    try {
      const zip = new JSZip();
      const manifest = buildManifest();

      // /metadata
      zip.file('metadata/manifest.json', JSON.stringify(manifest, null, 2));
      zip.file('metadata/capcut_assembly_guide.txt', buildCapCutGuide());

      // /prompts — per scene (zero-padded for sorting)
      scenes.forEach((s, i) => {
        const num = String(i + 1).padStart(2, '0');
        const presence = SCENE_WORKER_PRESENCE[i];
        zip.file(`prompts/scene_${num}_image_prompt.txt`, s.imagePrompt);
        zip.file(`prompts/scene_${num}_motion_prompt.txt`, s.motionPrompt);
        zip.file(`prompts/scene_${num}_narration.txt`, s.narration);
        zip.file(`prompts/scene_${num}_notes.txt`, 
          `Title: ${s.title}\nWorker Presence: ${presence?.level || 'unknown'} — ${presence?.description || ''}\nWorker Cues: ${(s.workerCues || []).join('; ')}\n\nContinuity Notes:\n${s.notes}`
        );
      });

      // /prompts — per transition (zero-padded)
      transitions.forEach((t) => {
        const label = `${String(t.startSceneIndex + 1).padStart(2, '0')}_to_${String(t.endSceneIndex + 1).padStart(2, '0')}`;
        zip.file(`prompts/transition_${label}_motion.txt`, t.motionPrompt);
        zip.file(`prompts/transition_${label}_settings.json`, JSON.stringify({
          speed: `x${t.speedMultiplier}`,
          settings: t.motionSettings,
        }, null, 2));
      });

      // /audio
      if (hasScript) {
        zip.file('audio/narration_script.txt', audio.fullScript);
        zip.file('audio/scene_narrations.json', JSON.stringify(audio.sceneNarrations, null, 2));
        zip.file('audio/ambience_notes.json', JSON.stringify(audio.ambienceNotes, null, 2));
        zip.file('audio/sfx_notes.json', JSON.stringify(audio.sfxNotes, null, 2));
      }

      // /audio — TTS files
      const audioPromises = (audio.generatedAudioUrls || []).map(async (url, i) => {
        if (!url) return;
        try {
          const resp = await fetch(url);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const blob = await resp.blob();
          const ext = blob.type.includes('mp3') ? 'mp3' : 'wav';
          zip.file(`audio/scene_${String(i + 1).padStart(2, '0')}_narration.${ext}`, blob);
        } catch (err) {
          console.warn(`Could not download audio for scene ${i + 1}:`, err);
          zip.file(`audio/scene_${String(i + 1).padStart(2, '0')}_url.txt`, url);
        }
      });

      // /scenes — images (zero-padded)
      const imagePromises = scenes.map(async (s, i) => {
        if (!s.generatedImageUrl) return;
        try {
          const resp = await fetch(s.generatedImageUrl);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const blob = await resp.blob();
          zip.file(`scenes/scene_${String(i + 1).padStart(2, '0')}.png`, blob);
        } catch (err) {
          console.warn(`Could not download scene ${i + 1}:`, err);
          zip.file(`scenes/scene_${String(i + 1).padStart(2, '0')}_url.txt`, s.generatedImageUrl!);
        }
      });

      // /transitions — videos (zero-padded)
      const videoPromises = transitions.map(async (t) => {
        if (!t.generatedVideoUrl) return;
        try {
          const resp = await fetch(t.generatedVideoUrl);
          if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
          const blob = await resp.blob();
          zip.file(`transitions/transition_${String(t.startSceneIndex + 1).padStart(2, '0')}_to_${String(t.endSceneIndex + 1).padStart(2, '0')}.mp4`, blob);
        } catch (err) {
          console.warn(`Could not download transition:`, err);
          zip.file(`transitions/transition_${String(t.startSceneIndex + 1).padStart(2, '0')}_to_${String(t.endSceneIndex + 1).padStart(2, '0')}_url.txt`, t.generatedVideoUrl!);
        }
      });

      // Asset URL index
      const assetIndex: string[] = ['ASSET URL INDEX', '===============', ''];
      scenes.forEach((s, i) => {
        if (s.generatedImageUrl) assetIndex.push(`Scene ${String(i + 1).padStart(2, '0')}: ${s.generatedImageUrl}`);
      });
      assetIndex.push('');
      transitions.forEach((t) => {
        if (t.generatedVideoUrl) assetIndex.push(`Transition ${t.startSceneIndex + 1}→${t.endSceneIndex + 1}: ${t.generatedVideoUrl}`);
      });
      assetIndex.push('');
      (audio.generatedAudioUrls || []).forEach((url, i) => {
        if (url) assetIndex.push(`Audio Scene ${i + 1}: ${url}`);
      });
      zip.file('metadata/asset_urls.txt', assetIndex.join('\n'));

      toast.info('Downloading assets into ZIP…');
      await Promise.all([...imagePromises, ...videoPromises, ...audioPromises]);

      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${name.replace(/\s+/g, '_')}_bunker_export.zip`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('ZIP bundle exported');
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
        <p className="text-sm text-muted-foreground">Export as a ZIP bundle ready for CapCut assembly.</p>
      </div>

      {/* Readiness checklist */}
      <WorkshopCard>
        <h2 className="font-bold text-sm mb-3">Export Readiness</h2>
        <div className="space-y-2 text-xs">
          <div className="flex items-center gap-2">
            {sceneImages === 9 ? <Check className="w-4 h-4 text-step-complete" /> : <Image className="w-4 h-4 text-muted-foreground" />}
            <span className={sceneImages === 9 ? 'text-step-complete font-semibold' : 'text-muted-foreground'}>Scene Images: {sceneImages}/9</span>
          </div>
          <div className="flex items-center gap-2">
            {transitionClips === 8 ? <Check className="w-4 h-4 text-step-complete" /> : <Film className="w-4 h-4 text-muted-foreground" />}
            <span className={transitionClips === 8 ? 'text-step-complete font-semibold' : 'text-muted-foreground'}>Transition Clips: {transitionClips}/8</span>
          </div>
          <div className="flex items-center gap-2">
            {hasScript ? <Check className="w-4 h-4 text-step-complete" /> : <FileText className="w-4 h-4 text-muted-foreground" />}
            <span className={hasScript ? 'text-step-complete font-semibold' : 'text-muted-foreground'}>Narration Script: {hasScript ? 'Ready' : 'Missing'}</span>
          </div>
          <div className="flex items-center gap-2">
            {hasAudioFiles ? <Check className="w-4 h-4 text-step-complete" /> : <Music className="w-4 h-4 text-muted-foreground" />}
            <span className={hasAudioFiles ? 'text-step-complete font-semibold' : 'text-muted-foreground'}>TTS Audio: {hasAudioFiles ? 'Generated' : 'Not generated'}</span>
          </div>
          {continuityFlags.length > 0 && (
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-500" />
              <span className="text-yellow-500">Continuity Issues: {continuityFlags.length}</span>
            </div>
          )}
        </div>
      </WorkshopCard>

      {/* Project info */}
      <WorkshopCard>
        <h2 className="font-bold text-sm mb-3">Project Details</h2>
        <div className="space-y-1.5 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Project</span><span className="font-semibold">{name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Concept</span><span className="font-semibold text-right max-w-[60%] truncate">{selectedIdea?.title}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Environment</span><span className="font-semibold capitalize">{selectedIdea?.environmentType}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Quality</span><span className="font-semibold capitalize">{qualityMode}</span></div>
        </div>
      </WorkshopCard>

      {/* ZIP structure */}
      <WorkshopCard>
        <h2 className="font-bold text-sm mb-3">ZIP Bundle Structure</h2>
        <div className="space-y-1.5 text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /scenes — scene_01.png → scene_09.png</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /transitions — transition_01_to_02.mp4 → …_08_to_09.mp4</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /prompts — image + motion + narration per scene & transition</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /audio — TTS files + script + ambience + SFX notes</div>
          <div className="flex items-center gap-2"><FolderOpen className="w-3 h-3 text-primary" /> /metadata — manifest.json + capcut_assembly_guide.txt</div>
        </div>
      </WorkshopCard>

      {/* Models */}
      <WorkshopCard>
        <h2 className="font-bold text-sm mb-3">Google Models Used</h2>
        <div className="flex flex-wrap gap-2">
          <ModelBadge label="Plan" model={models.planning} />
          <ModelBadge label="Image" model={models.image} />
          <ModelBadge label="Video" model={models.video} />
          <ModelBadge label="TTS" model={models.tts} />
        </div>
      </WorkshopCard>

      {/* Limitations */}
      <WorkshopCard>
        <div className="flex items-start gap-2">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <div className="text-xs space-y-1.5">
            <p className="font-semibold">Provider Capabilities</p>
            <p className="text-muted-foreground">• <span className="text-foreground">Imagen 4:</span> Scene-aware worker rendering. STYLE_IMAGE continuity reference.</p>
            <p className="text-muted-foreground">• <span className="text-foreground">Veo 3.1:</span> Start frame = real. End frame = visual guide only.</p>
            <p className="text-muted-foreground">• <span className="text-foreground">Export:</span> Editor-ready assets for CapCut. Not an auto-edited timeline.</p>
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
