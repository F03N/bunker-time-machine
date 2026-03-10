import type { ReactNode } from 'react';

interface WorkshopCardProps {
  children: ReactNode;
  className?: string;
  generating?: boolean;
}

export function WorkshopCard({ children, className = '', generating }: WorkshopCardProps) {
  return (
    <div className={`
      bg-card rounded-lg border border-border p-4
      ${generating ? 'generation-pulse border-primary/40' : ''}
      ${className}
    `}>
      {children}
    </div>
  );
}
