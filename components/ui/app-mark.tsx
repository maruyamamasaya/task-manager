type AppMarkProps = {
  className?: string;
};

export function AppMark({ className = "size-8" }: AppMarkProps) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="app-mark-gradient" x1="10" y1="8" x2="54" y2="58" gradientUnits="userSpaceOnUse">
          <stop stopColor="#6366F1" />
          <stop offset="1" stopColor="#4338CA" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill="url(#app-mark-gradient)" />
      <path d="M17 18.5H42" stroke="white" strokeWidth="7" strokeLinecap="round" />
      <path d="M29.5 19V43.5" stroke="white" strokeWidth="7" strokeLinecap="round" />
      <path d="M38.5 41.5L44 47L54 35" fill="none" stroke="#C7D2FE" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M13 11C22 5 42 5 51 11" fill="none" stroke="white" strokeOpacity="0.15" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
