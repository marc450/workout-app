import { Skeleton } from "@/components/ui";

/** Content-only skeleton: the top bar and week strip stay in place from the layout. */
export default function Loading() {
  return (
    <div className="px-4">
      <Skeleton className="mt-2 h-[86px] w-3/5" />
      <Skeleton className="mt-3 h-4 w-2/5" />
      <div className="mt-6 flex flex-col gap-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="rounded-card bg-surface p-3">
            <Skeleton className="h-5 w-1/2" />
            <Skeleton className="mt-2 h-3.5 w-1/3" />
            <Skeleton className="mt-4 h-16 w-full rounded-[14px]" />
          </div>
        ))}
      </div>
    </div>
  );
}
