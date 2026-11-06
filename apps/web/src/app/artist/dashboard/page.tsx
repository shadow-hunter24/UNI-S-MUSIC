'use client';
import Link from 'next/link';
import { Upload, Loader2, AlertCircle, CheckCircle, Clock, Music } from 'lucide-react';
import { useMyTracks, useSubmitTrack } from '@/lib/hooks/useTracks';
import { TrackStatus } from '@unis-music/contracts';
import type { TrackDto } from '@unis-music/contracts';
import { BottomNav } from '@/components/layout/BottomNav';

const STATUS_COLOR: Record<TrackStatus, string> = {
  [TrackStatus.UPLOADING]: 'bg-yellow-500/20 text-yellow-300',
  [TrackStatus.PROCESSING]: 'bg-blue-500/20 text-blue-300',
  [TrackStatus.PROCESSING_FAILED]: 'bg-red-500/20 text-red-300',
  [TrackStatus.DRAFT]: 'bg-gray-500/20 text-gray-300',
  [TrackStatus.PENDING_REVIEW]: 'bg-purple-500/20 text-purple-300',
  [TrackStatus.PUBLISHED]: 'bg-green-500/20 text-green-300',
  [TrackStatus.REJECTED]: 'bg-red-500/20 text-red-300',
  [TrackStatus.SCHEDULED]: 'bg-blue-500/20 text-blue-300',
  [TrackStatus.TAKEN_DOWN]: 'bg-orange-500/20 text-orange-300',
  [TrackStatus.ARCHIVED]: 'bg-gray-500/20 text-gray-300',
};

function formatDuration(seconds?: number): string {
  if (!seconds) return '--';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function TrackStatusBadge({ status }: { status: string }) {
  const colorClass = STATUS_COLOR[status as TrackStatus] ?? 'bg-gray-500/20 text-gray-300';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

function TrackRow({ track }: { track: TrackDto }) {
  const submit = useSubmitTrack();
  const canSubmit =
    track.status === TrackStatus.DRAFT &&
    track.durationSeconds != null &&
    track.durationSeconds > 0;

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-xl transition-all"
      style={{ background: 'rgba(124,58,237,0.06)', border: '1px solid rgba(168,85,247,0.12)' }}
    >
      {/* Cover placeholder */}
      <div
        className="shrink-0 w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg,rgba(124,58,237,0.3),rgba(168,85,247,0.15))' }}
        aria-hidden="true"
      >
        <Music size={14} className="text-purple-400/60" />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold truncate">{track.title}</p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <TrackStatusBadge status={track.status} />
          {track.durationSeconds && (
            <span className="text-purple-300/50 text-xs">{formatDuration(track.durationSeconds)}</span>
          )}
          <span className="text-purple-300/50 text-xs">{track.playCount} plays</span>
        </div>
        {track.processingError && (
          <p className="text-red-400/80 text-xs mt-1 truncate">{track.processingError}</p>
        )}
      </div>

      {/* Actions */}
      <div className="shrink-0 flex items-center gap-2">
        {track.status === TrackStatus.PROCESSING && (
          <Loader2 size={16} className="text-blue-300 animate-spin" aria-label="Processing" />
        )}
        {track.status === TrackStatus.PROCESSING_FAILED && (
          <Link
            href="/artist/upload"
            className="text-xs text-red-400 hover:text-red-300 flex items-center gap-1"
            aria-label="Retry upload"
          >
            <AlertCircle size={12} aria-hidden="true" />
            Retry
          </Link>
        )}
        {track.status === TrackStatus.PUBLISHED && (
          <Link
            href={`/tracks/${track.id}`}
            className="text-xs text-green-400 hover:text-green-300 flex items-center gap-1"
          >
            <CheckCircle size={12} aria-hidden="true" />
            View
          </Link>
        )}
        {track.status === TrackStatus.PENDING_REVIEW && (
          <span className="text-xs text-purple-300/60 flex items-center gap-1">
            <Clock size={12} aria-hidden="true" />
            In review
          </span>
        )}
        {canSubmit && (
          <button
            onClick={() => submit.mutate(track.id)}
            disabled={submit.isPending}
            aria-label={`Submit ${track.title} for review`}
            className="text-xs px-2 py-1 rounded-lg font-medium disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', color: 'white' }}
          >
            {submit.isPending ? 'Submitting…' : 'Submit'}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ArtistDashboard() {
  const { data, isLoading } = useMyTracks();

  const tracks = data?.items ?? [];

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-4 py-4"
        style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}
      >
        <h1 className="text-lg font-bold text-white">My Tracks</h1>
        <Link
          href="/artist/upload"
          className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-white"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 12px rgba(124,58,237,0.4)' }}
        >
          <Upload size={14} aria-hidden="true" />
          Upload
        </Link>
      </header>

      <main className="flex-1 px-4 py-4 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={32} className="text-purple-400 animate-spin" aria-label="Loading tracks" />
          </div>
        )}

        {!isLoading && tracks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <Music size={48} className="text-purple-400/30" aria-hidden="true" />
            <p className="text-white font-semibold">No tracks yet</p>
            <p className="text-purple-300/50 text-sm text-center">
              Upload your first track to get started.
            </p>
            <Link
              href="/artist/upload"
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white"
              style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
            >
              Upload a Track
            </Link>
          </div>
        )}

        {tracks.map((track) => (
          <TrackRow key={track.id} track={track} />
        ))}
      </main>

      <BottomNav />
    </div>
  );
}
