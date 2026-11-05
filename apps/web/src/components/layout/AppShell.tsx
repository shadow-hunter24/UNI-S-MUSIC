import { BottomNav } from './BottomNav';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-bg flex flex-col">
      <main className="flex-1 pb-16 md:pb-0" id="main-content">
        {children}
      </main>
      <BottomNav />
    </div>
  );
}
