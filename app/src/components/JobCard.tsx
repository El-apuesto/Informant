import { api, type Job } from '@/services/api';

interface JobCardProps {
  job: Job;
}

const STATUS_LABELS: Record<string, string> = {
  queued: 'QUEUED',
  processing: 'PROCESSING',
  completed: 'DECRYPTED',
  failed: 'TRANSMISSION FAILED',
};

const STATUS_COLORS: Record<string, string> = {
  queued: 'status-queued',
  processing: 'status-processing',
  completed: 'status-completed',
  failed: 'status-failed',
};

const OUTPUT_LABELS: Record<string, string> = {
  transcript: 'TRANSCRIPT',
  clean: 'CLEAN',
  summary: 'SUMMARY',
  clips: 'CLIPS',
};

export function JobCard({ job }: JobCardProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const isComplete = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const isProcessing = job.status === 'processing';

  return (
    <div className={`surface p-4 ${isComplete ? 'animate-decode-flash' : ''}`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 className="font-body font-medium text-chrome truncate max-w-[200px] sm:max-w-xs">
            {job.filename}
          </h4>
          <p className="font-mono text-xs text-text-dim mt-1">
            {formatDate(job.created_at)}
          </p>
        </div>
        <div className={`status-badge ${STATUS_COLORS[job.status]}`}>
          {STATUS_LABELS[job.status]}
          {isProcessing && <span className="animate-blink ml-1">_</span>}
        </div>
      </div>

      {(isProcessing || job.status === 'queued') && (
        <div className="mb-4">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${job.progress}%` }} />
          </div>
          <div className="flex justify-between mt-1">
            <span className="font-mono text-xs text-chrome-dim">{job.progress}%</span>
            <span className="font-mono text-xs text-chrome-dim">{job.modes.join(' · ').toUpperCase()}</span>
          </div>
        </div>
      )}

      {isFailed && job.error && (
        <div className="font-mono text-sm text-neon-red mb-3">
          ▸ {job.error}
        </div>
      )}

      {isComplete && Object.keys(job.output_urls).length > 0 && (
        <div className="flex flex-wrap gap-2">
          {Object.keys(job.output_urls).map((type) => (
            <a
              key={type}
              href={api.getDownloadUrl(job.id, type)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn-ghost text-xs py-2 px-4"
            >
              {OUTPUT_LABELS[type] || type.toUpperCase()}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
