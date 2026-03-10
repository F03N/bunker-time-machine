import { Button } from '@/components/ui/button';

interface StickyActionProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: {
    label: string;
    onClick: () => void;
  };
}

export function StickyAction({ label, onClick, disabled, loading, secondary }: StickyActionProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-background/90 backdrop-blur-sm border-t border-border">
      <div className="flex gap-3 max-w-lg mx-auto">
        {secondary && (
          <Button
            variant="outline"
            className="flex-1 touch-target text-base font-semibold"
            onClick={secondary.onClick}
          >
            {secondary.label}
          </Button>
        )}
        <Button
          className="flex-1 touch-target text-base font-bold"
          onClick={onClick}
          disabled={disabled || loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
              Processing…
            </span>
          ) : label}
        </Button>
      </div>
    </div>
  );
}
