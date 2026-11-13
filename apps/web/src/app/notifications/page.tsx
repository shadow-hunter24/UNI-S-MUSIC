'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart, UserPlus, Music2, DollarSign, Bell, CheckCheck } from 'lucide-react';
import { BottomNav } from '@/components/layout/BottomNav';

type NotifType = 'like' | 'follow' | 'track' | 'payout' | 'system';

interface Notification {
  id: number;
  type: NotifType;
  read: boolean;
  time: string;
  user?: { name: string; avatar: string };
  message: string;
  meta?: string;
}

const MOCK: Notification[] = [
  { id: 1,  type: 'like',   read: false, time: '2m ago',  user: { name: 'Bright Star',   avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80' }, message: 'liked your track', meta: 'Last Last' },
  { id: 2,  type: 'follow', read: false, time: '15m ago', user: { name: 'Amara K',        avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&q=80' }, message: 'started following you' },
  { id: 3,  type: 'track',  read: false, time: '1h ago',  user: { name: 'KingDee',        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80' }, message: 'added your track to their playlist', meta: 'Afrobeats Vibes' },
  { id: 4,  type: 'payout', read: true,  time: '3h ago',  message: 'Payout of $12.40 approved and sent to your Mobile Money account' },
  { id: 5,  type: 'like',   read: true,  time: '5h ago',  user: { name: 'Ella O',         avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&q=80' }, message: 'liked your track', meta: 'Wonderful' },
  { id: 6,  type: 'follow', read: true,  time: '1d ago',  user: { name: 'JayTee',         avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=80&q=80' }, message: 'started following you' },
  { id: 7,  type: 'system', read: true,  time: '2d ago',  message: 'Your track "Midnight Vibes" passed review and is now published 🎉' },
  { id: 8,  type: 'track',  read: true,  time: '3d ago',  user: { name: 'Bright Star',   avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=80' }, message: 'commented on your track', meta: 'Your new song is amazing!' },
];

const TYPE_ICON: Record<NotifType, { Icon: React.ElementType; color: string; bg: string }> = {
  like:   { Icon: Heart,    color: '#ec4899', bg: 'rgba(236,72,153,0.15)' },
  follow: { Icon: UserPlus, color: '#a855f7', bg: 'rgba(168,85,247,0.15)' },
  track:  { Icon: Music2,   color: '#7c3aed', bg: 'rgba(124,58,237,0.15)' },
  payout: { Icon: DollarSign, color: '#22c55e', bg: 'rgba(34,197,94,0.15)' },
  system: { Icon: Bell,     color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>(MOCK);
  const unreadCount = notifications.filter((n) => !n.read).length;

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function markRead(id: number) {
    setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
  }

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>

      {/* Header */}
      <header className="sticky top-0 z-20 flex items-center justify-between px-4 py-3"
        style={{ background: 'rgba(13,1,33,0.9)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
        <div className="flex items-center gap-2">
          <Link href="/home" className="text-purple-300/60 hover:text-purple-300 transition-colors mr-1">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          </Link>
          <h1 className="text-white font-bold text-base">Notifications</h1>
          {unreadCount > 0 && (
            <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}>
              {unreadCount}
            </span>
          )}
        </div>
        {unreadCount > 0 && (
          <button onClick={markAllRead} className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors">
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </header>

      <main className="flex-1 px-4 py-4">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{ background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(168,85,247,0.2)' }}>
              <Bell size={28} className="text-purple-400/50" />
            </div>
            <p className="text-white font-semibold mb-1">No notifications yet</p>
            <p className="text-sm text-purple-300/60">When someone likes, follows or interacts, it shows up here.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Unread section */}
            {notifications.some((n) => !n.read) && (
              <>
                <p className="text-xs font-semibold text-purple-300/50 uppercase tracking-widest px-1 mb-2">New</p>
                {notifications.filter((n) => !n.read).map((n) => (
                  <NotifRow key={n.id} notif={n} onRead={markRead} />
                ))}
                <p className="text-xs font-semibold text-purple-300/50 uppercase tracking-widest px-1 mt-5 mb-2">Earlier</p>
              </>
            )}
            {/* Read section */}
            {notifications.filter((n) => n.read).map((n) => (
              <NotifRow key={n.id} notif={n} onRead={markRead} />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function NotifRow({ notif, onRead }: { notif: Notification; onRead: (id: number) => void }) {
  const { Icon, color, bg } = TYPE_ICON[notif.type];

  return (
    <button
      onClick={() => onRead(notif.id)}
      className="w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all hover:scale-[1.01]"
      style={{
        background: notif.read ? 'rgba(26,5,51,0.5)' : 'rgba(42,13,74,0.7)',
        border: `1px solid ${notif.read ? 'rgba(168,85,247,0.1)' : 'rgba(168,85,247,0.3)'}`,
      }}
    >
      {/* Icon or avatar */}
      <div className="relative shrink-0">
        {notif.user ? (
          <div className="w-11 h-11 rounded-full overflow-hidden" style={{ border: '2px solid rgba(168,85,247,0.3)' }}>
            <Image src={notif.user.avatar} alt={notif.user.name} width={44} height={44} sizes="44px" className="object-cover w-full h-full" />
          </div>
        ) : (
          <div className="w-11 h-11 rounded-full flex items-center justify-center" style={{ background: bg }}>
            <Icon size={20} style={{ color }} aria-hidden="true" />
          </div>
        )}
        {/* Type badge on avatar */}
        {notif.user && (
          <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full flex items-center justify-center" style={{ background: bg, border: '2px solid #0d0121' }}>
            <Icon size={10} style={{ color }} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white leading-snug">
          {notif.user && <span className="font-semibold">{notif.user.name} </span>}
          <span className={notif.read ? 'text-purple-300/70' : 'text-purple-100'}>{notif.message}</span>
          {notif.meta && <span className="font-semibold text-purple-300"> &quot;{notif.meta}&quot;</span>}
        </p>
        <p className="text-xs text-purple-400/50 mt-0.5">{notif.time}</p>
      </div>

      {/* Unread dot */}
      {!notif.read && (
        <div className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }} aria-label="Unread" />
      )}
    </button>
  );
}
