// The Atlas mark: three subject lines meeting at one interchange.
// `className="logo-mark"` lets the nav twist it on hover (see globals.css).
export default function AtlasMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" focusable="false" className={className}>
      <path d="M3 22 L14 14" stroke="#3DAE8C" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M25 22 L14 14" stroke="#78B4DE" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M14 3 L14 14" stroke="#E3A93D" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="14" cy="14" r="5.5" fill="#F4F4F4" />
      <circle cx="14" cy="14" r="2.5" fill="#1B1B1B" />
    </svg>
  );
}
