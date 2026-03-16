interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex min-h-48 w-full flex-col items-center justify-center rounded-xl border border-dashed border-blue-300/40 bg-white/5 text-center">
      <h3 className="text-xl font-semibold text-white">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-slate-300">{description}</p>
    </div>
  );
}
