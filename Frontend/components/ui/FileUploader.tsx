import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, FileVideo } from 'lucide-react';

interface FileUploaderProps {
    onFilesSelected: (files: File[]) => void;
    maxFiles?: number;
    accept?: Record<string, string[]>;
    maxSize?: number; // in bytes
}

export const FileUploader: React.FC<FileUploaderProps> = ({
    onFilesSelected,
    maxFiles = 5,
    accept = {
        'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
        'video/*': ['.mp4', '.mov', '.webm']
    },
    maxSize = 50 * 1024 * 1024 // 50MB default
}) => {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<{ file: File; url: string; type: 'image' | 'video' }[]>([]);
    const previewsRef = useRef(previews);
    previewsRef.current = previews;

    const onDrop = useCallback((acceptedFiles: File[]) => {
        setFiles((prevFiles) => {
            const newFiles = [...prevFiles, ...acceptedFiles].slice(0, maxFiles);
            onFilesSelected(newFiles);

            const newPreviews = acceptedFiles.map((file) => ({
                file,
                url: URL.createObjectURL(file),
                type: (file.type.startsWith('video') ? 'video' : 'image') as 'image' | 'video',
            }));

            setPreviews((prev) => [...prev, ...newPreviews].slice(0, maxFiles));
            return newFiles;
        });
    }, [maxFiles, onFilesSelected]);

    const removeFile = useCallback((index: number) => {
        setPreviews((prevPreviews) => {
            const removed = prevPreviews[index];
            if (removed) URL.revokeObjectURL(removed.url);
            const newPreviews = prevPreviews.filter((_, i) => i !== index);

            setFiles((prevFiles) => {
                const newFiles = prevFiles.filter((_, i) => i !== index);
                onFilesSelected(newFiles);
                return newFiles;
            });

            return newPreviews;
        });
    }, [onFilesSelected]);

    useEffect(() => {
        return () => {
            previewsRef.current.forEach((p) => URL.revokeObjectURL(p.url));
        };
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept,
        maxSize,
        maxFiles,
    });

    return (
        <div className="space-y-4">
            {files.length < maxFiles && (
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
                            key={`${preview.url}-${index}`}
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
