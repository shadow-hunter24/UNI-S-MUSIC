import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export const metadata = { title: 'Log In' };

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-bg flex flex-col items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center select-none" aria-label="Uni's Music">
          <span className="text-3xl font-extrabold text-gradient-brand tracking-tight">Uni&apos;s</span>
          <span className="text-3xl font-extrabold text-white tracking-tight ml-2">Music</span>
        </div>

        <h1 className="text-xl font-bold text-white mb-6 text-center">Welcome back</h1>

        <form className="flex flex-col gap-4" noValidate>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            autoComplete="current-password"
          />
          <Button type="submit" size="lg" className="w-full mt-2">
            Log In
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-text-secondary">
          Don&apos;t have an account?{' '}
          <Link href="/" className="text-primary hover:text-accent transition-colors underline-offset-4 hover:underline">
            Get Started
          </Link>
        </p>
      </div>
    </div>
  );
}
