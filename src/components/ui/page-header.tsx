// src/components/page-header.tsx
import { cn } from '@/lib/utils';
import * as React from 'react';

const PageHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8', className)}
      {...props}
    />
  )
);
PageHeader.displayName = 'PageHeader';

const PageHeaderTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h1
      ref={ref}
      className={cn('text-3xl font-bold tracking-tighter animate-fade-in-slide-up', className)}
      {...props}
    />
  )
);
PageHeaderTitle.displayName = 'PageHeaderTitle';

const PageHeaderDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      className={cn('text-muted-foreground', className)}
      {...props}
    />
  )
);
PageHeaderDescription.displayName = 'PageHeaderDescription';

const PageHeaderActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex items-center gap-2', className)}
      {...props}
    />
  )
);
PageHeaderActions.displayName = 'PageHeaderActions';

export { PageHeader, PageHeaderTitle, PageHeaderDescription, PageHeaderActions };
