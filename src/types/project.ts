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

export const REPAIR_SCENES: number[] = [1, 2, 3, 4, 5, 6, 7];

export const ATMOSPHERE_ONLY_SCENES: number[] = [0, 8];

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
  hasRepairActivity: boolean;
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
 * x1 BUNKER MODE — near-static, ultra-constrained, closest to manual workflow.
 * motionStrength=5: almost zero motion
 * cameraIntensity=0: absolutely locked camera
 * morphSuppression=100: zero tolerance for morphing
 * continuityStrictness=100: maximum identity preservation
 */
export const DEFAULT_MOTION_SETTINGS: Record<SpeedMultiplier, MotionSettings> = {
  1: { motionStrength: 5,  cameraIntensity: 0,  realismPriority: 100, morphSuppression: 100, targetStrictness: 100, continuityStrictness: 100 },
  2: { motionStrength: 20, cameraIntensity: 3,  realismPriority: 95,  morphSuppression: 95,  targetStrictness: 90,  continuityStrictness: 97 },
  3: { motionStrength: 35, cameraIntensity: 8,  realismPriority: 85,  morphSuppression: 85,  targetStrictness: 80,  continuityStrictness: 90 },
  4: { motionStrength: 55, cameraIntensity: 15, realismPriority: 75,  morphSuppression: 70,  targetStrictness: 65,  continuityStrictness: 75 },
};

export interface AudioData {
  fullScript: string;
  sceneNarrations: string[];
  ambienceNotes: string[];
  sfxNotes: string[];
  ttsReady: boolean;
  generatedAudioUrls: string[];
  fullAudioUrl?: string;
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

export function requiresWorkerCues(startSceneIndex: number, endSceneIndex: number): boolean {
  return REPAIR_SCENES.includes(endSceneIndex);
}

export function getWorkerCuesForScene(sceneIndex: number): string[] {
  const cueMap: Record<number, string[]> = {
    1: [
      'construction workers arriving at the site carrying tools and materials',
      'worker silhouettes inspecting the damaged structure',
      'portable work lights being set up by crew members',
      'hard hats and safety equipment visible on workers',
    ],
    2: [
      'workers actively removing debris with heavy equipment',
      'welding sparks from workers repairing steel reinforcement',
      'scaffolding with workers on it around damaged sections',
      'construction crew operating power tools and welding equipment',
    ],
    3: [
      'scaffolding nearly complete with minimal worker presence',
      'fresh concrete and clean metal surfaces',
      'finishing equipment positioned nearby',
      'organized construction materials and tools',
    ],
    4: [
      'workers prying open the heavy bunker entrance door',
      'crew members with portable generators and work lights at entrance',
      'worker silhouettes entering the dark underground space',
      'safety ropes and equipment being used by the team',
    ],
    5: [
      'workers installing lighting systems on interior ceiling',
      'construction crew repairing walls and laying flooring',
      'workers running cables and electrical conduit',
      'interior scaffolding with workers actively operating',
    ],
    6: [
      'minimal worker presence with finishing tools',
      'lighting fixtures being mounted',
      'polished surfaces with protective covers partially removed',
    ],
    7: [
      'design furniture being positioned',
      'decorative wall panels mounted',
      'modern lighting installed and active',
    ],
  };
  return cueMap[sceneIndex] || [];
}

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
