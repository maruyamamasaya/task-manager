export function PageHeader({ title, description }: { title: string; description: string }) {
  return <header className="mb-8"><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-slate-500">{description}</p></header>;
}
