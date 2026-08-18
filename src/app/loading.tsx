export default function Loading() {
  return (
    <div className="shell py-14" role="status" aria-live="polite">
      <span className="sr-only">Loading</span>
      <div className="h-3 w-24 animate-pulse rounded-full bg-surface-raised" />
      <div className="mt-4 h-9 w-2/3 max-w-md animate-pulse rounded-lg bg-surface-raised" />
      <div className="mt-3 h-4 w-full max-w-xl animate-pulse rounded-full bg-surface-raised" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="h-40 animate-pulse rounded-2xl bg-surface-raised" />
        ))}
      </div>
    </div>
  );
}
