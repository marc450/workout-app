import { Skeleton } from "@/components/ui";

export default function Loading() {
  return (
    <main className="safe-top px-4">
      <div className="flex justify-end pb-2">
        <Skeleton className="h-12 w-24 rounded-full" />
      </div>
      <Skeleton className="mt-2 h-[86px] w-3/5" />
      <Skeleton className="mt-3 h-4 w-2/5" />
      <Skeleton className="mt-4 h-1.5 w-full" />
      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-card bg-surface p-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-2 h-3.5 w-1/3" />
            <div className="mt-4 flex flex-col gap-2">
              <Skeleton className="h-16 w-full rounded-[14px]" />
              <Skeleton className="h-16 w-full rounded-[14px]" />
              <Skeleton className="h-16 w-full rounded-[14px]" />
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
