import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'login' | 'register';
}

export function AuthModal({ isOpen, onClose, defaultTab = 'login' }: AuthModalProps) {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>(defaultTab);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login, register } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = activeTab === 'login' 
      ? await login(email, password)
      : await register(email, password);

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop">
      <div className="surface w-full max-w-md mx-4 p-6 relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-center mb-8">
          <img 
            src="/static/logo-full.jpg" 
            alt="n4mint" 
            className="h-20 w-auto wordmark"
          />
        </div>

        <div className="flex mb-6 border-b border-border-dim">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 pb-3 font-display font-bold text-sm tracking-widest uppercase transition-colors ${
              activeTab === 'login' 
                ? 'text-neon-red border-b-2 border-neon-red' 
                : 'text-chrome-dim hover:text-chrome'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 pb-3 font-display font-bold text-sm tracking-widest uppercase transition-colors ${
              activeTab === 'register' 
                ? 'text-neon-red border-b-2 border-neon-red' 
                : 'text-chrome-dim hover:text-chrome'
            }`}
          >
            Register
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block font-mono text-xs text-chrome-dim uppercase tracking-wider mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operative@n4mint.io"
              className="w-full"
              required
            />
          </div>

          <div>
            <label className="block font-mono text-xs text-chrome-dim uppercase tracking-wider mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full"
              required
            />
          </div>

          {error && (
            <div className="font-mono text-sm text-neon-red">
              ▸ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full btn-primary mt-6"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="pulse-dot" />
                Processing...
              </span>
            ) : (
              activeTab === 'login' ? 'Access System' : 'Create Account'
            )}
          </button>
        </form>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-chrome-dim hover:text-neon-red transition-colors"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 5L5 15M5 5l10 10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
