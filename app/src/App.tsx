import { useState, useRef, useCallback, useEffect } from 'react'
import './App.css'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile } from '@ffmpeg/util'
import Groq from 'groq-sdk'
import { 
  Mic, 
  Upload, 
  FileAudio, 
  FileVideo, 
  LogOut, 
  Copy, 
  Download, 
  Trash2, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Headphones,
  Music
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

// Types
interface User {
  email: string
  groqApiKey: string
}

interface TranscriptionResult {
  text: string
  segments?: Array<{
    start: number
    end: number
    text: string
  }>
}

// FFmpeg singleton
let ffmpeg: FFmpeg | null = null

const getFFmpeg = async () => {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg()
    await ffmpeg.load()
  }
  return ffmpeg
}

function App() {
  // Auth state
  const [user, setUser] = useState<User | null>(null)
  const [loginEmail, setLoginEmail] = useState('')
  const [loginApiKey, setLoginApiKey] = useState('')
  
  // Upload state
  const [file, setFile] = useState<File | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  // Processing state
  const [isExtractingAudio, setIsExtractingAudio] = useState(false)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [extractionProgress, setExtractionProgress] = useState('')
  
  // Results
  const [transcription, setTranscription] = useState<TranscriptionResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Check for saved session
  useEffect(() => {
    const savedUser = localStorage.getItem('transcription_user')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch {
        localStorage.removeItem('transcription_user')
      }
    }
  }, [])

  // Login handler
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginApiKey) {
      toast.error('Please enter both email and API key')
      return
    }
    
    const newUser = { email: loginEmail, groqApiKey: loginApiKey }
    setUser(newUser)
    localStorage.setItem('transcription_user', JSON.stringify(newUser))
    toast.success('Logged in successfully')
  }

  // Logout handler
  const handleLogout = () => {
    setUser(null)
    setFile(null)
    setTranscription(null)
    localStorage.removeItem('transcription_user')
    toast.info('Logged out')
  }

  // File drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile) {
      validateAndSetFile(droppedFile)
    }
  }, [])

  const validateAndSetFile = (selectedFile: File) => {
    const validAudioTypes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/mp3', 'audio/ogg', 'audio/webm', 'audio/aac', 'audio/m4a', 'audio/x-m4a']
    const validVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'video/x-msvideo', 'video/x-matroska']
    
    if (validAudioTypes.includes(selectedFile.type) || validVideoTypes.includes(selectedFile.type)) {
      setFile(selectedFile)
      setTranscription(null)
      setError(null)
      toast.success(`File selected: ${selectedFile.name}`)
    } else {
      toast.error('Invalid file type. Please upload audio or video files only.')
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      validateAndSetFile(selectedFile)
    }
  }

  // Extract audio from video using FFmpeg
  const extractAudioFromVideo = async (videoFile: File): Promise<File> => {
    setIsExtractingAudio(true)
    setExtractionProgress('Loading FFmpeg...')
    
    try {
      const ffmpegInstance = await getFFmpeg()
      
      setExtractionProgress('Reading video file...')
      const inputFileName = `input_${Date.now()}.mp4`
      const outputFileName = `output_${Date.now()}.mp3`
      
      await ffmpegInstance.writeFile(inputFileName, await fetchFile(videoFile))
      
      setExtractionProgress('Extracting audio...')
      await ffmpegInstance.exec([
        '-i', inputFileName,
        '-vn',
        '-acodec', 'libmp3lame',
        '-q:a', '2',
        '-ar', '16000',
        '-ac', '1',
        outputFileName
      ])
      
      setExtractionProgress('Finalizing...')
      const audioData = await ffmpegInstance.readFile(outputFileName)
      const uint8Array = new Uint8Array(audioData as Uint8Array)
      const audioBlob = new Blob([uint8Array.buffer], { type: 'audio/mp3' })
      const audioFile = new File([audioBlob], `${videoFile.name.replace(/\.[^/.]+$/, '')}_audio.mp3`, { type: 'audio/mp3' })
      
      // Cleanup
      await ffmpegInstance.deleteFile(inputFileName)
      await ffmpegInstance.deleteFile(outputFileName)
      
      return audioFile
    } catch (err) {
      console.error('Audio extraction error:', err)
      throw new Error('Failed to extract audio from video. Please try a different file.')
    } finally {
      setIsExtractingAudio(false)
      setExtractionProgress('')
    }
  }

  // Transcribe using Groq Whisper
  const transcribeAudio = async (audioFile: File) => {
    if (!user?.groqApiKey) {
      toast.error('Groq API key not found')
      return
    }

    setIsTranscribing(true)
    setError(null)
    
    try {
      const groq = new Groq({ 
        apiKey: user.groqApiKey,
        dangerouslyAllowBrowser: true 
      })

      // Simulate progress
      let progress = 0
      const progressInterval = setInterval(() => {
        progress += 5
        if (progress <= 90) {
          setUploadProgress(progress)
        }
      }, 500)

      const result = await groq.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-large-v3',
        response_format: 'verbose_json',
      })

      clearInterval(progressInterval)
      setUploadProgress(100)

      // Handle the response - verbose_json returns segments
      const verboseResult = result as any
      setTranscription({
        text: result.text,
        segments: verboseResult.segments?.map((seg: any) => ({
          start: seg.start,
          end: seg.end,
          text: seg.text
        }))
      })
      
      toast.success('Transcription completed!')
    } catch (err: any) {
      console.error('Transcription error:', err)
      setError(err.message || 'Failed to transcribe audio. Please check your API key and try again.')
      toast.error('Transcription failed')
    } finally {
      setIsTranscribing(false)
      setUploadProgress(0)
    }
  }

  // Main transcription handler
  const handleTranscribe = async () => {
    if (!file) {
      toast.error('Please select a file first')
      return
    }

    const isVideo = file.type.startsWith('video/')
    let audioFile = file

    try {
      // Extract audio if video
      if (isVideo) {
        toast.info('Video detected. Extracting audio...')
        audioFile = await extractAudioFromVideo(file)
      }

      // Transcribe audio
      await transcribeAudio(audioFile)
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message)
    }
  }

  // Copy transcription to clipboard
  const copyToClipboard = () => {
    if (transcription?.text) {
      navigator.clipboard.writeText(transcription.text)
      toast.success('Copied to clipboard!')
    }
  }

  // Download transcription as text file
  const downloadTranscription = () => {
    if (transcription?.text) {
      const blob = new Blob([transcription.text], { type: 'text/plain' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `transcription_${Date.now()}.txt`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Downloaded!')
    }
  }

  // Clear everything
  const clearAll = () => {
    setFile(null)
    setTranscription(null)
    setError(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    toast.info('Cleared')
  }

  // Login Screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <Toaster position="top-center" />
        <Card className="w-full max-w-md bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mb-4">
              <Mic className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-white">Audio Transcription</CardTitle>
            <CardDescription className="text-gray-300">
              Transcribe audio & video files with Groq Whisper
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Email</label>
                <Input
                  type="email"
                  placeholder="your@email.com"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-300 mb-1 block">Groq API Key</label>
                <Input
                  type="password"
                  placeholder="gsk_..."
                  value={loginApiKey}
                  onChange={(e) => setLoginApiKey(e.target.value)}
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Get your API key from{' '}
                  <a 
                    href="https://console.groq.com/keys" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:underline"
                  >
                    console.groq.com
                  </a>
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                Get Started
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Main App Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <Toaster position="top-center" />
      
      {/* Header */}
      <header className="bg-white/5 backdrop-blur-lg border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Audio Transcription</h1>
              <p className="text-xs text-gray-400">{user.email}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleLogout}
            className="text-gray-400 hover:text-white hover:bg-white/10"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Upload Section */}
        <Card className="bg-white/10 backdrop-blur-lg border-white/20 mb-6">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Upload File
            </CardTitle>
            <CardDescription className="text-gray-400">
              Drag & drop or select an audio or video file
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
                transition-all duration-200
                ${isDragging 
                  ? 'border-purple-500 bg-purple-500/20' 
                  : 'border-white/30 hover:border-white/50 hover:bg-white/5'
                }
              `}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,video/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  {file.type.startsWith('video/') ? (
                    <FileVideo className="w-8 h-8 text-pink-400" />
                  ) : (
                    <FileAudio className="w-8 h-8 text-purple-400" />
                  )}
                  <div className="text-left">
                    <p className="text-white font-medium">{file.name}</p>
                    <p className="text-gray-400 text-sm">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex justify-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <Music className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="w-12 h-12 bg-pink-500/20 rounded-xl flex items-center justify-center">
                      <FileVideo className="w-6 h-6 text-pink-400" />
                    </div>
                  </div>
                  <p className="text-white font-medium mb-1">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-gray-400 text-sm">
                    Supports MP3, WAV, M4A, MP4, MOV, WebM
                  </p>
                </>
              )}
            </div>

            {/* Action Buttons */}
            {file && (
              <div className="flex gap-3 mt-4">
                <Button
                  onClick={handleTranscribe}
                  disabled={isExtractingAudio || isTranscribing}
                  className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {isExtractingAudio || isTranscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isExtractingAudio ? 'Extracting Audio...' : 'Transcribing...'}
                    </>
                  ) : (
                    <>
                      <Headphones className="w-4 h-4 mr-2" />
                      Transcribe
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={clearAll}
                  disabled={isExtractingAudio || isTranscribing}
                  className="border-white/20 text-white hover:bg-white/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Progress */}
            {(isExtractingAudio || isTranscribing) && (
              <div className="mt-4">
                <Progress value={isExtractingAudio ? 50 : uploadProgress} className="h-2" />
                <p className="text-center text-sm text-gray-400 mt-2">
                  {isExtractingAudio ? extractionProgress : `Uploading and transcribing... ${uploadProgress}%`}
                </p>
              </div>
            )}

            {/* Error */}
            {error && (
              <Alert variant="destructive" className="mt-4 bg-red-500/20 border-red-500/50">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Transcription Results */}
        {transcription && (
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  Transcription Result
                </CardTitle>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadTranscription}
                    className="border-white/20 text-white hover:bg-white/10"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="text" className="w-full">
                <TabsList className="bg-white/10 mb-4">
                  <TabsTrigger value="text" className="data-[state=active]:bg-white/20">Full Text</TabsTrigger>
                  {transcription.segments && transcription.segments.length > 0 && (
                    <TabsTrigger value="segments" className="data-[state=active]:bg-white/20">With Timestamps</TabsTrigger>
                  )}
                </TabsList>
                
                <TabsContent value="text">
                  <div className="bg-black/30 rounded-lg p-4 max-h-96 overflow-y-auto">
                    <p className="text-white whitespace-pre-wrap leading-relaxed">
                      {transcription.text}
                    </p>
                  </div>
                </TabsContent>
                
                {transcription.segments && transcription.segments.length > 0 && (
                  <TabsContent value="segments">
                    <div className="bg-black/30 rounded-lg p-4 max-h-96 overflow-y-auto space-y-2">
                      {transcription.segments.map((segment, index) => (
                        <div key={index} className="flex gap-3">
                          <span className="text-purple-400 text-sm font-mono shrink-0">
                            {formatTime(segment.start)} - {formatTime(segment.end)}
                          </span>
                          <p className="text-white">{segment.text}</p>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
            </CardContent>
          </Card>
        )}

        {/* Info Cards */}
        {!transcription && !file && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-4 text-center">
                <Mic className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                <h3 className="text-white font-medium mb-1">Audio Files</h3>
                <p className="text-gray-400 text-sm">MP3, WAV, M4A, OGG, WebM</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-4 text-center">
                <FileVideo className="w-8 h-8 text-pink-400 mx-auto mb-2" />
                <h3 className="text-white font-medium mb-1">Video Files</h3>
                <p className="text-gray-400 text-sm">MP4, MOV, WebM, AVI</p>
              </CardContent>
            </Card>
            <Card className="bg-white/5 backdrop-blur-lg border-white/10">
              <CardContent className="p-4 text-center">
                <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
                <h3 className="text-white font-medium mb-1">Fast & Accurate</h3>
                <p className="text-gray-400 text-sm">Powered by Groq Whisper</p>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  )
}

// Helper function to format time
function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  const ms = Math.floor((seconds % 1) * 100)
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`
}

export default App
