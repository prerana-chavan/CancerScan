import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImageUploader({ onFileSelect }) {
    const [preview, setPreview] = useState(null);
    const [fileName, setFileName] = useState('');
    const [dragging, setDragging] = useState(false);
    const inputRef = useRef(null);

    const handleFile = useCallback((file) => {
        if (!file) return;
        const validTypes = ['image/jpeg', 'image/png', 'image/tiff'];
        if (!validTypes.includes(file.type) && !file.name.match(/\.(jpg|jpeg|png|tif|tiff)$/i)) {
            alert('Unsupported format. Please upload JPG, PNG, or TIFF.');
            return;
        }
        setFileName(file.name);
        const reader = new FileReader();
        reader.onload = (e) => setPreview(e.target.result);
        reader.readAsDataURL(file);
        onFileSelect(file);
    }, [onFileSelect]);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        handleFile(file);
    }, [handleFile]);

    const handleDragOver = (e) => { e.preventDefault(); setDragging(true); };
    const handleDragLeave = () => setDragging(false);

    return (
        <div className="space-y-3">
            {/* Drop Zone */}
            <div
                className={`drop-zone relative flex flex-col items-center justify-center p-6 min-h-[200px] transition-all ${dragging ? 'drag-over' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
            >
                <input
                    ref={inputRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.tif,.tiff"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files[0])}
                />

                <AnimatePresence mode="wait">
                    {preview ? (
                        <motion.div
                            key="preview"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-3"
                        >
                            <img
                                src={preview}
                                alt="Slide preview"
                                className="max-h-[180px] rounded-lg border border-[var(--color-field-border)] object-contain"
                            />
                            <p className="text-sm text-[var(--color-muted)]">{fileName}</p>
                        </motion.div>
                    ) : (
                        <motion.div
                            key="placeholder"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="flex flex-col items-center gap-3 text-[var(--color-muted)]"
                        >
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[var(--color-cyan)] opacity-60">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                                <polyline points="17 8 12 3 7 8" />
                                <line x1="12" y1="3" x2="12" y2="15" />
                            </svg>
                            <div className="text-center">
                                <p className="text-sm font-medium">Drop histopathology slide here</p>
                                <p className="text-xs mt-1 opacity-60">or click to browse · JPG, PNG, TIFF</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Change Image button */}
            {preview && (
                <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                    className="text-xs text-[var(--color-cyan)] hover:text-[var(--color-cyan-glow)] transition-colors cursor-pointer"
                >
                    ↺ Change image
                </motion.button>
            )}
        </div>
    );
}
