import { AppShell } from '@/components/layout/AppShell';

export const metadata = { title: 'Upload' };

export default function UploadPage() {
  return (
    <AppShell>
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-6 text-center">
        <h1 className="text-2xl font-bold text-white mb-2">Upload</h1>
        <p className="text-text-secondary">Share your music with the world.</p>
      </div>
    </AppShell>
  );
}
