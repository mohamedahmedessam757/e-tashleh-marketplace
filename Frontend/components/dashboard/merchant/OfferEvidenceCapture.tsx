import React, { useRef, useState } from 'react';
import { Camera, Video, X, Loader2, AlertCircle } from 'lucide-react';

const MAX_PHOTOS = 6;
const MAX_VIDEO = 1;

export interface OfferEvidenceCaptureProps {
  imageUrls: string[];
  videoUrl?: string | null;
  uploading?: boolean;
  error?: boolean;
  isAr: boolean;
  onCapturePhoto: (file: File) => Promise<void>;
  onCaptureVideo: (file: File) => Promise<void>;
  onRemoveImage: (index: number) => void;
  onRemoveVideo: () => void;
}

/**
 * Camera-first evidence for merchant offers (capture=environment).
 * Gallery is not the primary path — device camera is required.
 */
export const OfferEvidenceCapture: React.FC<OfferEvidenceCaptureProps> = ({
  imageUrls,
  videoUrl,
  uploading,
  error,
  isAr,
  onCapturePhoto,
  onCaptureVideo,
  onRemoveImage,
  onRemoveVideo,
}) => {
  const photoRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLInputElement>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const handlePhoto = async (files: FileList | null) => {
    if (!files?.length) return;
    setLocalError(null);
    if (imageUrls.length >= MAX_PHOTOS) {
      setLocalError(isAr ? 'تم الوصول للحد الأقصى من الصور' : 'Maximum photos reached');
      return;
    }
    const file = files[0];
    if (!file.type.startsWith('image/')) return;
    if (file.size > 15 * 1024 * 1024) {
      setLocalError(isAr ? 'حجم الصورة كبير جداً (حد 15MB)' : 'Photo too large (max 15MB)');
      return;
    }
    await onCapturePhoto(file);
  };

  const handleVideo = async (files: FileList | null) => {
    if (!files?.length) return;
    setLocalError(null);
    if (videoUrl) {
      setLocalError(isAr ? 'فيديو واحد فقط مسموح' : 'Only one video allowed');
      return;
    }
    const file = files[0];
    if (!file.type.startsWith('video/')) return;
    if (file.size > 50 * 1024 * 1024) {
      setLocalError(isAr ? 'حجم الفيديو كبير جداً (حد 50MB)' : 'Video too large (max 50MB)');
      return;
    }
    await onCaptureVideo(file);
  };

  return (
    <div className="space-y-3">
      <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-relaxed">
        {isAr
          ? 'التصوير بالكاميرا إلزامي لصورة واحدة على الأقل. يمكنك التقاط عدة صور. الفيديو اختياري.'
          : 'Live camera photo required (at least one). Multiple photos allowed. Video is optional.'}
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          disabled={uploading || imageUrls.length >= MAX_PHOTOS}
          onClick={() => photoRef.current?.click()}
          className={`group flex flex-col items-center justify-center gap-2 p-4 min-h-[88px] rounded-2xl border bg-white/[0.02] transition-colors border-gold-500/20 hover:border-gold-500/50 hover:bg-gold-500/5 disabled:opacity-40 ${
            error && imageUrls.length === 0 ? 'border-red-500/50 ring-1 ring-red-500/30' : ''
          }`}
        >
          {uploading ? (
            <Loader2 className="w-5 h-5 text-gold-500 animate-spin" />
          ) : (
            <Camera className="w-5 h-5 text-white/40 group-hover:text-gold-400" />
          )}
          <span className="text-xs text-white/60 group-hover:text-gold-400">
            {isAr ? 'التقاط صورة بالكاميرا' : 'Capture photo with camera'}
          </span>
          <span className="text-[9px] text-white/25">
            {imageUrls.length}/{MAX_PHOTOS}
          </span>
        </button>
        <button
          type="button"
          disabled={uploading || !!videoUrl}
          onClick={() => videoRef.current?.click()}
          className="group flex flex-col items-center justify-center gap-2 p-4 min-h-[88px] rounded-2xl border bg-white/[0.02] transition-colors border-cyan-500/20 hover:border-cyan-500/50 hover:bg-cyan-500/5 disabled:opacity-40"
        >
          <Video className="w-5 h-5 text-white/40 group-hover:text-cyan-400" />
          <span className="text-xs text-white/60 group-hover:text-cyan-400">
            {isAr ? 'تصوير فيديو (اختياري)' : 'Record video (optional)'}
          </span>
          <span className="text-[9px] text-white/25">
            {videoUrl ? 1 : 0}/{MAX_VIDEO}
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
          void handlePhoto(e.target.files);
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
          void handleVideo(e.target.files);
          e.target.value = '';
        }}
      />

      {(imageUrls.length > 0 || videoUrl) && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {imageUrls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40"
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onRemoveImage(i)}
                className="absolute top-1.5 end-1.5 w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/80"
                aria-label={isAr ? 'حذف' : 'Remove'}
              >
                <X size={14} />
              </button>
            </div>
          ))}
          {videoUrl && (
            <div className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/40">
              <video src={videoUrl} className="w-full h-full object-cover" muted playsInline />
              <button
                type="button"
                onClick={onRemoveVideo}
                className="absolute top-1.5 end-1.5 w-7 h-7 rounded-full bg-black/70 border border-white/20 flex items-center justify-center text-white/80"
                aria-label={isAr ? 'حذف الفيديو' : 'Remove video'}
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      )}

      {(localError || (error && imageUrls.length === 0)) && (
        <p className="text-red-400 text-xs flex items-center gap-1">
          <AlertCircle size={12} />
          {localError ||
            (isAr ? 'يجب التقاط صورة واحدة على الأقل بالكاميرا' : 'At least one camera photo is required')}
        </p>
      )}
    </div>
  );
};
