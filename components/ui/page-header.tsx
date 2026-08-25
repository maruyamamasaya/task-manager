export function PageHeader({ title, description }: { title: string; description: string }) {
  return <header className="mb-8"><p className="mb-2 text-[11px] font-bold uppercase tracking-[0.22em] text-indigo-500">Workspace</p><h1 className="text-3xl font-bold tracking-[-0.035em] text-slate-950 sm:text-4xl">{title}</h1><p className="mt-2.5 text-sm leading-relaxed text-slate-500">{description}</p></header>;
}
