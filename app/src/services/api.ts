import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ✅ FORCE correct API URL (no silent fallback in production)
const API_URL = import.meta.env.VITE_API_URL;

if (!API_URL) {
  throw new Error("VITE_API_URL is not set");
}

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

  private async request(path: string, options: RequestInit = {}) {
    const res = await fetch(`${API_URL}${path}`, options);

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`API error: ${res.status} - ${text}`);
    }

    return res;
  }

  async uploadFile(file: File, modes: string[]) {
    const headers = await this.getHeaders();

    const formData = new FormData();
    formData.append('file', file);
    formData.append('modes', modes.join(','));

    const res = await this.request('/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    return res.json();
  }

  async getJobStatus(jobId: string): Promise<Job> {
    const headers = await this.getHeaders();

    const res = await this.request(`/job/${jobId}`, { headers });
    return res.json();
  }

  async downloadFile(jobId: string, fileType: string): Promise<Blob> {
    const headers = await this.getHeaders();

    const res = await this.request(`/download/${jobId}/${fileType}`, { headers });
    return res.blob();
  }

  async submitGameScore(score: number, survivalTime: number): Promise<void> {
    const headers = await this.getHeaders();

    await this.request(`/game/score?score=${score}&survival_time=${survivalTime}`, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json' },
    });
  }

  async getLeaderboard(): Promise<{ scores: GameScore[] }> {
    const res = await this.request('/game/leaderboard');
    return res.json();
  }

  async getMyScores(): Promise<{ scores: GameScore[] }> {
    const headers = await this.getHeaders();

    const res = await this.request('/game/my-scores', { headers });
    return res.json();
  }
}

export const api = new ApiService();
