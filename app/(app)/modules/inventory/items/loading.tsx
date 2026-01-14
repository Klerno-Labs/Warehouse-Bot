export default function Loading() {
  return (
    <div className="space-y-6 p-6">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
      </div>

      {/* Search Bar Skeleton */}
      <div className="flex gap-4">
        <div className="h-10 flex-1 bg-gray-200 animate-pulse rounded" />
        <div className="h-10 w-32 bg-gray-200 animate-pulse rounded" />
      </div>

      {/* Table Skeleton */}
      <div className="space-y-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="flex gap-4 items-center p-4 bg-gray-50 rounded animate-pulse">
            <div className="h-5 w-24 bg-gray-200 rounded" />
            <div className="h-5 flex-1 bg-gray-200 rounded" />
            <div className="h-5 w-20 bg-gray-200 rounded" />
            <div className="h-5 w-32 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
