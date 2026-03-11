export type QualityMode = 'fast' | 'balanced' | 'quality';

export type MotionPreset = 'strict-frame-match' | 'minimal-motion' | 'soft-construction' | 'controlled-interior' | 'final-reveal-polish';

export type SpeedMultiplier = 1 | 2 | 3 | 4;

export type TransitionFrameMode = 'start-only' | 'start-end' | 'guided-target';

export type WorkflowStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export const STEP_LABELS: Record<WorkflowStep, string> = {
  1: 'Project Setup',
  2: 'Idea Generator',
  3: 'Scene Plan',
  4: 'Scene Image Chain',
  5: 'Continuity Review',
  6: 'Pair Transition Studio',
  7: 'Audio / Voiceover',
  8: 'Export Center',
};

/**
 * 9-scene structure matching the master prompt EXACTLY.
 */
export const SCENE_TITLES = [
  'Before (Damaged State)',
  'Arrival',
  'Work in Progress (Exterior Start)',
  'Exterior Near Completion',
  'Entering Underground',
  'Interior Work In Progress',
  'Interior Finalization',
  'Interior Design Transformation',
  'Final After (Cinematic Reveal)',
] as const;

/**
 * Scenes where construction crew / workers / tools are present.
 * Per master prompt: Scenes 2–8 (indices 1–7) have workers.
 * Scene 1 (Before) and Scene 9 (Final After) are atmosphere-only.
 */
export const REPAIR_SCENES: number[] = [1, 2, 3, 4, 5, 6, 7];

/**
 * Scenes that are atmosphere-only (no workers, no active construction).
 * Scene 1 — abandoned, no workers.
 * Scene 9 — fully restored, cinematic reveal, no workers.
 */
export const ATMOSPHERE_ONLY_SCENES: number[] = [0, 8];

/**
 * Scene-aware worker presence level per the master prompt.
 * 'required'  — master prompt explicitly describes worker-driven activity
 * 'optional'  — workers may appear but are not the focus
 * 'none'      — no workers present (atmosphere-only)
 */
export type WorkerPresence = 'required' | 'optional' | 'none';

export const SCENE_WORKER_PRESENCE: Record<number, { level: WorkerPresence; description: string }> = {
  0: { level: 'none',     description: 'No workers. Abandoned, neglected atmosphere only.' },
  1: { level: 'required', description: 'Construction crew arrives. Workers carrying tools, inspecting site, setting up lighting.' },
  2: { level: 'required', description: 'Active worker-driven repair. Debris removal, welding, reinforcing damaged sections.' },
  3: { level: 'optional', description: 'Workers optional. Mostly organized near-complete exterior with clean surfaces.' },
  4: { level: 'required', description: 'Workers opening or accessing bunker entrance. Active entry scene.' },
  5: { level: 'required', description: 'Worker-driven interior repair. Installing lighting, wall repairs, flooring, cables.' },
  6: { level: 'optional', description: 'Workers minimal. Clean modern interior, finishing touches.' },
  7: { level: 'optional', description: 'Workers usually absent. Design reveal with furniture and decor.' },
  8: { level: 'none',     description: 'No workers. Cinematic reveal of fully restored space.' },
};

export interface ModelConfig {
  planning: string;
  planningFast: string;
  imageDraft: string;
  imageBalanced: string;
  imageUltra: string;
  videoDraft: string;
  videoFinal: string;
  tts: string;
  ttsFast: string;
}

export const GOOGLE_MODELS: ModelConfig = {
  planning: 'gemini-2.5-pro',
  planningFast: 'gemini-2.5-flash',
  imageDraft: 'imagen-4.0-fast-generate-001',
  imageBalanced: 'imagen-4.0-generate-001',
  imageUltra: 'imagen-4.0-ultra-generate-001',
  videoDraft: 'veo-3.1-fast-generate-preview',
  videoFinal: 'veo-3.1-generate-preview',
  tts: 'gemini-2.5-pro-preview-tts',
  ttsFast: 'gemini-2.5-flash-preview-tts',
};

