import { supabase } from '@/integrations/supabase/client';
import type { ProjectState, QualityMode, WorkflowStep } from '@/types/project';
import { SCENE_TITLES } from '@/types/project';

const initialScenes = SCENE_TITLES.map((title, i) => ({
  index: i,
  title,
  imagePrompt: '',
  motionPrompt: '',
  notes: '',
  narration: '',
  approved: false,
  generating: false,
}));

export interface SavedProject {
  id: string;
  name: string;
  quality_mode: string;
  current_step: number;
  updated_at: string;
  created_at: string;
}

export async function loadProjectList(): Promise<SavedProject[]> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const { data, error } = await supabase
    .from('projects')
    .select('id, name, quality_mode, current_step, updated_at, created_at')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function loadProject(id: string): Promise<ProjectState> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;

  return {
    name: data.name,
    referenceNotes: data.reference_notes || '',
    qualityMode: data.quality_mode as QualityMode,
    currentStep: data.current_step as WorkflowStep,
    ideas: (data.ideas as any[]) || [],
    selectedIdeaIndex: data.selected_idea_index,
    scenes: (data.scenes as any[])?.length > 0 ? (data.scenes as any[]) : initialScenes,
    transitions: (data.transitions as any[]) || [],
    audio: {
      fullScript: '',
      sceneNarrations: Array(9).fill(''),
      ambienceNotes: Array(9).fill(''),
      sfxNotes: Array(9).fill(''),
      ttsReady: false,
      generatedAudioUrls: Array(9).fill(''),
      fullAudioUrl: undefined,
      audioGenerated: false,
      ...((data.audio as any) || {}),
    },
    continuityFlags: (data.continuity_flags as any[]) || [],
  };
}

export async function saveProject(id: string | null, state: ProjectState): Promise<string> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');

  const payload = {
    user_id: user.id,
    name: state.name,
    reference_notes: state.referenceNotes,
    quality_mode: state.qualityMode,
    current_step: state.currentStep,
    selected_idea_index: state.selectedIdeaIndex,
    ideas: state.ideas as any,
    scenes: state.scenes.map(s => ({ ...s, generating: false })) as any,
    transitions: state.transitions.map(t => ({ ...t, generating: false })) as any,
    audio: state.audio as any,
    continuity_flags: state.continuityFlags as any,
  };

  if (id) {
    const { error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', id);
    if (error) throw error;
    return id;
  } else {
    const { data, error } = await supabase
      .from('projects')
      .insert(payload)
      .select('id')
      .single();
    if (error) throw error;
    return data.id;
  }
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase
    .from('projects')
    .delete()
    .eq('id', id);
  if (error) throw error;
}
