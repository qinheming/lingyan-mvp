type LingYanLogoProps = {
  className?: string;
  title?: string;
};

export function LingYanLogo({ className = "", title = "LingYan logo" }: LingYanLogoProps) {
  return (
    <svg className={`lingyan-logo ${className}`} viewBox="0 0 64 64" role="img" aria-label={title}>
      <defs>
        <linearGradient id="lingyan-wing" x1="8" x2="56" y1="18" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor="#2563eb" />
          <stop offset="0.55" stopColor="#4fb8e8" />
          <stop offset="1" stopColor="#f8c86b" />
        </linearGradient>
        <filter id="lingyan-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <circle className="lingyan-logo__halo" cx="32" cy="32" r="27" />
      <path
        className="lingyan-logo__wing"
        d="M10 34C19 20 34 15 53 16C42 20 35 26 30 34C25 28 18 29 10 34Z"
        fill="url(#lingyan-wing)"
        filter="url(#lingyan-glow)"
      />
      <path className="lingyan-logo__tail" d="M30 34C37 34 45 38 54 48C41 46 31 43 22 37" />
      <path className="lingyan-logo__cut" d="M19 30C27 27 36 26 47 26" />
      <circle className="lingyan-logo__star" cx="48" cy="19" r="2.4" />
    </svg>
  );
}
