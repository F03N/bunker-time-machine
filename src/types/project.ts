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
    // Scene 2 — Arrival: crew arrives, carrying tools, inspecting, setting up lighting
    1: ['tools and materials laid out at entrance', 'portable work lights being set up', 'hard hats and safety equipment visible'],
    // Scene 3 — Work in Progress (Exterior): debris removal, welding, reinforcing
    2: ['debris being cleared with heavy equipment', 'welding sparks on steel reinforcement', 'scaffolding erected around damaged sections', 'power tools and welding equipment active'],
    // Scene 4 — Exterior Near Completion: clean surfaces, fresh concrete
    3: ['scaffolding nearly complete', 'fresh concrete and clean metal surfaces', 'finishing equipment positioned', 'organized construction materials'],
    // Scene 5 — Entering Underground: workers open bunker entrance
    4: ['bunker entrance pried open with tools', 'portable generators and work lights at entrance', 'safety ropes and equipment visible'],
    // Scene 6 — Interior Work: installing lighting, wall repairs, flooring, cables
    5: ['interior scaffolding and work lights active', 'wall repair materials and tools', 'cable trays and electrical conduit being installed', 'flooring materials stacked'],
    // Scene 7 — Interior Finalization: clean, modern, polished
    6: ['finishing tools and paint equipment', 'lighting fixtures being mounted', 'polished surfaces with protective covers partially removed'],
    // Scene 8 — Interior Design Transformation: furniture, decorative panels
    7: ['design furniture being positioned', 'decorative wall panels mounted', 'modern lighting installed and active', 'final adjustments with hand tools'],
  };
  return cueMap[sceneIndex] || [];
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
