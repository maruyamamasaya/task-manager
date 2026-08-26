import type { ButtonHTMLAttributes } from "react";

const variants = { primary: "bg-indigo-600 text-white hover:bg-indigo-700", secondary: "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50", ghost: "text-slate-600 hover:bg-slate-100", danger: "bg-red-600 text-white hover:bg-red-700" };

export function Button({ variant = "primary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: keyof typeof variants }) {
  return <button className={`inline-flex min-h-9 items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:pointer-events-none disabled:opacity-50 ${variants[variant]} ${className}`} {...props} />;
}
