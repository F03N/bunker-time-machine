import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { WorkshopCard } from '@/components/WorkshopCard';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export function AuthPage({ onAuth }: { onAuth: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        toast.success('Check your email to confirm your account');
      }
      onAuth();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Auth failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <span className="text-primary font-bold text-2xl tracking-tight">W&W</span>
          <h1 className="text-lg font-bold mt-2">Bunker Restoration Studio</h1>
          <p className="text-xs text-muted-foreground mt-1">Workflow automation for viral AI timelapse videos</p>
        </div>

        <WorkshopCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-secondary border-border mt-1"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary border-border mt-1"
                minLength={6}
                required
              />
            </div>
            <Button type="submit" className="w-full touch-target font-bold" disabled={loading}>
              {loading ? 'Processing…' : isLogin ? 'Sign In' : 'Create Account'}
            </Button>
          </form>
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="w-full text-center text-xs text-muted-foreground mt-3 hover:text-foreground"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </WorkshopCard>
      </div>
    </div>
  );
}
