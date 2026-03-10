import { create } from 'zustand';
import type { ProjectState, WorkflowStep, QualityMode, BunkerIdea, SceneData, TransitionPair, AudioData, ContinuityFlag, SpeedMultiplier, MotionPreset, TransitionFrameMode, MotionSettings, DEFAULT_MOTION_SETTINGS } from '@/types/project';
import { SCENE_TITLES } from '@/types/project';

interface ProjectStore extends ProjectState {
  setName: (name: string) => void;
  setReferenceNotes: (notes: string) => void;
  setQualityMode: (mode: QualityMode) => void;
  setCurrentStep: (step: WorkflowStep) => void;
  goToNextStep: () => void;
  goToPrevStep: () => void;
  setIdeas: (ideas: BunkerIdea[]) => void;
  selectIdea: (index: number) => void;
  setScenes: (scenes: SceneData[]) => void;
  updateScene: (index: number, updates: Partial<SceneData>) => void;
  setTransitions: (transitions: TransitionPair[]) => void;
  updateTransition: (index: number, updates: Partial<TransitionPair>) => void;
  setAudio: (audio: Partial<AudioData>) => void;
  setContinuityFlags: (flags: ContinuityFlag[]) => void;
  resetProject: () => void;
}

const initialScenes: SceneData[] = SCENE_TITLES.map((title, i) => ({
  index: i,
  title,
  imagePrompt: '',
  motionPrompt: '',
  notes: '',
  narration: '',
  approved: false,
  generating: false,
}));

const initialState: ProjectState = {
  name: '',
  referenceNotes: '',
  qualityMode: 'balanced',
  currentStep: 1,
  ideas: [],
  selectedIdeaIndex: null,
  scenes: initialScenes,
  transitions: [],
  audio: {
    fullScript: '',
    sceneNarrations: Array(9).fill(''),
    ambienceNotes: Array(9).fill(''),
    sfxNotes: Array(9).fill(''),
    ttsReady: false,
  },
  continuityFlags: [],
};

export const useProjectStore = create<ProjectStore>((set) => ({
  ...initialState,

  setName: (name) => set({ name }),
  setReferenceNotes: (notes) => set({ referenceNotes: notes }),
  setQualityMode: (mode) => set({ qualityMode: mode }),
  setCurrentStep: (step) => set({ currentStep: step }),

  goToNextStep: () => set((s) => ({
    currentStep: Math.min(8, s.currentStep + 1) as WorkflowStep,
  })),

  goToPrevStep: () => set((s) => ({
    currentStep: Math.max(1, s.currentStep - 1) as WorkflowStep,
  })),

  setIdeas: (ideas) => set({ ideas }),
  selectIdea: (index) => set({ selectedIdeaIndex: index }),

  setScenes: (scenes) => set({ scenes }),
  updateScene: (index, updates) => set((s) => ({
    scenes: s.scenes.map((sc, i) => i === index ? { ...sc, ...updates } : sc),
  })),

  setTransitions: (transitions) => set({ transitions }),
  updateTransition: (index, updates) => set((s) => ({
    transitions: s.transitions.map((tr, i) => i === index ? { ...tr, ...updates } : tr),
  })),

  setAudio: (audio) => set((s) => ({
    audio: { ...s.audio, ...audio },
  })),

  setContinuityFlags: (flags) => set({ continuityFlags: flags }),

  resetProject: () => set(initialState),
}));
