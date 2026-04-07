import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export interface Job {
  id: string;
  filename: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  duration: number;
  output_files?: Record<string, string>;
  error?: string;
}

export interface GameScore {
  id: string;
  user_id: string;
  score: number;
  survival_time: number;
  users?: { email: string };
}

class ApiService {
  private async getHeaders(): Promise<HeadersInit> {
    const { data: { session } } = await supabase.auth.getSession();
    return {
      'Authorization': `Bearer ${session?.access_token || ''}`,
    };
  }

  async uploadFile(file: File, modes: string[]): Promise<{ job_id: string; estimated_minutes: number }> {
    const headers = await this.getHeaders();
    const formData = new FormData();
    formData.append('file', file);
    formData.append('modes', modes.join(','));

    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  }

  async getJobStatus(jobId: string): Promise<Job> {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/job/${jobId}`, { headers });
    if (!res.ok) throw new Error('Failed to get job status');
    return res.json();
  }

  async downloadFile(jobId: string, fileType: string): Promise<Blob> {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/download/${jobId}/${fileType}`, { headers });
    if (!res.ok) throw new Error('Download failed');
    return res.blob();
  }

  async submitGameScore(score: number, survivalTime: number): Promise<void> {
    const headers = await this.getHeaders();
    await fetch(`${API_URL}/game/score?score=${score}&survival_time=${survivalTime}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  async getLeaderboard(): Promise<{ scores: GameScore[] }> {
    const res = await fetch(`${API_URL}/game/leaderboard`);
    return res.json();
  }

  async getMyScores(): Promise<{ scores: GameScore[] }> {
    const headers = await this.getHeaders();
    const res = await fetch(`${API_URL}/game/my-scores`, { headers });
    return res.json();
  }
}

export const api = new ApiService();
