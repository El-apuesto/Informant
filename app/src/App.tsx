import { useState, useEffect, useRef } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { LandingPage } from '@/components/LandingPage';
import { SpyChaseGame } from '@/components/SpyChaseGame';
import { Leaderboard } from '@/components/Leaderboard';
import { Upload, FileAudio, FileVideo, Download, LogOut, Sparkles, Zap, Film, AlertCircle, Loader2, ChevronLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import './App.css';

type Screen = 'landing' | 'auth' | 'upload' | 'processing' | 'game' | 'results';

function AppContent() {
  const { isLoading, isAuthenticated, login, register, logout } = useAuth();
  const [currentScreen, setCurrentScreen] = useState<Screen>('landing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [modes, setModes] = useState({ transcript: true, clean: true, summary: false, clips: false });
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobProgress, setJobProgress] = useState(0);
  const [jobStatus, setJobStatus] = useState<string>('');
  const [estimatedMinutes, setEstimatedMinutes] = useState(1);
  
  // Results state
  const [outputFiles, setOutputFiles] = useState<Record<string, string>>({});
  
  // Game state
  const [gameScore, setGameScore] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isAuthenticated && currentScreen === 'landing') {
      setCurrentScreen('upload');
    }
  }, [isAuthenticated, currentScreen]);

  const handleGetStarted = () => {
    setCurrentScreen('auth');
  };

  // Poll job status
  useEffect(() => {
    if (jobId && currentScreen === 'game') {
      pollInterval.current = setInterval(async () => {
        try {
          const { api } = await import('@/services/api');
          const job = await api.getJobStatus(jobId);
          setJobProgress(job.progress);
          setJobStatus(job.status);
          
          if (job.status === 'completed') {
            if (pollInterval.current) clearInterval(pollInterval.current);
            setOutputFiles(job.output_files || {});
            toast.success('Mission complete! Files ready for extraction.');
          } else if (job.status === 'failed') {
            if (pollInterval.current) clearInterval(pollInterval.current);
            toast.error('Mission failed: ' + (job.error || 'Unknown error'));
          }
        } catch (e) {
          console.error('Poll error:', e);
        }
      }, 2000);
      
      return () => {
        if (pollInterval.current) clearInterval(pollInterval.current);
      };
    }
  }, [jobId, currentScreen]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      if (isLoginMode) {
        await login(email, password);
      } else {
        await register(email, password);
      }
      setCurrentScreen('upload');
      toast.success(isLoginMode ? 'Welcome back, operative.' : 'Access granted. Welcome to the network.');
    } catch (error: any) {
      setAuthError(error.message || 'Authentication failed');
    }
  };

  const handleLogout = async () => {
    await logout();
    setCurrentScreen('auth');
    setEmail('');
    setPassword('');
    toast.info('Session terminated.');
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      toast.error('Only video and audio files accepted');
      return;
    }
    setSelectedFile(file);
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;
    const selectedModes = Object.entries(modes).filter(([, v]) => v).map(([k]) => k);
    if (selectedModes.length === 0) {
      toast.error('Select at least one output');
      return;
    }

    try {
      const { api } = await import('@/services/api');
      const result = await api.uploadFile(selectedFile, selectedModes);
      setJobId(result.job_id);
      setEstimatedMinutes(result.estimated_minutes);
      setJobProgress(0);
      setJobStatus('queued');
      setCurrentScreen('game');
      toast.success('Evidence uploaded. Escape while we process!');
    } catch (error: any) {
      toast.error(error.message || 'Upload failed');
    }
  };

  const handleGameOver = async (score: number, survivalTime: number) => {
    setGameScore(score);
    try {
      const { api } = await import('@/services/api');
      await api.submitGameScore(score, survivalTime);
    } catch (e) {
      console.error('Failed to save score:', e);
    }
  };

  const handleDownload = async (fileType: string) => {
    if (!jobId) return;
    try {
      const { api } = await import('@/services/api');
      const blob = await api.downloadFile(jobId, fileType);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${jobId}_${fileType}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('File extracted successfully');
    } catch (e) {
      toast.error('Extraction failed');
    }
  };

  // Render auth screen
  const renderAuth = () => (
    <div className="screen flex flex-col items-center justify-center min-h-[80vh] px-4">
      <div className="text-center mb-8">
        <img src="/static/combined.PNG" alt="n4mint" className="h-32 mx-auto mb-4 animate-glitch" />
        <h1 className="font-audiowide text-3xl text-[#ffd700] animate-text-flicker mb-2">n4mint</h1>
        <p className="text-[#3c6e47] text-sm tracking-[0.3em] uppercase">Intelligence Network</p>
      </div>

      <div className="w-full max-w-md bg-[#10141c] border border-[#2a3b4f] p-8">
        <h2 className="font-audiowide text-xl text-[#ffd700] text-center mb-6">
          {isLoginMode ? 'IDENTIFY YOURSELF' : 'REQUEST ACCESS'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-4">
          <Input type="email" placeholder="OPERATIVE EMAIL" value={email} onChange={(e) => setEmail(e.target.value)} 
            className="bg-[#080a0f] border-[#2a3b4f] text-[#e0ffe0] placeholder:text-[#3c6e47] font-mono" required />
          <Input type="password" placeholder="CLEARANCE CODE" value={password} onChange={(e) => setPassword(e.target.value)} 
            className="bg-[#080a0f] border-[#2a3b4f] text-[#e0ffe0] placeholder:text-[#3c6e47] font-mono" required minLength={6} />

          {authError && (
            <div className="flex items-center gap-2 text-[#ff4d00] text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{authError}</span>
            </div>
          )}

          <Button type="submit" className="w-full bg-transparent border border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#080a0f] font-audiowide">
            {isLoginMode ? 'ENTER' : 'REQUEST ACCESS'}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={() => { setIsLoginMode(!isLoginMode); setAuthError(''); }} 
            className="text-[#3c6e47] text-sm hover:text-[#ffd700] underline">
            {isLoginMode ? 'Need access? Request here' : 'Have clearance? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );

  // Render upload screen
  const renderUpload = () => (
    <div className="screen flex flex-col items-center px-4 py-8 max-w-3xl mx-auto">
      <h2 className="font-audiowide text-2xl text-[#ffd700] mb-8">SUBMIT EVIDENCE</h2>

      <div className="w-full bg-[#10141c] border border-[#2a3b4f] p-8">
        <div className="mb-6">
          <label className="text-[#ffd700] text-sm mb-4 block">SELECT OUTPUTS:</label>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={modes.transcript} onCheckedChange={(c) => setModes(m => ({ ...m, transcript: c as boolean }))} />
              <span className="text-[#e0ffe0] flex items-center gap-2"><FileAudio className="w-4 h-4" /> RAW TRANSCRIPT</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={modes.clean} onCheckedChange={(c) => setModes(m => ({ ...m, clean: c as boolean }))} />
              <span className="text-[#e0ffe0] flex items-center gap-2"><Sparkles className="w-4 h-4" /> CLEANED</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={modes.summary} onCheckedChange={(c) => setModes(m => ({ ...m, summary: c as boolean }))} />
              <span className="text-[#e0ffe0] flex items-center gap-2"><Zap className="w-4 h-4" /> SUMMARY</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox checked={modes.clips} onCheckedChange={(c) => setModes(m => ({ ...m, clips: c as boolean }))} />
              <span className="text-[#e0ffe0] flex items-center gap-2"><Film className="w-4 h-4" /> CLIPS</span>
            </label>
          </div>
        </div>

        <div onClick={() => fileInputRef.current?.click()} 
          className={`border-2 border-dashed border-[#2a3b4f] rounded-lg p-12 text-center cursor-pointer hover:border-[#ffd700] ${selectedFile ? 'border-[#ffd700]' : ''}`}>
          <input ref={fileInputRef} type="file" accept="video/*,audio/*" 
            onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])} className="hidden" />
          {selectedFile ? (
            <div>
              {selectedFile.type.startsWith('video/') ? <FileVideo className="w-12 h-12 mx-auto text-[#ffd700] mb-3" /> : <FileAudio className="w-12 h-12 mx-auto text-[#ffd700] mb-3" />}
              <p className="text-[#e0ffe0] font-mono">{selectedFile.name}</p>
              <p className="text-[#3c6e47] text-sm">{(selectedFile.size / 1024 / 1024).toFixed(1)} MB</p>
            </div>
          ) : (
            <div>
              <Upload className="w-12 h-12 mx-auto text-[#3c6e47] mb-3" />
              <p className="text-[#3c6e47] font-mono">DROP EVIDENCE OR TAP TO UPLOAD</p>
            </div>
          )}
        </div>

        <Button onClick={handleSubmit} disabled={!selectedFile} 
          className="w-full mt-6 border border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#080a0f] font-audiowide disabled:opacity-40">
          <Zap className="w-4 h-4 mr-2" /> TRANSMIT & ESCAPE
        </Button>
      </div>
    </div>
  );

  // Render game screen
  const renderGame = () => (
    <div className="screen flex flex-col h-full">
      {/* Progress bar */}
      <div className="bg-[#10141c] border-b border-[#2a3b4f] p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[#ffd700] font-audiowide text-sm">PROCESSING EVIDENCE</span>
          <span className="text-[#e0ffe0] font-mono text-sm">{jobProgress}%</span>
        </div>
        <div className="h-2 bg-[#2a3b4f] rounded-full overflow-hidden">
          <div className="h-full bg-[#ffd700] transition-all duration-500" style={{ width: `${jobProgress}%` }} />
        </div>
        <p className="text-[#3c6e47] text-xs mt-2 font-mono">
          {jobStatus === 'completed' ? 'EXTRACTION COMPLETE - RETURN TO BASE' : `EST. TIME: ${estimatedMinutes} MIN - ESCAPE TO SURVIVE`}
        </p>
      </div>

      {/* Game container */}
      <div className="flex-1 relative">
        <SpyChaseGame onGameOver={handleGameOver} isComplete={jobStatus === 'completed'} />
        
        {jobStatus === 'completed' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <div className="bg-[#10141c] border border-[#ffd700] p-8 text-center max-w-md">
              <h3 className="font-audiowide text-2xl text-[#ffd700] mb-4">MISSION ACCOMPLISHED</h3>
              <p className="text-[#e0ffe0] mb-2">Evidence processed successfully</p>
              <p className="text-[#3c6e47] mb-6">Your escape score: {gameScore.toLocaleString()}</p>
              <Button onClick={() => setCurrentScreen('results')} className="border border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#080a0f] font-audiowide">
                EXTRACT FILES
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Leaderboard toggle */}
      <div className="bg-[#10141c] border-t border-[#2a3b4f] p-2 flex justify-center gap-4">
        <button onClick={() => setShowLeaderboard(!showLeaderboard)} className="text-[#3c6e47] hover:text-[#ffd700] text-sm flex items-center gap-2">
          <Trophy className="w-4 h-4" /> {showLeaderboard ? 'HIDE' : 'SHOW'} LEADERBOARD
        </button>
      </div>

      {showLeaderboard && (
        <div className="bg-[#10141c] border-t border-[#2a3b4f] p-4 max-h-48 overflow-auto">
          <Leaderboard />
        </div>
      )}
    </div>
  );

  // Render results screen
  const renderResults = () => {
    const files = Object.entries(outputFiles);
    
    return (
      <div className="screen flex flex-col items-center px-4 py-8 max-w-4xl mx-auto">
        <h2 className="font-audiowide text-2xl text-[#ffd700] mb-8">EXTRACTION COMPLETE</h2>

        <div className="w-full bg-[#10141c] border border-[#2a3b4f] p-6">
          {files.length === 0 ? (
            <p className="text-[#3c6e47] text-center">No files available</p>
          ) : (
            <div className="space-y-4">
              {files.map(([type]) => (
                <div key={type} className="flex items-center justify-between bg-[#080a0f] border border-[#2a3b4f] p-4">
                  <span className="text-[#e0ffe0] font-mono uppercase">{type}</span>
                  <Button onClick={() => handleDownload(type)} size="sm" 
                    className="border border-[#ffd700] text-[#ffd700] hover:bg-[#ffd700] hover:text-[#080a0f]">
                    <Download className="w-4 h-4 mr-2" /> EXTRACT
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button onClick={() => {
            setCurrentScreen('upload');
            setSelectedFile(null);
            setJobId(null);
            setJobProgress(0);
            setOutputFiles({});
          }} variant="ghost" className="w-full mt-6 text-[#3c6e47] hover:text-[#ffd700]">
            <ChevronLeft className="w-4 h-4 mr-2" /> NEW MISSION
          </Button>
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#080a0f] flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-[#ffd700]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080a0f] flex flex-col">
      <div className="scanlines" />
      
      {isAuthenticated && (
        <header className="w-full px-4 py-3 border-b border-[#2a3b4f] flex items-center justify-between bg-[#10141c]/80">
          <div className="flex items-center gap-3">
            <img src="/static/logo.png" alt="n4mint" className="h-8" />
            <span className="font-audiowide text-[#ffd700]">n4<span className="text-white">mint</span></span>
          </div>
          <div className="flex items-center gap-2">
            {currentScreen === 'game' && (
              <span className="text-[#3c6e47] text-xs font-mono hidden sm:inline">ESCAPE IN PROGRESS</span>
            )}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-[#3c6e47] hover:text-[#ff4d00]">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </header>
      )}

      <main className="flex-1 relative">
        {currentScreen === 'landing' && <LandingPage onGetStarted={handleGetStarted} />}
        {currentScreen === 'auth' && renderAuth()}
        {currentScreen === 'upload' && renderUpload()}
        {currentScreen === 'game' && renderGame()}
        {currentScreen === 'results' && renderResults()}
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
