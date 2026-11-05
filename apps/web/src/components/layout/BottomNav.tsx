'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Music2, Upload, DollarSign, Users } from 'lucide-react';
import clsx from 'clsx';

const navItems = [
  { href: '/', label: 'Stream', icon: Music2 },
  { href: '/upload', label: 'Upload', icon: Upload },
  { href: '/earn', label: 'Earn', icon: DollarSign },
  { href: '/connect', label: 'Connect', icon: Users },
];

export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main navigation" className="fixed bottom-0 left-0 right-0 z-50 bg-bg-surface border-t border-bg-elevated md:hidden">
      <ul className="flex items-stretch h-16" role="list">
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href;
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'flex flex-col items-center justify-center h-full gap-1 text-xs font-medium transition-colors',
                  isActive ? 'text-primary' : 'text-text-secondary hover:text-text-primary',
                )}
              >
                <Icon size={22} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