export interface BunkerIdea {
  id: number;
  title: string;
  location: string;
  era: string;
  description: string;
  visualHook: string;
  /** The environment type from the master prompt (mountain, desert, coastal, etc.) */
  environmentType: string;
}

export interface SceneData {
  index: number;
  title: string;
  imagePrompt: string;
  motionPrompt: string;
  notes: string;
  narration: string;
  generatedImageUrl?: string;
  approved: boolean;
  generating: boolean;
  /** Whether this scene involves visible structural repair / workers */
  hasRepairActivity: boolean;
  /** Worker/tool cues injected into the prompt */
  workerCues: string[];
}

export interface TransitionPair {
  index: number;
  startSceneIndex: number;
  endSceneIndex: number;
  motionPrompt: string;
  motionPreset: MotionPreset;
  speedMultiplier: SpeedMultiplier;
  frameMode: TransitionFrameMode;
  generatedVideoUrl?: string;
  approved: boolean;
  generating: boolean;
  motionSettings: MotionSettings;
}

export interface MotionSettings {
  motionStrength: number;
  cameraIntensity: number;
  realismPriority: number;
  morphSuppression: number;
  targetStrictness: number;
  continuityStrictness: number;
}

/**
 * x1 is the true bunker-safe default:
 *   minimal motion, maximum realism, strongest morph suppression, strictest continuity.
 */
export const DEFAULT_MOTION_SETTINGS: Record<SpeedMultiplier, MotionSettings> = {
  1: { motionStrength: 12, cameraIntensity: 1, realismPriority: 98, morphSuppression: 99, targetStrictness: 95, continuityStrictness: 99 },
  2: { motionStrength: 25, cameraIntensity: 5, realismPriority: 90, morphSuppression: 90, targetStrictness: 85, continuityStrictness: 95 },
  3: { motionStrength: 40, cameraIntensity: 10, realismPriority: 80, morphSuppression: 80, targetStrictness: 75, continuityStrictness: 85 },
  4: { motionStrength: 60, cameraIntensity: 20, realismPriority: 70, morphSuppression: 65, targetStrictness: 60, continuityStrictness: 70 },
};

export interface AudioData {
  fullScript: string;
  sceneNarrations: string[];
  ambienceNotes: string[];
  sfxNotes: string[];
  ttsReady: boolean;
  /** URLs of generated audio files per scene (index-matched to sceneNarrations) */
  generatedAudioUrls: string[];
  /** URL of full combined narration audio (if generated) */
  fullAudioUrl?: string;
  /** Whether TTS audio has been generated (not just script text) */
  audioGenerated: boolean;
}

export interface ProjectState {
  name: string;
  referenceNotes: string;
  qualityMode: QualityMode;
  currentStep: WorkflowStep;
  ideas: BunkerIdea[];
  selectedIdeaIndex: number | null;
  scenes: SceneData[];
  transitions: TransitionPair[];
  audio: AudioData;
  continuityFlags: ContinuityFlag[];
}

export interface ContinuityFlag {
  sceneIndex: number;
  type: 'identity' | 'angle' | 'framing' | 'environment' | 'progression' | 'worker-logic';
  message: string;
  severity: 'warning' | 'error';
}

export function getActiveModels(quality: QualityMode) {
  return {
    planning: GOOGLE_MODELS.planning,
    image: quality === 'fast' ? GOOGLE_MODELS.imageDraft : quality === 'balanced' ? GOOGLE_MODELS.imageBalanced : GOOGLE_MODELS.imageUltra,
    video: quality === 'fast' ? GOOGLE_MODELS.videoDraft : GOOGLE_MODELS.videoFinal,
    tts: quality === 'fast' ? GOOGLE_MODELS.ttsFast : GOOGLE_MODELS.tts,
  };
}

/**
 * Check if a scene transition involves visible structural repair.
 * If the END scene is a repair scene, workers/tools must be present.
 */
export function requiresWorkerCues(startSceneIndex: number, endSceneIndex: number): boolean {
  return REPAIR_SCENES.includes(endSceneIndex);
}

/**
 * Get appropriate worker/tool/equipment cues for each scene.
 * Per master prompt — no actual people in image prompts (generators can't render them),
 * but show tools, materials, equipment, scaffolding to imply worker presence.
 */
