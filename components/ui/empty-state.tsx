export function EmptyState({ title, description }: { title: string; description: string }) {
  return <section className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><div><div className="mx-auto mb-4 grid size-12 place-items-center rounded-full bg-indigo-50 text-xl text-indigo-600">◇</div><h2 className="font-semibold">{title}</h2><p className="mt-2 max-w-sm text-sm text-slate-500">{description}</p></div></section>;
}
