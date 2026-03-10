import { useState, useEffect } from 'react';
import { loadProjectList, deleteProject, type SavedProject } from '@/lib/persistence';
import { WorkshopCard } from '@/components/WorkshopCard';
import { Button } from '@/components/ui/button';
import { Plus, FolderOpen, Trash2, LogOut, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { STEP_LABELS, type WorkflowStep } from '@/types/project';

interface ProjectListProps {
  onNewProject: () => void;
  onLoadProject: (id: string) => void;
  onLogout: () => void;
}

export function ProjectList({ onNewProject, onLoadProject, onLogout }: ProjectListProps) {
  const [projects, setProjects] = useState<SavedProject[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProjects = async () => {
    try {
      const list = await loadProjectList();
      setProjects(list);
    } catch (err) {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProjects(); }, []);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Delete this project?')) return;
    try {
      await deleteProject(id);
      setProjects(p => p.filter(proj => proj.id !== id));
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete');
    }
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-3">
          <span className="text-primary font-bold text-sm tracking-tight">W&W</span>
          <button onClick={onLogout} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold">Projects</h1>
          <Button onClick={onNewProject} size="sm" className="touch-target">
            <Plus className="w-4 h-4 mr-1" /> New Project
          </Button>
        </div>

        {loading ? (
          <WorkshopCard>
            <p className="text-sm text-muted-foreground text-center py-8">Loading projects…</p>
          </WorkshopCard>
        ) : projects.length === 0 ? (
          <WorkshopCard>
            <div className="text-center py-12">
              <FolderOpen className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground mb-4">No projects yet</p>
              <Button onClick={onNewProject} className="touch-target">
                <Plus className="w-4 h-4 mr-1" /> Create Your First Project
              </Button>
            </div>
          </WorkshopCard>
        ) : (
          <div className="flex flex-col gap-3">
            {projects.map((proj) => (
              <button
                key={proj.id}
                onClick={() => onLoadProject(proj.id)}
                className="text-left w-full"
              >
                <WorkshopCard className="hover:border-primary/40 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm truncate">{proj.name}</h3>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                        <span className="capitalize">{proj.quality_mode}</span>
                        <span>Step {proj.current_step}: {STEP_LABELS[proj.current_step as WorkflowStep]}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-1.5 text-[10px] text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>{formatDate(proj.updated_at)}</span>
                      </div>
                    </div>
                    <button
                      onClick={(e) => handleDelete(proj.id, e)}
                      className="p-2 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </WorkshopCard>
              </button>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
