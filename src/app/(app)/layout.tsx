import DemoBadge from './DemoBadge';
import DueBanner from './deadlines/DueBanner';

// Shared shell for the app pages: demo badge and the "due soon" banner. Person A may add navigation here.
// Keep DemoBadge first: it sets the demo cookie before the pages below load their data.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoBadge />
      <DueBanner />
      {children}
    </>
  );
}
