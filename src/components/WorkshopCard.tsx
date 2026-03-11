import { forwardRef } from 'react';
import type { ReactNode } from 'react';

interface WorkshopCardProps {
  children: ReactNode;
  className?: string;
  generating?: boolean;
}

export const WorkshopCard = forwardRef<HTMLDivElement, WorkshopCardProps>(
  ({ children, className = '', generating }, ref) => {
    return (
      <div
        ref={ref}
        className={`
          bg-card rounded-lg border border-border p-4
          ${generating ? 'generation-pulse border-primary/40' : ''}
          ${className}
        `}
      >
        {children}
      </div>
    );
  }
);

WorkshopCard.displayName = 'WorkshopCard';
