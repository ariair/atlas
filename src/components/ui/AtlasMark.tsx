// The Atlas mark: three subject lines meeting at one interchange.
export default function AtlasMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <path d="M3 22 L14 14" stroke="#009E73" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M25 22 L14 14" stroke="#56B4E9" strokeWidth="3.5" strokeLinecap="round" />
      <path d="M14 3 L14 14" stroke="#E69F00" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="14" cy="14" r="5.5" fill="#F2F0E9" />
      <circle cx="14" cy="14" r="2.5" fill="#0E1116" />
    </svg>
  );
}
