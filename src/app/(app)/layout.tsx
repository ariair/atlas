import AppNav from '@/components/ui/AppNav';
import DemoBadge from './DemoBadge';

// Shared shell for the app pages: demo badge, then navigation (which holds the alerts bell that
// replaced the old "due soon" banner; DueBanner.tsx is left untouched in the deadlines folder).
// Keep DemoBadge first: it sets the demo cookie before the pages below load their data.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoBadge />
      <AppNav />
      {children}
    </>
  );
}
