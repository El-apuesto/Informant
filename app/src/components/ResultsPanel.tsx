import { useEffect, useState, useCallback } from 'react';
import { useAuth, supabase } from '@/contexts/AuthContext';
import type { Job } from '@/services/api';
import { JobCard } from './JobCard';

interface ResultsPanelProps {
  newJobId?: string | null;
}

export function ResultsPanel({ newJobId }: ResultsPanelProps) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { session, user } = useAuth();

  const fetchJobs = useCallback(async () => {
    if (!session?.access_token || !user || !supabase) return;

    try {
      const { data, error } = await supabase
        .from('jobs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setJobs(data || []);
    } catch (err) {
      console.error('Failed to fetch jobs:', err);
    } finally {
      setIsLoading(false);
    }
  }, [session, user]);

  // Initial fetch
  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  // Refetch when new job added
  useEffect(() => {
    if (newJobId) {
      fetchJobs();
    }
  }, [newJobId, fetchJobs]);

  // Poll for active jobs only (single interval for all jobs)
  useEffect(() => {
    if (!session?.access_token) return;
    
    const hasActiveJobs = jobs.some(j => j.status === 'processing' || j.status === 'queued');
    if (!hasActiveJobs) return;

    const interval = setInterval(async () => {
      // Only fetch from Supabase (no individual API calls)
      await fetchJobs();
    }, 3000);

    return () => clearInterval(interval);
  }, [jobs, session?.access_token, fetchJobs]);

  if (isLoading) {
    return (
      <div className="mt-8">
        <p className="section-label mb-4">Intelligence Archive</p>
        <div className="flex justify-center py-12">
          <div className="animate-neon-pulse">
            <img 
              src="/static/logo-cat.png" 
              alt="Loading" 
              className="w-12 h-12"
              style={{ filter: 'drop-shadow(0 0 10px rgba(232,21,27,0.6))' }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="mt-8">
        <p className="section-label mb-4">Intelligence Archive</p>
        <div className="surface p-12 text-center">
          <div className="animate-neon-pulse mb-4">
            <img 
              src="/static/logo-cat.png" 
              alt="No jobs" 
              className="w-24 h-24 mx-auto"
              style={{ filter: 'drop-shadow(0 0 15px rgba(232,21,27,0.6))' }}
            />
          </div>
          <p className="font-mono text-chrome-dim tracking-wider uppercase">
            No Intelligence On File
          </p>
          <p className="font-body text-sm text-text-dim mt-2">
            Upload your first audio or video file to begin
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-8">
      <p className="section-label mb-4">Intelligence Archive</p>
      <div className="space-y-4">
        {jobs.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>
    </div>
  );
}
