'use client';
import { useState } from 'react';
import { ArrowLeft, Upload, FileText, Save } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';

export default function LyricsPage() {
  const [pastedLyrics, setPastedLyrics] = useState('');
  const [monetisation, setMonetisation] = useState(false);
  const [releaseSettings, setReleaseSettings] = useState(false);

  const card = {
    background: 'linear-gradient(135deg,rgba(42,13,74,0.8),rgba(26,5,51,0.9))',
    border: '1px solid rgba(168,85,247,0.25)',
  };

  return (
    <div
      className="min-h-screen flex flex-col pb-24"
      style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-4"
        style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}
      >
        <Link href="/artist/upload" aria-label="Back" className="text-purple-300/60 hover:text-purple-300 transition-colors">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-white">Upload Lyrics</h1>
      </header>

      <main className="flex-1 px-4 py-5 space-y-5">

        {/* Upload file button */}
        <div>
          <p className="text-xs font-medium mb-2" style={{ color: 'rgba(196,181,212,0.8)' }}>Upload lyrics file</p>
          <button
            className="w-full flex flex-col items-center justify-center gap-3 py-10 rounded-2xl transition-all hover:scale-[1.01]"
            style={{ border: '2px dashed rgba(168,85,247,0.3)', background: 'rgba(124,58,237,0.05)' }}
            aria-label="Upload lyrics file"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(124,58,237,0.2)' }}
            >
              <Upload size={24} className="text-purple-400/70" aria-hidden="true" />
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-sm">Tap to upload</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(196,181,212,0.5)' }}>.lrc, .txt supported</p>
            </div>
          </button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px" style={{ background: 'rgba(168,85,247,0.15)' }} />
          <span className="text-xs" style={{ color: 'rgba(196,181,212,0.4)' }}>or paste lyrics</span>
          <div className="flex-1 h-px" style={{ background: 'rgba(168,85,247,0.15)' }} />
        </div>

        {/* Paste textarea */}
        <div>
          <label className="text-xs font-medium block mb-2" style={{ color: 'rgba(196,181,212,0.8)' }}>
            <FileText size={13} className="inline mr-1" aria-hidden="true" />
            Paste Lyrics
          </label>
          <textarea
            value={pastedLyrics}
            onChange={(e) => setPastedLyrics(e.target.value)}
            placeholder="Paste your song lyrics here…"
            rows={5}
            className="w-full rounded-xl px-4 py-3 text-sm text-white placeholder-purple-400/40 outline-none resize-none"
            style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
            onFocus={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.2)'; e.target.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          {/* Monetisation */}
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={card}
          >
            <div>
              <p className="text-white font-semibold text-sm">Monetisation</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,212,0.5)' }}>Enable earnings from lyrics views</p>
            </div>
            <button
              onClick={() => setMonetisation(!monetisation)}
              role="switch"
              aria-checked={monetisation}
              aria-label="Toggle monetisation"
              className="w-12 h-6 rounded-full transition-all relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
              style={{ background: monetisation ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(124,58,237,0.2)' }}
            >
              <div
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: monetisation ? 'calc(100% - 20px)' : '4px' }}
              />
            </button>
          </div>

          {/* Release Settings */}
          <div
            className="flex items-center justify-between p-4 rounded-xl"
            style={card}
          >
            <div>
              <p className="text-white font-semibold text-sm">Release Settings</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(196,181,212,0.5)' }}>Show lyrics only after release date</p>
            </div>
            <button
              onClick={() => setReleaseSettings(!releaseSettings)}
              role="switch"
              aria-checked={releaseSettings}
              aria-label="Toggle release settings"
              className="w-12 h-6 rounded-full transition-all relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
              style={{ background: releaseSettings ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(124,58,237,0.2)' }}
            >
              <div
                className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: releaseSettings ? 'calc(100% - 20px)' : '4px' }}
              />
            </button>
          </div>
        </div>
      </main>

      {/* Save button */}
      <div className="px-4 pb-4">
        <button
          className="w-full py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 20px rgba(124,58,237,0.4)' }}
        >
          <Save size={16} aria-hidden="true" />
          Save Lyrics
        </button>
      </div>

      <BottomNav />
    </div>
  );
}
