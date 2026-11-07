import AppNav from '@/components/ui/AppNav';
import DemoBadge from './DemoBadge';
import DueBanner from './deadlines/DueBanner';

// Shared shell for the app pages: demo badge, navigation, then the "due soon" banner.
// Keep DemoBadge first: it sets the demo cookie before the pages below load their data.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DemoBadge />
      <AppNav />
      <DueBanner />
      {children}
    </>
  );
}
