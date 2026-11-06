'use client';
import { createContext, useContext, useRef, useState, useCallback, useEffect } from 'react';
import type { TrackDto } from '@unis-music/contracts';
import { useRecordPlay } from '@/lib/hooks/useTracks';

interface PlayerState {
  current: TrackDto | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
}

interface PlayerContextValue extends PlayerState {
  play: (track: TrackDto) => void;
  toggle: () => void;
  seek: (time: number) => void;
  setVolume: (v: number) => void;
  audioRef: React.RefObject<HTMLAudioElement>;
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<PlayerState>({
    current: null,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 1,
  });

  // Track which clientPlayIds we have already sent to avoid double-counting
  const sentPlayIds = useRef<Set<string>>(new Set());
  const clientPlayIdRef = useRef<string | null>(null);

  const recordPlay = useRecordPlay();

  const play = useCallback((track: TrackDto) => {
    const audio = audioRef.current;
    if (!audio) return;
    const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';
    audio.src = `${API_BASE}/api/v1/tracks/${track.id}/stream`;
    audio.load();
    audio.play().catch(() => {});
    // Generate a new clientPlayId for each new track start
    clientPlayIdRef.current = crypto.randomUUID();
    sentPlayIds.current = new Set(); // reset for new track
    setState((s) => ({ ...s, current: track, isPlaying: true, currentTime: 0, duration: 0 }));
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
      setState((s) => ({ ...s, isPlaying: true }));
    } else {
      audio.pause();
      setState((s) => ({ ...s, isPlaying: false }));
    }
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
      setState((s) => ({ ...s, currentTime: time }));
    }
  }, []);

  const setVolume = useCallback((v: number) => {
    if (audioRef.current) {
      audioRef.current.volume = v;
      setState((s) => ({ ...s, volume: v }));
    }
  }, []);

  // Fire-and-forget play event on first play of each track
  const handlePlay = useCallback(() => {
    const trackId = state.current?.id;
    const playId = clientPlayIdRef.current;
    if (trackId && playId && !sentPlayIds.current.has(playId)) {
      sentPlayIds.current.add(playId);
      recordPlay.mutate({ trackId, clientPlayId: playId });
    }
  }, [state.current, recordPlay]);

  // Attach the onPlay listener so it fires after audio actually starts
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.addEventListener('play', handlePlay);
    return () => audio.removeEventListener('play', handlePlay);
  }, [handlePlay]);

  return (
    <PlayerContext.Provider value={{ ...state, play, toggle, seek, setVolume, audioRef }}>
      {/* Single persistent audio element for the whole app */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) =>
          setState((s) => ({ ...s, currentTime: e.currentTarget.currentTime }))
        }
        onDurationChange={(e) =>
          setState((s) => ({ ...s, duration: e.currentTarget.duration }))
        }
        onEnded={() => setState((s) => ({ ...s, isPlaying: false }))}
        onError={() => setState((s) => ({ ...s, isPlaying: false }))}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
      {children}
    </PlayerContext.Provider>
  );
}

export function usePlayer() {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside PlayerProvider');
  return ctx;
}
