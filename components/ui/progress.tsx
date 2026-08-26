export function Progress({ value, className = "" }: { value: number; className?: string }) {
  const safe = Math.max(0, Math.min(100, value));
  return <div className={`h-1 overflow-hidden rounded-full bg-slate-100 ${className}`} role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={safe}><div className={`h-full rounded-full ${safe === 100 ? "bg-emerald-500" : "bg-indigo-600"}`} style={{ width: `${safe}%` }} /></div>;
}
