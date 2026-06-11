import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X, FileVideo, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

    const onDrop = useCallback((acceptedFiles: File[]) => {
        const newFiles = [...files, ...acceptedFiles].slice(0, maxFiles);
        setFiles(newFiles);
        onFilesSelected(newFiles);

        // Generate Previews
        const newPreviews = acceptedFiles.map(file => ({
            file,
            url: URL.createObjectURL(file),
            type: file.type.startsWith('video') ? 'video' : 'image' as 'image' | 'video'
        }));

        setPreviews(prev => [...prev, ...newPreviews].slice(0, maxFiles));
    }, [files, maxFiles, onFilesSelected]);

    const removeFile = (index: number) => {
        const newFiles = files.filter((_, i) => i !== index);
        const newPreviews = previews.filter((_, i) => i !== index);

        // Revoke URL to avoid memory leaks
        URL.revokeObjectURL(previews[index].url);

        setFiles(newFiles);
        setPreviews(newPreviews);
        onFilesSelected(newFiles);
    };

    const dropzoneOptions: any = {
        onDrop,
        accept,
        maxSize,
        maxFiles: maxFiles - files.length,
        disabled: files.length >= maxFiles,
        multiple: true
    };
    const { getRootProps, getInputProps, isDragActive } = useDropzone(dropzoneOptions);

    return (
        <div className="space-y-4">
            {/* Dropzone Area */}
            {files.length < maxFiles && (
                <div
                    {...getRootProps()}
                    className={`
                        border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-all duration-300
                        ${isDragActive
                            ? 'border-cyan-500 bg-cyan-500/10'
                            : 'border-white/10 hover:border-cyan-500/50 hover:bg-white/5'
                        }
                    `}
                >
                    <input {...getInputProps()} />
                    <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                        <UploadCloud size={24} className={`text-white/50 ${isDragActive ? 'text-cyan-400' : ''}`} />
                    </div>
                    <p className="text-sm text-white/70 font-medium text-center">
                        {isDragActive ? 'Drop files here...' : 'Click or Drag to Upload Evidence'}
                    </p>
                    <p className="text-xs text-white/40 mt-2 text-center">
                        Images & Videos up to {maxSize / 1024 / 1024}MB
                    </p>
                </div>
            )}

            {/* Previews Grid */}
            <AnimatePresence>
                {previews.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {previews.map((preview, index) => (
                            <motion.div
                                key={preview.url}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                layout
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

                                {/* Remove Button */}
                                <button
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
                            </motion.div>
                        ))}
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};
