import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/services/api';

interface UploadPanelProps {
  tier: 'free' | 'plus' | 'pro';
  onUploadStart: (jobId: string) => void;
}

const MODES = [
  { key: 'transcript', label: 'TRANSCRIPT', description: 'Raw transcription with timestamps' },
  { key: 'clean', label: 'CLEAN', description: 'Edited transcript without filler words' },
  { key: 'summary', label: 'SUMMARY', description: 'Concise summary of key points' },
  { key: 'clips', label: 'CLIPS', description: 'Best segments for short-form video' },
];

export function UploadPanel({ tier, onUploadStart }: UploadPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedModes, setSelectedModes] = useState<string[]>(['transcript']);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const { session } = useAuth();

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      setSelectedFile(files[0]);
      setError('');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFile(files[0]);
      setError('');
    }
  }, []);

  const toggleMode = useCallback((mode: string) => {
    setSelectedModes(prev => {
      if (prev.includes(mode)) {
        return prev.filter(m => m !== mode);
      }
      return [...prev, mode];
    });
  }, []);

  const handleUpload = async () => {
    if (!selectedFile || !session?.access_token) return;
    if (selectedModes.length === 0) {
      setError('Select at least one processing mode');
      return;
    }

    setIsUploading(true);
    setError('');

    try {
      const result = await api.upload(selectedFile, selectedModes, session.access_token);
      onUploadStart(result.job_id);
      setSelectedFile(null);
      setSelectedModes(['transcript']);
    } catch (err: any) {
      setError(err.message || 'Upload failed');
    }

    setIsUploading(false);
  };

  const isModeLocked = (mode: string) => {
    return tier === 'free' && (mode === 'summary' || mode === 'clips');
  };

  return (
    <div className="surface p-6">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`drop-zone rounded p-8 text-center cursor-pointer transition-all ${
          isDragging ? 'drag-over' : ''
        }`}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          accept="video/*,audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {selectedFile ? (
          <div className="flex items-center justify-center gap-3">
            <div className="pulse-dot" />
            <span className="font-mono text-neon-red">{selectedFile.name}</span>
          </div>
        ) : (
          <>
            <img 
              src="/static/logo-cat.png" 
              alt="Upload" 
              className="w-20 h-20 mx-auto mb-4 opacity-80"
              style={{ filter: 'drop-shadow(0 0 10px rgba(232,21,27,0.4))' }}
            />
            <p className="font-display font-bold text-lg tracking-widest uppercase text-chrome mb-2">
              Drop Evidence Here
            </p>
            <p className="font-mono text-xs text-chrome-dim">
              MP4 · MOV · MP3 · WAV · M4A and more
            </p>
          </>
        )}
      </div>

      <div className="mt-6">
        <p className="section-label mb-4">Processing Modes</p>
        <div className="grid sm:grid-cols-2 gap-3">
          {MODES.map((mode) => {
            const locked = isModeLocked(mode.key);
            const selected = selectedModes.includes(mode.key);

            return (
              <label
                key={mode.key}
                className={`flex items-start gap-3 p-3 border border-border-dim rounded cursor-pointer transition-all ${
                  locked ? 'opacity-30 cursor-not-allowed' : 'hover:border-chrome-dim'
                } ${selected && !locked ? 'border-neon-red bg-neon-red/5' : ''}`}
              >
                <input
                  type="checkbox"
                  checked={selected}
                  disabled={locked}
                  onChange={() => toggleMode(mode.key)}
                  className="custom-checkbox mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-display font-semibold text-sm tracking-wider uppercase text-chrome">
                      {mode.label}
                    </span>
                    {locked && (
                      <span className="font-mono text-xs text-neon-red">UPGRADE</span>
                    )}
                  </div>
                  <p className="font-body text-xs text-chrome-dim mt-1">
                    {mode.description}
                  </p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {error && (
        <div className="mt-4 font-mono text-sm text-neon-red">
          ▸ {error}
        </div>
      )}

      <button
        onClick={handleUpload}
        disabled={!selectedFile || selectedModes.length === 0 || isUploading}
        className="w-full btn-primary mt-6 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isUploading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="pulse-dot" />
            Uploading...
          </span>
        ) : (
          'Initiate Processing'
        )}
      </button>
    </div>
  );
}
