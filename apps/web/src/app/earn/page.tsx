import { AppShell } from '@/components/layout/AppShell';

export const metadata = { title: 'Earn' };

export default function EarnPage() {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Earn</h1>
        <p className="text-text-secondary">Monetise your artistry.</p>
      </div>
    </AppShell>
  );
}
