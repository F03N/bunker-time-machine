import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useProjectStore } from '@/store/useProjectStore';
import { StepProgress } from '@/components/StepProgress';
import { STEP_LABELS } from '@/types/project';
import { ProjectSetup } from '@/components/steps/ProjectSetup';
import { IdeaGenerator } from '@/components/steps/IdeaGenerator';
import { ScenePlan } from '@/components/steps/ScenePlan';
import { SceneImageChain } from '@/components/steps/SceneImageChain';
import { ContinuityReview } from '@/components/steps/ContinuityReview';
import { PairTransitionStudio } from '@/components/steps/PairTransitionStudio';
import { AudioVoiceover } from '@/components/steps/AudioVoiceover';
import { ExportCenter } from '@/components/steps/ExportCenter';
import { AuthPage } from '@/components/AuthPage';
import { ProjectList } from '@/components/ProjectList';
import { loadProject, saveProject } from '@/lib/persistence';
import { toast } from 'sonner';
import { ArrowLeft, Save } from 'lucide-react';
import type { Session } from '@supabase/supabase-js';

const STEP_COMPONENTS = {
  1: ProjectSetup,
  2: IdeaGenerator,
  3: ScenePlan,
  4: SceneImageChain,
  5: ContinuityReview,
  6: PairTransitionStudio,
  7: AudioVoiceover,
  8: ExportCenter,
} as const;

type AppView = 'auth' | 'list' | 'editor';

const Index = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [view, setView] = useState<AppView>('auth');
  const [saving, setSaving] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const store = useProjectStore();
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout>>();

  // Auth listener
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setView(session ? 'list' : 'auth');
      setCheckingAuth(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) setView('auth');
    });

    return () => subscription.unsubscribe();
  }, []);

  // Auto-save on state changes (debounced 3s)
  const autoSave = useCallback(async () => {
    if (!store.projectId || !store.name.trim()) return;
    try {
      await saveProject(store.projectId, store.getState());
    } catch {
      // Silent fail for auto-save
    }
  }, [store.projectId, store]);

  useEffect(() => {
    if (view !== 'editor' || !store.projectId) return;
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(autoSave, 3000);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [store.currentStep, store.name, store.scenes, store.transitions, store.ideas, store.selectedIdeaIndex, store.audio, store.qualityMode]);

  const handleManualSave = async () => {
    setSaving(true);
    try {
      const id = await saveProject(store.projectId, store.getState());
      store.setProjectId(id);
      toast.success('Project saved');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleNewProject = () => {
    store.resetProject();
    setView('editor');
  };

  const handleLoadProject = async (id: string) => {
    try {
      const state = await loadProject(id);
      store.loadState(state);
      store.setProjectId(id);
      setView('editor');
    } catch (err) {
      toast.error('Failed to load project');
    }
  };

  const handleBackToList = async () => {
    // Save before leaving
    if (store.projectId && store.name.trim()) {
      try {
        await saveProject(store.projectId, store.getState());
      } catch { /* ignore */ }
    }
    setView('list');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    store.resetProject();
    setView('auth');
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-primary font-bold text-2xl tracking-tight animate-pulse">W&W</span>
      </div>
    );
  }

  if (view === 'auth') {
    return <AuthPage onAuth={() => setView('list')} />;
  }

  if (view === 'list') {
    return <ProjectList onNewProject={handleNewProject} onLoadProject={handleLoadProject} onLogout={handleLogout} />;
  }

  const StepComponent = STEP_COMPONENTS[store.currentStep];

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <div className="flex items-center gap-2">
            <button onClick={handleBackToList} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-primary font-bold text-sm tracking-tight">BTL</span>
            {store.name && <span className="text-xs text-muted-foreground truncate max-w-[100px]">/ {store.name}</span>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleManualSave}
              disabled={saving || !store.name.trim()}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving…' : 'Save'}
            </button>
            <span className="text-xs text-muted-foreground font-semibold">
              {STEP_LABELS[store.currentStep]}
            </span>
          </div>
        </div>
        <StepProgress />
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <StepComponent />
      </main>
    </div>
  );
};

export default Index;