export function getWorkerCuesForScene(sceneIndex: number): string[] {
  const cueMap: Record<number, string[]> = {
    // Scene 2 — Arrival: crew arrives with tools, inspecting, setting up
    1: [
      'construction workers arriving at the site carrying tools and materials',
      'worker silhouettes inspecting the damaged structure',
      'portable work lights being set up by crew members',
      'hard hats and safety equipment visible on workers',
    ],
    // Scene 3 — Work in Progress (Exterior): active worker-driven repair
    2: [
      'workers actively removing debris with heavy equipment',
      'welding sparks from workers repairing steel reinforcement',
      'scaffolding with workers on it around damaged sections',
      'construction crew operating power tools and welding equipment',
    ],
    // Scene 4 — Exterior Near Completion: workers optional, mostly organized
    3: [
      'scaffolding nearly complete with minimal worker presence',
      'fresh concrete and clean metal surfaces',
      'finishing equipment positioned nearby',
      'organized construction materials and tools',
    ],
    // Scene 5 — Entering Underground: workers opening bunker entrance
    4: [
      'workers prying open the heavy bunker entrance door',
      'crew members with portable generators and work lights at entrance',
      'worker silhouettes entering the dark underground space',
      'safety ropes and equipment being used by the team',
    ],
    // Scene 6 — Interior Work: worker-driven installation
    5: [
      'workers installing lighting systems on interior ceiling',
      'construction crew repairing walls and laying flooring',
      'workers running cables and electrical conduit',
      'interior scaffolding with workers actively operating',
    ],
    // Scene 7 — Interior Finalization: workers minimal, finishing touches
    6: [
      'minimal worker presence with finishing tools',
      'lighting fixtures being mounted',
      'polished surfaces with protective covers partially removed',
    ],
    // Scene 8 — Interior Design Transformation: workers usually absent
    7: [
      'design furniture being positioned',
      'decorative wall panels mounted',
      'modern lighting installed and active',
    ],
  };
  return cueMap[sceneIndex] || [];
}

/**
 * Get the image prompt worker instruction for a specific scene.
 * Instead of a global "no people" rule, this is scene-aware.
 */
export function getWorkerPromptInstruction(sceneIndex: number): string {
  const presence = SCENE_WORKER_PRESENCE[sceneIndex];
  if (!presence) return '';
  
  switch (presence.level) {
    case 'required':
      return 'Include construction workers in this scene — worker silhouettes, partial figures, or clearly visible crew members actively working. If full human rendering risks quality, use worker silhouettes, partial body shots from behind, or figures in shadow/backlight. Workers must be visibly present and driving the activity.';
    case 'optional':
      return 'Workers may appear minimally — distant silhouettes or partial presence is acceptable. Focus on the results of their work (clean surfaces, organized materials, installed fixtures) rather than active construction.';
    case 'none':
      return 'No workers present in this scene. Show only the environmental state — atmosphere, lighting, and structural condition.';
  }
}

/**
 * Validate that a motion prompt does not imply magical self-repair
 * without worker/tool presence in a repair scene.
 */
export function validateRepairLogic(
  startSceneIndex: number,
  endSceneIndex: number,
  motionPrompt: string
): ContinuityFlag | null {
  if (!requiresWorkerCues(startSceneIndex, endSceneIndex)) return null;

  const magicTerms = ['self-repair', 'magically', 'instantly', 'transforms on its own', 'repairs itself', 'spontaneously'];
  const hasWorkerRef = /worker|tool|scaffold|equipment|welding|construction|machinery|cable|debris|paint|mount|drill|hammer|generator|light.?set/i.test(motionPrompt);
  const hasMagicRef = magicTerms.some(t => motionPrompt.toLowerCase().includes(t));

  if (hasMagicRef || !hasWorkerRef) {
    return {
      sceneIndex: endSceneIndex,
      type: 'worker-logic',
      message: `Transition ${startSceneIndex + 1}→${endSceneIndex + 1}: Visible repair requires worker/tool presence cues. No magical self-repair allowed.`,
      severity: 'error',
    };
  }
  return null;
}
