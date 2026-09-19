import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Camera, Video, X, AlertCircle } from 'lucide-react';

const MAX_PHOTOS = 4;
const MAX_VIDEO = 1;
const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 50 * 1024 * 1024;

export interface EvidenceCaptureFieldProps {
  files: File[];
  onChange: (files: File[]) => void;
  isAr: boolean;
  accent?: 'cyan' | 'red';
  showError?: boolean;
  labels?: {
    capturePhoto?: string;
    optionalVideo?: string;
    requiredHint?: string;
    maxReached?: string;
    photoRequired?: string;
  };
}

/**
 * Live camera capture for return/dispute evidence (anti-tamper).
 * Photos required via capture=environment; one optional video.
 */
export const EvidenceCaptureField: React.FC<EvidenceCaptureFieldProps> = ({
  files,
  onChange,
  isAr,
  accent = 'cyan',
  showError = false,
  labels = {},
}) => {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [previews, setPreviews] = useState<{ url: string; kind: 'image' | 'video'; name: string }[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  const accentBtn =
    accent === 'red'
      ? 'border-red-500/20 hover:border-red-500/50 hover:bg-red-500/5'
      : 'border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-500/5';
  const accentIcon = accent === 'red' ? 'group-hover:text-red-400' : 'group-hover:text-cyan-400';

  const photos = files.filter((f) => f.type.startsWith('image/'));
  const videos = files.filter((f) => f.type.startsWith('video/'));

  useEffect(() => {
    const next = files.map((f) => ({
      url: URL.createObjectURL(f),
      kind: (f.type.startsWith('video/') ? 'video' : 'image') as 'image' | 'video',
      name: f.name,
    }));
    setPreviews(next);
    return () => {
      next.forEach((p) => URL.revokeObjectURL(p.url));
    };
  }, [files]);

  const mergeFiles = useCallback(
    (incoming: FileList | null, kind: 'image' | 'video') => {
      if (!incoming?.length) return;
      setLocalError(null);
      const list = Array.from(incoming);
      const accepted: File[] = [];

      for (const file of list) {
        if (kind === 'image') {
          if (!file.type.startsWith('image/')) continue;
          if (file.size > MAX_PHOTO_BYTES) {
            setLocalError(
              isAr ? 'حجم الصورة كبير جداً (حد 15MB)' : 'Photo too large (max 15MB)',
            );
            continue;
          }
          accepted.push(file);
        } else {
          if (!file.type.startsWith('video/')) continue;
          if (file.size > MAX_VIDEO_BYTES) {
            setLocalError(
              isAr ? 'حجم الفيديو كبير جداً (حد 50MB)' : 'Video too large (max 50MB)',
            );
            continue;
          }
          accepted.push(file);
        }
      }

      if (kind === 'image') {
        const room = MAX_PHOTOS - photos.length;
        if (room <= 0) {
          setLocalError(
            labels.maxReached ||
              (isAr ? 'تم الوصول للحد الأقصى من الصور' : 'Maximum photos reached'),
          );
          return;
        }
        onChange([...files.filter((f) => f.type.startsWith('video/')), ...photos, ...accepted.slice(0, room)]);
      } else {
        if (videos.length >= MAX_VIDEO) {
          setLocalError(
            labels.maxReached ||
              (isAr ? 'فيديو واحد فقط مسموح' : 'Only one video allowed'),
          );
          return;
        }
        const video = accepted[0];
        if (!video) return;
        onChange([...photos, video]);
      }
    },
    [files, photos, videos.length, onChange, isAr, labels.maxReached],
  );

  const removeAt = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  const capturePhotoLabel =
    labels.capturePhoto || (isAr ? 'التقاط صورة بالكاميرا' : 'Capture photo with camera');
  const optionalVideoLabel =
    labels.optionalVideo || (isAr ? 'تصوير فيديو (اختياري)' : 'Record video (optional)');
  const requiredHint =
    labels.requiredHint ||
    (isAr
      ? 'يلزم صورة ملتقطة بالكاميرا لإثبات الحالة ومنع التلاعب'
      : 'A live camera photo is required to prove condition and prevent tampering');
  const photoRequired =
    labels.photoRequired ||
    (isAr ? 'يجب التقاط صورة واحدة على الأقل' : 'At least one camera photo is required');

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">
        {requiredHint}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => photoRef.current?.click()}
          className={`group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border bg-white/[0.02] transition-colors ${accentBtn}`}
        >
          <Camera className={`w-5 h-5 text-white/40 ${accentIcon}`} />
          <span className={`text-xs text-white/60 ${accentIcon}`}>{capturePhotoLabel}</span>
          <span className="text-[9px] text-white/25">
            {photos.length}/{MAX_PHOTOS}
          </span>
        </button>
        <button
          type="button"
          onClick={() => videoRef.current?.click()}
          className={`group flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border bg-white/[0.02] transition-colors ${accentBtn}`}
        >
          <Video className={`w-5 h-5 text-white/40 ${accentIcon}`} />
          <span className={`text-xs text-white/60 ${accentIcon}`}>{optionalVideoLabel}</span>
          <span className="text-[9px] text-white/25">
            {videos.length}/{MAX_VIDEO}
          </span>
        </button>
      </div>

      <input
        ref={photoRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          mergeFiles(e.target.files, 'image');
          e.target.value = '';
        }}
      />
      <input
        ref={videoRef}
        type="file"
        accept="video/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          mergeFiles(e.target.files, 'video');
          e.target.value = '';
        }}
      />

      {previews.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {previews.map((p, i) => (
            <div
              key={`${p.name}-${i}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40"
            >
              {p.kind === 'video' ? (
                <video src={p.url} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <img src={p.url} alt="" className="w-full h-full object-cover" />
              )}
              <button
                type="button"
                onClick={() => removeAt(i)}
                className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/80 hover:text-white"
                aria-label="Remove"
              >
                <X size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {(localError || (showError && photos.length === 0)) && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <AlertCircle size={12} />
          {localError || photoRequired}
        </p>
      )}
    </div>
  );
};
