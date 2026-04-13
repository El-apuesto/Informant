const API_URL = import.meta.env.VITE_API_URL;

export interface Job {
  id: string;
  user_id: string;
  filename: string;
  duration_seconds?: number;
  modes: string[];
  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress: number;
  output_urls: Record<string, string>;
  error?: string;
  created_at: string;
  completed_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  subscription_tier: 'free' | 'plus' | 'pro';
  stripe_customer_id?: string;
  jobs_used_this_month: number;
  created_at: string;
}

export interface Plans {
  free: { monthly: number; annual: number };
  plus: { monthly: number; annual: number; price_ids: { monthly: string; annual: string }; priceIds: { monthly: string; annual: string } };
  pro: { monthly: number; annual: number; price_ids: { monthly: string; annual: string }; priceIds: { monthly: string; annual: string } };
}

async function fetchWithAuth(url: string, options: RequestInit = {}, token?: string): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  return fetch(`${API_URL}${url}`, {
    ...options,
    headers,
  });
}

export const api = {
  health: async () => {
    const res = await fetch(`${API_URL}/`);
    return res.json();
  },

  getMe: async (token: string): Promise<Profile> => {
    const res = await fetchWithAuth('/me', {}, token);
    if (!res.ok) throw new Error('Failed to fetch profile');
    return res.json();
  },

  getPlans: async (): Promise<Plans> => {
    const res = await fetch(`${API_URL}/plans`);
    if (!res.ok) throw new Error('Failed to fetch plans');
    return res.json();
  },

  upload: async (file: File, modes: string[], token: string): Promise<{ job_id: string; estimated_seconds: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('modes', modes.join(','));
    
    const res = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || 'Upload failed');
    }
    
    return res.json();
  },

  getJob: async (jobId: string, token: string): Promise<Job> => {
    const res = await fetchWithAuth(`/job/${jobId}`, {}, token);
    if (!res.ok) throw new Error('Failed to fetch job');
    return res.json();
  },

  getDownloadUrl: (jobId: string, fileType: string): string => {
    return `${API_URL}/download/${jobId}/${fileType}`;
  },

  createCheckoutSession: async (priceId: string, token: string): Promise<{ url: string }> => {
    const res = await fetchWithAuth('/create-checkout-session', {
      method: 'POST',
      body: JSON.stringify({ price_id: priceId }),
    }, token);
    
    if (!res.ok) throw new Error('Failed to create checkout session');
    return res.json();
  },
};
