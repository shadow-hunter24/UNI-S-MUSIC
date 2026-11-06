'use client';
import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Upload, Music, Image, FileText, Send, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { BottomNav } from '@/components/layout/BottomNav';
import { apiFetch } from '@/lib/api';
import { uploadToR2 } from '@/lib/upload';
import {
  useInitUpload,
  useFinalizeUpload,
  useUpdateTrack,
  useUploadCover,
  useAddCredit,
  useSubmitTrack,
  useMyTrackById,
} from '@/lib/hooks/useTracks';
import type { GenreDto } from '@unis-music/contracts';

const STEPS = ['Audio File', 'Song Details', 'Credits & Features', 'Artwork', 'Publish'];

const AUDIO_MIME_TYPES = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/m4a'];
const AUDIO_MAX_BYTES = 150 * 1024 * 1024;
const COVER_MAX_BYTES = 10 * 1024 * 1024;
const COVER_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function StyledInput({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium" style={{ color: 'rgba(196,181,212,0.8)' }}>
        {label}
      </label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder-purple-400/40"
        style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
        onFocus={(e) => {
          e.target.style.borderColor = 'rgba(168,85,247,0.6)';
          e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'rgba(168,85,247,0.2)';
          e.target.style.boxShadow = 'none';
        }}
      />
    </div>
  );
}

