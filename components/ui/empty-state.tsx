import { Icon } from "./icon";
export function EmptyState({ title, description, action }: { title: string; description: string; action?: React.ReactNode }) {
  return <section className="grid min-h-48 place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center"><div><Icon name="empty" className="mx-auto mb-3 size-8 text-slate-400"/><h2 className="text-sm font-semibold text-slate-900">{title}</h2><p className="mt-1.5 max-w-sm text-sm text-slate-500">{description}</p>{action && <div className="mt-4">{action}</div>}</div></section>;
}
