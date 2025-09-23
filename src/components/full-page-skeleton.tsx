// src/components/full-page-skeleton.tsx
import { PageHeader, PageHeaderActions, PageHeaderTitle } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';

export const FullPageSkeleton = () => (
    <div className="space-y-8">
      <PageHeader>
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <PageHeaderActions>
           <Skeleton className="h-10 w-[260px]" />
           <Skeleton className="h-10 w-10" />
           <Skeleton className="h-10 w-32" />
        </PageHeaderActions>
      </PageHeader>
      <div className="space-y-8">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    </div>
);