export default function ArtistUploadPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);

  // Step 1 state
  const audioFileRef = useRef<HTMLInputElement>(null);
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [trackId, setTrackId] = useState<string | null>(null);
  const [step1Error, setStep1Error] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Step 2 state
  const [title, setTitle] = useState('');
  const [genreId, setGenreId] = useState('');
  const [releaseDate, setReleaseDate] = useState('');
  const [explicit, setExplicit] = useState(false);
  const [description, setDescription] = useState('');
  const [genres, setGenres] = useState<GenreDto[]>([]);
  const [step2Error, setStep2Error] = useState<string | null>(null);

  // Step 3 state
  const [featuredArtist, setFeaturedArtist] = useState('');
  const [producer, setProducer] = useState('');
  const [lyricist, setLyricist] = useState('');
  const [composer, setComposer] = useState('');

  // Step 4 state
  const coverFileRef = useRef<HTMLInputElement>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [step4Error, setStep4Error] = useState<string | null>(null);
  const [isCoverUploading, setIsCoverUploading] = useState(false);

  // Step 5 state
  const [isFinalized, setIsFinalized] = useState(false);
  const [step5Error, setStep5Error] = useState<string | null>(null);

  const initUpload = useInitUpload();
  const finalizeUpload = useFinalizeUpload();
  const updateTrack = useUpdateTrack();
  const uploadCover = useUploadCover();
  const addCredit = useAddCredit();
  const submitTrack = useSubmitTrack();

  // Poll track status while in step 5 — only active when we have a trackId and are on the final step
  const { data: polledTrack } = useMyTrackById(trackId ?? '', step === 4 ? 3000 : false);

  const stepIcons = [Music, FileText, Send, Image, Upload];

  const handleAudioFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep1Error(null);

    if (!AUDIO_MIME_TYPES.includes(file.type)) {
      setStep1Error(`Unsupported file type: ${file.type}. Use MP3, WAV, FLAC, or AAC.`);
      return;
    }
    if (file.size > AUDIO_MAX_BYTES) {
      setStep1Error('File is too large. Maximum size is 150 MB.');
      return;
    }

    setAudioFile(file);
    setTitle(file.name.replace(/\.[^.]+$/, ''));
  }, []);

  const handleStep1Next = async () => {
    if (!audioFile) { setStep1Error('Please select an audio file.'); return; }
    setStep1Error(null);
    setIsUploading(true);
    try {
      const { trackId: tid, uploadUrl } = await initUpload.mutateAsync({
        title: title || audioFile.name.replace(/\.[^.]+$/, ''),
        contentType: audioFile.type,
      });
      setTrackId(tid);
      await uploadToR2(uploadUrl, audioFile, setUploadProgress);
      setStep(1);
      // Load genres for step 2
      const genreData = await apiFetch<GenreDto[]>('/api/v1/genres');
      setGenres(genreData);
    } catch (err) {
      setStep1Error(err instanceof Error ? err.message : 'Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleStep2Next = async () => {
    if (!trackId) return;
    setStep2Error(null);
    if (!title.trim()) { setStep2Error('Song title is required.'); return; }
    try {
      await updateTrack.mutateAsync({
        id: trackId,
        title: title.trim(),
        genreId: genreId || undefined,
        releaseDate: releaseDate || undefined,
        explicit,
        description: description || undefined,
      });
      setStep(2);
    } catch (err) {
      setStep2Error(err instanceof Error ? err.message : 'Failed to save details.');
    }
  };

  const handleStep3Next = async () => {
    if (!trackId) return;
    const credits = [
      { name: featuredArtist, role: 'Featured Artist' },
      { name: producer, role: 'Producer' },
      { name: lyricist, role: 'Lyricist' },
      { name: composer, role: 'Composer' },
    ].filter((c) => c.name.trim());

    for (const credit of credits) {
      await addCredit.mutateAsync({ trackId, name: credit.name.trim(), role: credit.role });
    }
    setStep(3);
  };

  const handleCoverFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStep4Error(null);

    if (!COVER_MIME_TYPES.includes(file.type)) {
      setStep4Error('Unsupported image type. Use JPG, PNG, or WebP.');
      return;
    }
    if (file.size > COVER_MAX_BYTES) {
      setStep4Error('Image too large. Maximum size is 10 MB.');
      return;
    }

    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  }, []);

  const handleStep4Next = async () => {
    if (!trackId) return;
    setStep4Error(null);
    if (coverFile) {
      setIsCoverUploading(true);
      try {
        await uploadCover.mutateAsync({ trackId, file: coverFile });
      } catch (err) {
        setStep4Error(err instanceof Error ? err.message : 'Cover upload failed.');
        setIsCoverUploading(false);
        return;
      }
      setIsCoverUploading(false);
    }
    // Enter step 5 and finalize
    setStep(4);
    try {
      await finalizeUpload.mutateAsync(trackId);
      setIsFinalized(true);
    } catch (err) {
      setStep5Error(err instanceof Error ? err.message : 'Finalize failed.');
    }
  };

  const handleSubmitForReview = async () => {
    if (!trackId) return;
    setStep5Error(null);
    try {
      await submitTrack.mutateAsync(trackId);
      router.push('/artist/dashboard');
    } catch (err) {
      setStep5Error(err instanceof Error ? err.message : 'Submit failed.');
    }
  };

  const trackStatus = polledTrack?.status;
  const isProcessing = trackStatus === 'UPLOADING' || trackStatus === 'PROCESSING';
  const isDraft = trackStatus === 'DRAFT';
  const isProcessingFailed = trackStatus === 'PROCESSING_FAILED';

  return (
    <div className="min-h-screen flex flex-col pb-20" style={{ background: 'linear-gradient(180deg,#0d0121 0%,#130329 50%,#0d0121 100%)' }}>
      <header
        className="flex items-center gap-3 px-4 py-4"
        style={{ background: 'rgba(13,1,33,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid rgba(168,85,247,0.15)' }}
      >
        <Link href="/home" aria-label="Back" className="text-purple-300/60 hover:text-purple-300">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-lg font-bold text-white">Upload Track</h1>
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
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                  style={{
                    background: done
                      ? 'linear-gradient(135deg,#7c3aed,#a855f7)'
                      : active
                      ? 'rgba(124,58,237,0.3)'
                      : 'rgba(124,58,237,0.1)',
                    border: active ? '2px solid #a855f7' : done ? 'none' : '1px solid rgba(168,85,247,0.2)',
                    boxShadow: active ? '0 0 15px rgba(168,85,247,0.4)' : 'none',
                  }}
                >
                  <Icon size={14} className={done || active ? 'text-white' : 'text-purple-400/50'} aria-hidden="true" />
                </div>
                <span className="text-xs hidden sm:block" style={{ color: active ? '#a855f7' : done ? 'rgba(196,181,212,0.6)' : 'rgba(196,181,212,0.3)' }}>
                  {s}
                </span>
              </div>
            );
          })}
        </div>
        <div className="relative mt-2 h-1 rounded-full" style={{ background: 'rgba(168,85,247,0.15)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%`, background: 'linear-gradient(90deg,#7c3aed,#a855f7)' }}
          />
        </div>
      </div>

      <main className="flex-1 px-4 py-4 space-y-5">
        <h2 className="text-white font-bold text-base">{STEPS[step]}</h2>

        {/* Step 0 — Audio File */}
        {step === 0 && (
          <div className="space-y-4">
            <input
              ref={audioFileRef}
              type="file"
              accept="audio/*"
              className="sr-only"
              aria-label="Select audio file"
              onChange={handleAudioFileChange}
            />
            <button
              onClick={() => audioFileRef.current?.click()}
              className="w-full rounded-2xl flex flex-col items-center justify-center py-12 gap-3 transition-all hover:scale-[1.01]"
              style={{
                border: `2px dashed ${audioFile ? '#a855f7' : 'rgba(168,85,247,0.3)'}`,
                background: audioFile ? 'rgba(168,85,247,0.1)' : 'rgba(124,58,237,0.05)',
              }}
              aria-label="Upload audio file"
            >
              <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(124,58,237,0.2)' }}>
                {audioFile ? (
                  <Music size={28} className="text-accent" aria-hidden="true" />
                ) : (
                  <Upload size={28} className="text-purple-400/60" aria-hidden="true" />
                )}
              </div>
              {audioFile ? (
                <>
                  <p className="text-white font-semibold text-sm">{audioFile.name}</p>
                  <p className="text-xs text-accent">✓ File ready</p>
                </>
              ) : (
                <>
                  <p className="text-white font-semibold text-sm">Drag &amp; drop or tap to browse</p>
                  <p className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>
                    MP3, WAV, FLAC, AAC · Max 150 MB
                  </p>
                </>
              )}
            </button>

            {isUploading && (
              <div className="space-y-2">
                <progress
                  value={uploadProgress}
                  max={100}
                  aria-label={`Upload progress: ${uploadProgress}%`}
                  className="w-full h-2 rounded-full overflow-hidden"
                  style={{ accentColor: '#a855f7' }}
                />
                <p className="text-purple-300/60 text-xs text-center">{uploadProgress}% uploaded</p>
              </div>
            )}

            {step1Error && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.9)' }}>
                <AlertCircle size={14} aria-hidden="true" />
                {step1Error}
              </div>
            )}
          </div>
        )}

        {/* Step 1 — Song Details */}
        {step === 1 && (
          <div className="space-y-4">
            <StyledInput label="Song Title *" placeholder="Enter song title" value={title} onChange={setTitle} />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgba(196,181,212,0.8)' }}>
                Genre
              </label>
              <select
                value={genreId}
                onChange={(e) => setGenreId(e.target.value)}
                className="rounded-xl px-4 py-3 text-sm text-white outline-none"
                style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
              >
                <option value="" style={{ background: '#1a0533' }}>
                  Select genre
                </option>
                {genres.map((g) => (
                  <option key={g.id} value={g.id} style={{ background: '#1a0533' }}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
            <StyledInput label="Release Date" type="date" value={releaseDate} onChange={setReleaseDate} />
            <div
              className="flex items-center justify-between p-4 rounded-xl"
              style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(168,85,247,0.15)' }}
            >
              <span className="text-sm text-white">Explicit Content</span>
              <button
                onClick={() => setExplicit(!explicit)}
                role="switch"
                aria-checked={explicit}
                aria-label="Toggle explicit content"
                className="w-12 h-6 rounded-full transition-all relative focus-visible:outline focus-visible:outline-2 focus-visible:outline-purple-400"
                style={{ background: explicit ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'rgba(124,58,237,0.2)' }}
              >
                <div
                  className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                  style={{ left: explicit ? 'calc(100% - 20px)' : '4px' }}
                />
              </button>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgba(196,181,212,0.8)' }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell your fans about this track…"
                rows={3}
                maxLength={2000}
                className="rounded-xl px-4 py-3 text-sm text-white outline-none resize-none placeholder-purple-400/40"
                style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
              />
            </div>
            {step2Error && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.9)' }}>
                <AlertCircle size={14} aria-hidden="true" />
                {step2Error}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — Credits & Features */}
        {step === 2 && (
          <div className="space-y-4">
            {/* Featured Artists */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgba(196,181,212,0.8)' }}>Featured Artists</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Artist name"
                  value={featuredArtist}
                  onChange={(e) => setFeaturedArtist(e.target.value)}
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder-purple-400/40"
                  style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.2)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  className="px-4 py-3 rounded-xl text-sm font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                >
                  Add
                </button>
              </div>
            </div>
            {/* Producer */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgba(196,181,212,0.8)' }}>Producer(s)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Producer name"
                  value={producer}
                  onChange={(e) => setProducer(e.target.value)}
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder-purple-400/40"
                  style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.2)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  className="px-4 py-3 rounded-xl text-sm font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                >
                  Add
                </button>
              </div>
            </div>
            {/* Lyricist */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgba(196,181,212,0.8)' }}>Lyricist(s)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Lyricist name"
                  value={lyricist}
                  onChange={(e) => setLyricist(e.target.value)}
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder-purple-400/40"
                  style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.2)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  className="px-4 py-3 rounded-xl text-sm font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                >
                  Add
                </button>
              </div>
            </div>
            {/* Composer */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: 'rgba(196,181,212,0.8)' }}>Composer(s)</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. Composer name"
                  value={composer}
                  onChange={(e) => setComposer(e.target.value)}
                  className="flex-1 rounded-xl px-4 py-3 text-sm text-white outline-none transition-all placeholder-purple-400/40"
                  style={{ background: 'rgba(124,58,237,0.1)', border: '1px solid rgba(168,85,247,0.2)' }}
                  onFocus={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.6)'; e.target.style.boxShadow = '0 0 0 3px rgba(124,58,237,0.15)'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(168,85,247,0.2)'; e.target.style.boxShadow = 'none'; }}
                />
                <button
                  type="button"
                  className="px-4 py-3 rounded-xl text-sm font-bold text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 — Artwork */}
        {step === 3 && (
          <div className="space-y-4">
            <input
              ref={coverFileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              aria-label="Select cover art"
              onChange={handleCoverFileChange}
            />
            <button
              onClick={() => coverFileRef.current?.click()}
              className="w-full aspect-square max-w-xs mx-auto rounded-2xl flex flex-col items-center justify-center gap-3 transition-all hover:scale-[1.01] relative overflow-hidden"
              style={{ border: '2px dashed rgba(168,85,247,0.3)', background: 'rgba(124,58,237,0.05)' }}
              aria-label="Upload artwork"
            >
              {coverPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverPreview} alt="Cover preview" className="w-full h-full object-cover absolute inset-0 rounded-2xl" />
              ) : (
                <>
                  <Image size={40} className="text-purple-400/40" aria-hidden="true" />
                  <p className="text-white text-sm font-semibold">Upload Artwork</p>
                  <p className="text-xs" style={{ color: 'rgba(196,181,212,0.5)' }}>JPG, PNG, WebP · Max 10 MB</p>
                </>
              )}
            </button>
            {isCoverUploading && (
              <div className="flex items-center justify-center gap-2 text-sm text-purple-300/60">
                <Loader2 size={14} className="animate-spin" aria-hidden="true" />
                Uploading cover…
              </div>
            )}
            {step4Error && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.9)' }}>
                <AlertCircle size={14} aria-hidden="true" />
                {step4Error}
              </div>
            )}
          </div>
        )}

        {/* Step 4 — Publish */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="rounded-2xl p-5" style={{ background: 'linear-gradient(135deg,rgba(42,13,74,0.7),rgba(26,5,51,0.85))', border: '1px solid rgba(168,85,247,0.25)' }}>
              <p className="text-white font-bold mb-3">Review &amp; Publish</p>
              <div className="space-y-2 text-sm" style={{ color: 'rgba(196,181,212,0.7)' }}>
                <p><span className="text-purple-300/60 text-xs">Title:</span> {title || '—'}</p>
                <p><span className="text-purple-300/60 text-xs">Explicit:</span> {explicit ? 'Yes' : 'No'}</p>
              </div>
            </div>

            {/* Processing states */}
            {isProcessing && !step5Error && (
              <div className="flex items-center gap-3 p-4 rounded-xl" style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.2)' }}>
                <Loader2 size={18} className="text-blue-400 animate-spin shrink-0" aria-hidden="true" />
                <p className="text-blue-300 text-sm">Processing audio… This may take a moment.</p>
              </div>
            )}

            {isProcessingFailed && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.9)' }}>
                  <AlertCircle size={14} aria-hidden="true" />
                  {polledTrack?.processingError ?? 'Audio processing failed.'}
                </div>
                <button
                  onClick={() => { setStep(0); setTrackId(null); setAudioFile(null); setIsFinalized(false); setStep5Error(null); }}
                  className="w-full py-3 rounded-xl font-bold text-sm text-white"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                >
                  Re-upload Audio
                </button>
              </div>
            )}

            {step5Error && (
              <div className="flex items-center gap-2 p-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: 'rgba(252,165,165,0.9)' }}>
                <AlertCircle size={14} aria-hidden="true" />
                {step5Error}
              </div>
            )}

            <div className="p-4 rounded-xl text-sm" style={{ background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(168,85,247,0.15)', color: 'rgba(196,181,212,0.7)' }}>
              By submitting you confirm you own the rights to this content and agree to our terms.
            </div>
          </div>
        )}
      </main>

      {/* Navigation */}
      <div className="px-4 pb-4 flex gap-3">
        {step > 0 && step < 4 && (
          <button
            onClick={() => setStep((s) => s - 1)}
            className="flex-1 py-3 rounded-xl font-bold text-sm"
            style={{ border: '1px solid rgba(168,85,247,0.4)', color: '#a855f7' }}
          >
            Prev
          </button>
        )}

        {step === 0 && (
          <button
            onClick={handleStep1Next}
            disabled={!audioFile || isUploading}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}
          >
            {isUploading ? (
              <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Uploading…</>
            ) : (
              'Next'
            )}
          </button>
        )}

        {step === 1 && (
          <button
            onClick={handleStep2Next}
            disabled={updateTrack.isPending}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}
          >
            {updateTrack.isPending ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Saving…</> : 'Next'}
          </button>
        )}

        {step === 2 && (
          <button
            onClick={handleStep3Next}
            disabled={addCredit.isPending}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}
          >
            {addCredit.isPending ? <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Saving…</> : 'Next'}
          </button>
        )}

        {step === 3 && (
          <button
            onClick={handleStep4Next}
            disabled={isCoverUploading || finalizeUpload.isPending}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}
          >
            {isCoverUploading || finalizeUpload.isPending ? (
              <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Processing…</>
            ) : (
              'Finalize'
            )}
          </button>
        )}

        {step === 4 && isDraft && (
          <button
            onClick={handleSubmitForReview}
            disabled={submitTrack.isPending}
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)', boxShadow: '0 0 15px rgba(124,58,237,0.4)' }}
          >
            {submitTrack.isPending ? (
              <><Loader2 size={14} className="animate-spin" aria-hidden="true" /> Submitting…</>
            ) : (
              'Submit for Review'
            )}
          </button>
        )}

        {step === 4 && isProcessing && (
          <button
            disabled
            className="flex-1 py-3 rounded-xl font-bold text-sm text-white opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'rgba(124,58,237,0.3)' }}
          >
            <Loader2 size={14} className="animate-spin" aria-hidden="true" /> Processing…
          </button>
        )}
      </div>

      {/* Suppress unused variable warning for isFinalized */}
      {isFinalized && null}

      <BottomNav />
    </div>
  );
}
