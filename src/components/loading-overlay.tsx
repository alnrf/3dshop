// components/loading-overlay.tsx
export function LoadingOverlay() {
  return (
    <div
      role="status"
      aria-label="Carregando"
      className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-[1px]"
    >
      <div className="h-12 w-12 animate-spin rounded-full border-4 border-neutral-200 border-t-neutral-900" />
    </div>
  );
}
