import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { api, type Plans } from '@/services/api';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const DEFAULT_PLANS: Plans = {
  free: { monthly: 0, annual: 0 },
  plus: { monthly: 12, annual: 100, price_ids: { monthly: '', annual: '' } },
  pro: { monthly: 24, annual: 200, price_ids: { monthly: '', annual: '' } },
};

export function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [plans, setPlans] = useState<Plans>(DEFAULT_PLANS);
  const [isCheckoutLoading, setIsCheckoutLoading] = useState(false);
  const [error, setError] = useState('');
  const { session } = useAuth();

  useEffect(() => {
    if (isOpen) {
      setError('');
      api.getPlans()
        .then(setPlans)
        .catch((e) => {
          console.error('Failed to load plans:', e);
          setError('Failed to load pricing. Using defaults.');
        });
    }
  }, [isOpen]);

  const handleSubscribe = async (priceId: string) => {
    if (!session?.access_token) {
      setError('Please log in first');
      return;
    }
    if (!priceId || !priceId.startsWith('price_')) {
      setError('Stripe not configured. Check backend env vars.');
      return;
    }
    
    setIsCheckoutLoading(true);
    setError('');
    try {
      const { url } = await api.createCheckoutSession(priceId, session.access_token);
      window.location.href = url;
    } catch (err: any) {
      setError(err.message || 'Checkout failed');
      setIsCheckoutLoading(false);
    }
  };

  if (!isOpen) return null;

  // Get price IDs from backend
  const getPriceId = (tier: 'plus' | 'pro', cycle: 'monthly' | 'annual'): string => {
    return plans[tier]?.price_ids?.[cycle] || '';
  };

  const tiers = [
    {
      key: 'free' as const,
      name: 'OPERATIVE',
      description: 'Basic intelligence gathering',
      price: { monthly: 0, annual: 0 },
      features: ['3 lifetime transcriptions', 'Transcript & Clean modes', 'Standard processing'],
      cta: 'Current Plan',
      disabled: true,
      getPrice: () => '',
    },
    {
      key: 'plus' as const,
      name: 'FIELD AGENT',
      description: 'Enhanced field capabilities',
      price: { monthly: plans.plus.monthly, annual: plans.plus.annual },
      features: ['Unlimited transcriptions', 'All 4 processing modes', 'Priority processing', '7-day free trial'],
      cta: 'Upgrade to Plus',
      recommended: true,
      getPrice: (cycle: 'monthly' | 'annual') => getPriceId('plus', cycle),
    },
    {
      key: 'pro' as const,
      name: 'HANDLER',
      description: 'Full command authority',
      price: { monthly: plans.pro.monthly, annual: plans.pro.annual },
      features: ['Unlimited transcriptions', 'All 4 processing modes', 'Priority processing', '7-day free trial', 'Premium support'],
      cta: 'Upgrade to Pro',
      getPrice: (cycle: 'monthly' | 'annual') => getPriceId('pro', cycle),
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-start md:items-center justify-center modal-backdrop p-2 md:p-4 overflow-y-auto">
      <div className="surface w-full max-w-4xl my-4 md:my-0" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-border-dim flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-xl tracking-wider uppercase text-chrome">
              Clearance Levels
            </h2>
            <p className="font-body text-sm text-chrome-dim mt-1">
              Select your operational tier
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-chrome-dim hover:text-neon-red transition-colors"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {error && (
          <div className="p-4 bg-neon-red/10 border border-neon-red/30 mx-6 mt-4">
            <p className="font-mono text-sm text-neon-red">▸ {error}</p>
          </div>
        )}

        <div className="flex justify-center p-6">
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

        <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-3 gap-4">
          {tiers.map((tier) => {
            const priceId = tier.getPrice(billingCycle);
            const hasPrice = priceId && priceId.startsWith('price_');
            
            return (
              <div
                key={tier.key}
                className={`surface p-5 relative ${
                  tier.recommended 
                    ? 'border-neon-red shadow-neon-soft' 
                    : ''
                }`}
              >
                {tier.recommended && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-neon-red text-black font-display font-bold text-xs px-3 py-1 uppercase tracking-wider">
                    Recommended
                  </div>
                )}

                <div className="text-center mb-4">
                  <h3 className={`font-display font-bold text-lg tracking-wider uppercase ${
                    tier.key === 'free' ? 'tier-free' : tier.key === 'plus' ? 'tier-plus' : 'tier-pro'
                  }`}>
                    {tier.name}
                  </h3>
                  <p className="font-body text-sm text-chrome-dim mt-1">
                    {tier.description}
                  </p>
                </div>

                <div className="text-center mb-6">
                  <span className="font-display font-bold text-3xl text-chrome">
                    ${billingCycle === 'monthly' ? tier.price.monthly : Math.round(tier.price.annual / 12)}
                  </span>
                  <span className="font-mono text-sm text-chrome-dim">/mo</span>
                  {billingCycle === 'annual' && tier.price.annual > 0 && (
                    <div className="font-mono text-xs text-signal mt-1">
                      ${tier.price.annual}/year (save 30%)
                    </div>
                  )}
                </div>

                <ul className="space-y-2 mb-6">
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <svg className="w-4 h-4 text-neon-red mt-0.5 flex-shrink-0" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M3 8l4 4 6-8" />
                      </svg>
                      <span className="font-body text-chrome">{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  onClick={() => hasPrice && handleSubscribe(priceId)}
                  disabled={tier.disabled || isCheckoutLoading || !hasPrice}
                  className={`w-full py-3 text-sm ${
                    tier.recommended ? 'btn-primary' : 'btn-ghost'
                  } ${tier.disabled || !hasPrice ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isCheckoutLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="pulse-dot" />
                      Processing...
                    </span>
                  ) : !hasPrice ? (
                    'Not Available'
                  ) : (
                    tier.cta
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
