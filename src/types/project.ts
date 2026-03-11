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

export const SCENE_TITLES = [
  'Before',
  'Arrival',
  'Exterior Work Start',
  'Exterior Near Completion',
  'Entering Underground',
  'Interior Work In Progress',
  'Interior Finalization',
  'Interior Design Transformation',
  'Final Reveal',
] as const;

/**
 * Scenes where visible structural repair happens.
 * These scenes REQUIRE worker/tool presence cues in prompts.
 */
export const REPAIR_SCENES: number[] = [2, 3, 5, 6, 7];

/**
 * Scenes that are atmosphere-only (no visible structural change).
 * Only dust, light, ambience allowed — no self-repair.
 */
export const ATMOSPHERE_ONLY_SCENES: number[] = [0, 1, 4, 8];

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
  /** Whether this scene involves visible structural repair */
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
 * If yes, worker/tool cues are required. If no, only atmosphere is allowed.
 */
export function requiresWorkerCues(startSceneIndex: number, endSceneIndex: number): boolean {
  return REPAIR_SCENES.includes(endSceneIndex);
}

/**
 * Get appropriate worker cues for a repair scene.
 */
export function getWorkerCuesForScene(sceneIndex: number): string[] {
  const cueMap: Record<number, string[]> = {
    2: ['scaffolding erected around exterior', 'power tools and welding equipment visible', 'construction materials stacked nearby'],
    3: ['scaffolding nearly complete', 'fresh concrete patches visible', 'equipment positioned for finishing work'],
    5: ['interior scaffolding and work lights', 'debris removal equipment', 'cable trays being installed'],
    6: ['interior finishing tools', 'paint equipment', 'lighting fixtures being mounted'],
    7: ['design furniture being positioned', 'decorative panels mounted', 'final lighting adjustments'],
  };
  return cueMap[sceneIndex] || [];
}

/**
 * Validate that a motion prompt does not imply magical self-repair
 * without worker presence in a repair scene.
 */
export function validateRepairLogic(
  startSceneIndex: number,
  endSceneIndex: number,
  motionPrompt: string
): ContinuityFlag | null {
  if (!requiresWorkerCues(startSceneIndex, endSceneIndex)) return null;

  const magicTerms = ['self-repair', 'magically', 'instantly', 'transforms on its own', 'repairs itself'];
  const hasWorkerRef = /worker|tool|scaffold|equipment|welding|construction|machinery|cable|debris/i.test(motionPrompt);
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
