import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, FileVideo } from 'lucide-react';

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    maxFiles?: number;
    accept?: Record<string, string[]>;
    maxSize?: number; // in bytes
}

type PreviewItem = { file: File; url: string; type: 'image' | 'video'; key: string };

const fileKey = (file: File) => `${file.name}:${file.size}:${file.lastModified}`;

export const FileUploader: React.FC<FileUploaderProps> = ({
    onFilesSelected,
    maxFiles = 5,
    accept = {
        'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
        'video/*': ['.mp4', '.mov', '.webm']
    },
    maxSize = 50 * 1024 * 1024 // 50MB default
}) => {
    const [previews, setPreviews] = useState<PreviewItem[]>([]);
    const previewsRef = useRef<PreviewItem[]>([]);
    const onFilesSelectedRef = useRef(onFilesSelected);
    onFilesSelectedRef.current = onFilesSelected;

    useEffect(() => {
        previewsRef.current = previews;
        onFilesSelectedRef.current(previews.map((p) => p.file));
    }, [previews]);

    useEffect(() => {
        return () => {
            previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url));
        };
    }, []);

    const onDrop = useCallback((acceptedFiles: File[]) => {
        if (!acceptedFiles.length) return;

        const prev = previewsRef.current;
        const remaining = maxFiles - prev.length;
        if (remaining <= 0) return;

        const seen = new Set(prev.map((p) => p.key));
        const toAdd: PreviewItem[] = [];

        for (const file of acceptedFiles) {
            if (toAdd.length >= remaining) break;
            const key = fileKey(file);
            if (seen.has(key)) continue;
            seen.add(key);
            toAdd.push({
                file,
                key,
                url: URL.createObjectURL(file),
                type: file.type.startsWith('video') ? 'video' : 'image',
            });
        }

        if (toAdd.length === 0) return;

        const next = [...prev, ...toAdd];
        previewsRef.current = next;
        setPreviews(next);
    }, [maxFiles]);

    const removeFile = useCallback((index: number) => {
        const prev = previewsRef.current;
        const removed = prev[index];
        if (removed) URL.revokeObjectURL(removed.url);
        const next = prev.filter((_, i) => i !== index);
        previewsRef.current = next;
        setPreviews(next);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxSize,
        maxFiles,
        multiple: true,
    });

    return (
        <div className="space-y-4">
            {previews.length < maxFiles && (
                <div
                    {...getRootProps()}
                    className={`
                        border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors duration-200
                        ${isDragActive
                            ? 'border-gold-500 bg-gold-500/10'
                            : 'border-white/10 hover:border-white/30 bg-white/5'}
                    `}
                >
                    <input {...getInputProps()} />
                    <UploadCloud className={`mb-3 ${isDragActive ? 'text-gold-400' : 'text-white/40'}`} size={32} />
                    <p className="text-sm text-white/70 font-medium text-center">
                        {isDragActive ? 'Drop files here...' : 'Click or Drag to Upload Evidence'}
                    </p>
                    <p className="text-xs text-white/40 mt-2 text-center">
                        Images & Videos up to {maxSize / 1024 / 1024}MB
                    </p>
                </div>
            )}

            {previews.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {previews.map((preview, index) => (
                        <div
                            key={preview.key}
                            className="relative group rounded-lg overflow-hidden border border-white/10 aspect-square bg-black/40"
                        >
                            {preview.type === 'video' ? (
                                <div className="w-full h-full flex items-center justify-center text-white/50">
                                    <video src={preview.url} className="w-full h-full object-cover opacity-60" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <FileVideo size={32} className="text-white/80" />
                                    </div>
                                </div>
                            ) : (
                                <img src={preview.url} alt="preview" className="w-full h-full object-cover" />
                            )}

                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    removeFile(index);
                                }}
                                className="absolute top-2 right-2 p-1 bg-red-500/80 hover:bg-red-500 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={14} />
                            </button>

                            <div className="absolute bottom-0 inset-x-0 p-2 bg-gradient-to-t from-black/80 to-transparent text-[10px] text-white/70 truncate">
                                {preview.file.name}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
