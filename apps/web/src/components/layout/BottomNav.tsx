'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Music2, Upload, DollarSign, Users } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/home', label: 'Stream', icon: Music2 },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/earn', label: 'Earn', icon: DollarSign },
  { href: '/connect', label: 'Connect', icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Main navigation"
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: 'rgba(13, 1, 33, 0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(168, 85, 247, 0.2)',
        boxShadow: '0 -4px 30px rgba(124, 58, 237, 0.15)',
      }}
    >
      <ul className="flex items-stretch h-16" role="list">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href === '/home' && pathname === '/');
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'flex flex-col items-center justify-center h-full gap-1 text-xs font-semibold transition-all',
                  isActive ? 'text-accent' : 'text-purple-400/60 hover:text-purple-300',
                )}
              >
                <div className={clsx(
                  'flex items-center justify-center w-8 h-8 rounded-full transition-all',
                  isActive && 'bg-purple-600/20'
                )}>
                  <Icon
                    size={20}
                    aria-hidden="true"
                    strokeWidth={isActive ? 2.5 : 1.8}
                    style={isActive ? { filter: 'drop-shadow(0 0 6px rgba(168,85,247,0.8))' } : undefined}
                  />
                </div>
                <span className={clsx('tracking-wide', isActive && 'text-accent')}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
