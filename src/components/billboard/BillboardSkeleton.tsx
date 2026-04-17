export function BillboardSkeleton() {
  return (
    <div className="w-full h-full bg-muted/10 rounded-lg border-2 border-dashed animate-pulse">
      <div className="w-full h-full p-4 space-y-4">
        {/* Simulate treemap blocks */}
        <div className="grid grid-cols-3 gap-2 h-1/3">
          <div className="bg-muted/30 rounded" />
          <div className="bg-muted/40 rounded" />
          <div className="bg-muted/20 rounded" />
        </div>
        <div className="grid grid-cols-2 gap-2 h-1/3">
          <div className="bg-muted/40 rounded" />
          <div className="bg-muted/30 rounded" />
        </div>
        <div className="grid grid-cols-4 gap-2 h-1/3">
          <div className="bg-muted/20 rounded" />
          <div className="bg-muted/30 rounded" />
          <div className="bg-muted/40 rounded" />
          <div className="bg-muted/25 rounded" />
        </div>
      </div>
      <div className="absolute inset-0 flex items-center justify-center">
        <p className="text-muted-foreground text-sm">Loading billboard...</p>
      </div>
    </div>
  );
}
