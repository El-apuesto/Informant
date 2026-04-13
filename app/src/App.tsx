import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { api, type Profile } from '@/services/api';
import { AuthModal } from '@/components/AuthModal';
import { PricingModal } from '@/components/PricingModal';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { UploadPanel } from '@/components/UploadPanel';
import { ResultsPanel } from '@/components/ResultsPanel';

function LandingPage({ onOpenAuth, onOpenPricing }: { onOpenAuth: (tab: 'login' | 'register') => void; onOpenPricing: () => void }) {
  const { user } = useAuth();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const navigate = useNavigate();

  const handleCTA = () => {
    if (user) {
      navigate('/app');
    } else {
      onOpenAuth('register');
    }
  };

  const handleUpgrade = () => {
    if (user) {
      onOpenPricing();
    } else {
      onOpenAuth('register');
    }
  };

  const features = [
    {
      icon: (
        <svg viewBox="0 0 24 24" className="w-10 h-10 feature-icon">
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="22" />
        </svg>
      ),
      title: 'TRANSCRIBE',
      description: 'Convert speech to text with industry-leading accuracy using advanced AI models.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" className="w-10 h-10 feature-icon">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
      title: 'CLEAN',
      description: 'Remove filler words, fix grammar, and format into professional transcripts.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" className="w-10 h-10 feature-icon">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
          <line x1="9" y1="9" x2="15" y2="15" />
          <line x1="15" y1="9" x2="9" y2="15" />
        </svg>
      ),
      title: 'SUMMARIZE',
      description: 'Extract key points and generate concise summaries from any content.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" className="w-10 h-10 feature-icon">
          <polygon points="5 3 19 12 5 21 5 3" />
        </svg>
      ),
      title: 'CLIPS',
      description: 'Identify the best segments for TikTok, Reels, and Shorts automatically.',
    },
  ];

  const tiers = [
    { key: 'free', name: 'OPERATIVE', price: 0 },
    { key: 'plus', name: 'FIELD AGENT', price: billingCycle === 'monthly' ? 12 : 100 },
    { key: 'pro', name: 'HANDLER', price: billingCycle === 'monthly' ? 24 : 200 },
  ];

  return (
    <div className="min-h-screen bg-void">
      <section className="relative min-h-screen flex flex-col items-center justify-center px-4">
        <div className="scanlines" />
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{ background: 'radial-gradient(ellipse at 50% 60%, rgba(232,21,27,0.06) 0%, transparent 70%)' }}
        />

        <div className="relative z-10 text-center animate-fade-up">
          <img 
            src="/static/logo-full.jpg" 
            alt="n4mint" 
            className="max-w-[320px] sm:max-w-[380px] w-full mx-auto mb-8"
            style={{ filter: 'drop-shadow(0 0 40px rgba(232,21,27,0.4))', mixBlendMode: 'lighten' }}
          />
          <p className="font-display font-bold text-sm tracking-[0.3em] uppercase text-chrome mb-8">
            Intelligence. Extracted.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={handleCTA} className="btn-primary">
              {user ? 'Enter System' : 'Begin Mission'}
            </button>
            <a href="#pricing" className="btn-ghost">
              View Plans
            </a>
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-chrome-dim">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </div>
      </section>

      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="section-label text-center mb-12">Capabilities</p>
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <div 
                key={feature.title} 
                className="surface p-6 animate-fade-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="font-display font-bold text-lg tracking-wider uppercase text-chrome mb-2">
                  {feature.title}
                </h3>
                <p className="font-body text-sm text-chrome-dim">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <p className="section-label text-center mb-8">Clearance Levels</p>
          <div className="flex justify-center mb-12">
            <div className="pricing-toggle flex gap-1">
              <button
                onClick={() => setBillingCycle('monthly')}
                className={`px-4 py-2 rounded-full font-display font-semibold text-sm tracking-wider uppercase transition-all ${
                  billingCycle === 'monthly' ? 'pricing-toggle-active' : 'text-chrome-dim'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setBillingCycle('annual')}
                className={`px-4 py-2 rounded-full font-display font-semibold text-sm tracking-wider uppercase transition-all ${
                  billingCycle === 'annual' ? 'pricing-toggle-active' : 'text-chrome-dim'
                }`}
              >
                Annual
              </button>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-6">
            {tiers.map((tier, i) => (
              <div 
                key={tier.key}
                className={`surface p-6 text-center animate-fade-up ${
                  tier.key === 'plus' ? 'border-neon-red shadow-neon-soft' : ''
                }`}
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                {tier.key === 'plus' && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neon-red text-black font-display font-bold text-xs px-3 py-1 uppercase tracking-wider">
                    Recommended
                  </div>
                )}
                <h3 className={`font-display font-bold text-lg tracking-wider uppercase mb-2 ${
                  tier.key === 'free' ? 'tier-free' : tier.key === 'plus' ? 'tier-plus' : 'tier-pro'
                }`}>
                  {tier.name}
                </h3>
                <div className="mb-4">
                  <span className="font-display font-bold text-3xl text-chrome">
                    ${billingCycle === 'monthly' ? tier.price : Math.round(tier.price / 12)}
                  </span>
                  <span className="font-mono text-sm text-chrome-dim">/mo</span>
                </div>
                <button onClick={handleUpgrade} className={`w-full ${tier.key === 'plus' ? 'btn-primary' : 'btn-ghost'}`}>
                  {tier.key === 'free' ? 'Get Started' : 'Upgrade'}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="py-8 px-4 border-t border-border-dim">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <img src="/static/wordmark.jpg" alt="n4mint" className="h-6 w-auto wordmark" />
          <p className="font-mono text-xs text-text-dim">© 2024 n4mint. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function AppDashboard() {
  const { user, session, logout } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [showPricing, setShowPricing] = useState(false);
  const [newJobId, setNewJobId] = useState<string | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('upgraded') === '1') {
      alert(`Welcome to ${profile?.subscription_tier === 'pro' ? 'Handler' : 'Field Agent'}!`);
      navigate('/app', { replace: true });
    }
  }, [location, profile, navigate]);

  useEffect(() => {
    if (session?.access_token) {
      api.getMe(session.access_token).then(setProfile);
    }
  }, [session]);

  const handleUploadStart = (jobId: string) => {
    setNewJobId(jobId);
  };

  const tierBadgeClass = {
    free: 'tier-free',
    plus: 'tier-plus',
    pro: 'tier-pro',
  }[profile?.subscription_tier || 'free'];

  const tierName = {
    free: 'OPERATIVE',
    plus: 'FIELD AGENT',
    pro: 'HANDLER',
  }[profile?.subscription_tier || 'free'];

  return (
    <div className="min-h-screen bg-void">
      <header className="surface border-b border-border-dim sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/">
            <img src="/static/wordmark.jpg" alt="n4mint" className="h-9 w-auto wordmark" />
          </a>
          <div className="flex items-center gap-4">
            {profile?.subscription_tier === 'free' && (
              <button onClick={() => setShowPricing(true)} className="font-mono text-xs text-neon-red hover:text-neon-glow transition-colors">
                UPGRADE
              </button>
            )}
            <span className={`font-mono text-xs tracking-wider ${tierBadgeClass}`}>{tierName}</span>
            <span className="font-mono text-xs text-chrome-dim hidden sm:inline">{user?.email}</span>
            <button onClick={logout} className="btn-ghost text-xs py-2 px-4">Logout</button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <UploadPanel tier={profile?.subscription_tier || 'free'} onUploadStart={handleUploadStart} />
        <ResultsPanel newJobId={newJobId} />
      </main>

      <PricingModal isOpen={showPricing} onClose={() => setShowPricing(false)} />
    </div>
  );
}

function App() {
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<'login' | 'register'>('login');
  const [pricingModalOpen, setPricingModalOpen] = useState(false);

  const openAuth = (tab: 'login' | 'register') => {
    setAuthModalTab(tab);
    setAuthModalOpen(true);
  };

  const openPricing = () => {
    setPricingModalOpen(true);
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage onOpenAuth={openAuth} onOpenPricing={openPricing} />} />
        <Route 
          path="/app" 
          element={
            <ProtectedRoute onAuthRequired={() => openAuth('login')}>
              <AppDashboard />
            </ProtectedRoute>
          } 
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} defaultTab={authModalTab} />
      <PricingModal isOpen={pricingModalOpen} onClose={() => setPricingModalOpen(false)} />
    </BrowserRouter>
  );
}

export default App;
