'use client';
import { useState } from 'react';
import { ArrowLeft, Upload, Music, Image, FileText, Send } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';

const STEPS = ['Audio File','Song Details','Credits','Artwork','Publish'];

const GENRES = ['Afrobeats','Hip Hop','Gospel','R&B','Reggae','Electronic','Rock','Country','Jazz','Pop'];

function StyledInput({ label, placeholder, type = 'text', value, onChange }: { label: string; placeholder?: string; type?: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: 'rgba(196,181,212,0.8)' }}>{label}</label>
      <input type={type} placeholder={placeholder} value={value} onChange={(e) => onChange(e.target.value)}
        className="rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder-purple-400/40"
        style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
        onFocus={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
        onBlur={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.2)'; e.target.style.boxShadow = 'none'; }}
      />
    </div>
  );
}

export default function ArtistUploadPage() {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [genre, setGenre] = useState('');
  const [explicit, setExplicit] = useState(false);
  const [description, setDescription] = useState('');
  const [fileSelected, setFileSelected] = useState(false);

  const stepIcons = [Music, FileText, Send, Image, Upload];

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>
      <header className="flex items-center gap-3 px-4 py-4" style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}>
        <Link href="/home" aria-label="Back" className="text-purple-300/60 hover:text-purple-300"><ArrowLeft size={20} /></Link>
        <h1 className="text-lg font-bold text-white">Artist Upload (Free)</h1>
      </header>

      {/* Step indicators */}
      <div className="px-4 py-4">
        <div className="flex items-center justify-between">
          {STEPS.map((s, i) => {
            const Icon = stepIcons[i]!;
            const done = i < step;
            const active = i === step;
            return (
              <div key={s} className="flex flex-col items-center gap-1 flex-1">
                <div className="w-8 h-8 rounded-full flex items-center justify-center transition-all" style={{ background: done ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : active ? 'rgba(124,58,237,0.3)' : 'rgba(124,58,237,0.1)', border: active ? '2px solid #a855f7' : done ? 'none' : '1px solid rgba(168,85,247,0.2)', boxShadow: active ? '0 0 15px rgba(168,85,247,0.4)' : 'none' }}>
                  <Icon size={14} className={done || active ? 'text-white' : 'text-purple-400/50'} aria-hidden="true" />
                </div>
                <span className="text-xs hidden sm:block" style={{ color: active ? '#a855f7' : done ? 'rgba(196,181,212,0.6)' : 'rgba(196,181,212,0.3)' }}>{s}</span>
                {i < STEPS.length - 1 && <div className="absolute" />}
              </div>
            );
          })}
        </div>
        <div className="relative mt-2 h-1 rounded-full" style={{ background: 'rgba(168,85,247,0.15)' }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${(step / (STEPS.length - 1)) * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#a855f7)' }} />
        </div>
      </div>

      <main className="flex-1 px-4 py-4 space-y-5">
        <h2 className="text-white font-bold text-base">{STEPS[step]}</h2>

        {step === 0 && (
          <div>
            <button onClick={() => setFileSelected(true)}
              className="w-full rounded-2xl flex flex-col items-center justify-center py-12 gap-3 transition-all hover:scale-[1.01]"
              style={{ border: `2px dashed ${fileSelected ? '#a855f7' : 'rgba(168,85,247,0.3)'}`, background: fileSelected ? 'rgba(168,85,247,0.1)' : 'rgba(124,58,237,0.05)' }}
              aria-label="Upload audio file">
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)' }}>
                {fileSelected ? <Music size={28} className="text-accent" aria-hidden="true" /> : <Upload size={28} className="text-purple-400/60" aria-hidden="true" />}
              </div>
              {fileSelected
                ? <><p className="text-white font-semibold text-sm">file_selected.mp3</p><p className="text-xs text-accent">✓ File ready</p></>
                : <><p className="text-white font-semibold text-sm">Drag &amp; drop or tap to browse</p><p className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>MP3, WAV, FLAC, AAC · Max 100MB</p></>
              }
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <StyledInput label="Song Title" placeholder="Enter song title" value={title} onChange={setTitle} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgba(196,181,212,0.8)' }}>Genre</label>
              <select value={genre} onChange={(e) => setGenre(e.target.value)} className="rounded-xl px-4 py-3 text-sm text-white outline-none" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}>
                <option value="" style={{ background: '#1a0533' }}>Select genre</option>
                {GENRES.map((g) => <option key={g} value={g} style={{ background: '#1a0533' }}>{g}</option>)}
              </select>
            </div>
            <StyledInput label="Release Date" type="date" value="" onChange={() => {}} />
            <div className="flex items-center justify-between p-4 rounded-xl" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}>
              <span className="text-sm text-white">Explicit Content</span>
              <button onClick={() => setExplicit(!explicit)} role="switch" aria-checked={explicit} className="w-12 h-6 rounded-full transition-all relative" style={{ background: explicit ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(124,58,237,0.2)' }}>
                <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all" style={{ left: explicit ? 'calc(100% - 20px)' : '4px' }} />
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgba(196,181,212,0.8)' }}>Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell your fans about this track…" rows={3} className="rounded-xl px-4 py-3 text-sm text-white outline-none resize-none placeholder-purple-400/40" style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }} />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <StyledInput label="Featured Artists" placeholder="e.g. Artist name" value="" onChange={() => {}} />
            <StyledInput label="Producer(s)" placeholder="e.g. Producer name" value="" onChange={() => {}} />
            <StyledInput label="Lyricist(s)" placeholder="e.g. Lyricist name" value="" onChange={() => {}} />
            <StyledInput label="Composer(s)" placeholder="e.g. Composer name" value="" onChange={() => {}} />
          </div>
        )}

        {step === 3 && (
          <button className="w-full aspect-square max-w-xs mx-auto rounded-2xl flex flex-col items-center justify-center gap-3" style={{ border: '2px dashed rgba(168,85,247,0.3)', background: 'rgba(124,58,237,0.05)' }} aria-label="Upload artwork">
            <Image size={40} className="text-purple-400/40" aria-hidden="true" />
            <p className="text-white text-sm font-semibold">Upload Artwork</p>
            <p className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>JPG, PNG · Min 1400×1400px</p>
          </button>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.7),rgba(26,5,51,0.85))', border: '1px solid rgba(168,85,247,0.25)' }}>
              <p className="text-white font-bold mb-3">Review &amp; Publish</p>
              <div className="space-y-2 text-sm" style={{ color: 'rgba(196,181,212,0.7)' }}>
                <p><span className="text-purple-300/60 text-xs">Title:</span> {title || '—'}</p>
                <p><span className="text-purple-300/60 text-xs">Genre:</span> {genre || '—'}</p>
                <p><span className="text-purple-300/60 text-xs">Explicit:</span> {explicit ? 'Yes' : 'No'}</p>
              </div>
            </div>
            <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(168,85,247,0.15)', color: 'rgba(196,181,212,0.7)' }}>
              By publishing you confirm you own the rights to this content and agree to our terms.
            </div>
          </div>
        )}
      </main>

      {/* Navigation */}
      <div className="px-4 pb-4 flex gap-3">
        {step > 0 && (
          <button onClick={() => setStep((s) => s - 1)} className="flex-1 py-3 rounded-xl font-bold text-sm" style={{ border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7' }}>Back</button>
        )}
        {step < STEPS.length - 1
          ? <button onClick={() => setStep((s) => s + 1)} className="flex-1 py-3 rounded-xl font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}>Next</button>
          : <button className="flex-1 py-3 rounded-xl font-bold text-sm text-white" style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}>Publish</button>
        }
      </div>
      <BottomNav />
    </div>
  );
}
