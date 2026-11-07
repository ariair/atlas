import DueBanner from './deadlines/DueBanner';

// Shared shell for the app pages. Shows the "due soon" banner on every page (Person A may add navigation here).
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DueBanner />
      {children}
    </>
  );
}
