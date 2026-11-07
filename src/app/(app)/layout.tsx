import AppNav from '@/components/ui/AppNav';
import DueBanner from './deadlines/DueBanner';

// Shared shell for the app pages: navigation, then the "due soon" banner on every page.
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AppNav />
      <DueBanner />
      {children}
    </>
  );
}
