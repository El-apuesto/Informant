import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { FileAudio, FileVideo, Sparkles, Zap, Film, Upload, Trophy, ArrowRight, Check, Play, Quote } from 'lucide-react';
import { toast } from 'sonner';

interface LandingPageProps {
  onGetStarted: () => void;
}

export function LandingPage({ onGetStarted }: LandingPageProps) {
  const [email, setEmail] = useState('');

  const handleWaitlist = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast.success('Welcome to the intelligence network. Access granted soon.');
      setEmail('');
    }
  };

  const features = [
    {
      icon: <FileAudio className="w-6 h-6" />,
      title: "AI Transcription",
      description: "Transform audio & video to text with state-of-the-art Whisper AI. Industry-leading accuracy for podcasts, meetings, and content."
    },
    {
      icon: <Sparkles className="w-6 h-6" />,
      title: "Auto-Cleaning",
      description: "Remove filler words, fix grammar, and enhance readability automatically with Groq-powered Llama intelligence."
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Smart Summaries",
      description: "Generate executive summaries and key takeaways instantly. Perfect for long-form content and meetings."
    },
    {
      icon: <Film className="w-6 h-6" />,
      title: "Viral Clips",
      description: "AI identifies the most engaging moments for social media clips. Maximize your content's reach."
    }
  ];

  const testimonials = [
    {
      quote: "n4mint cut our podcast production time by 80%. The AI cleaning is incredible.",
      author: "Sarah Chen",
      role: "Podcast Producer"
    },
    {
      quote: "Finally, accurate meeting transcription that doesn't need heavy editing. Game changer.",
      author: "Marcus Johnson",
      role: "Product Manager"
    },
    {
      quote: "The viral clip feature helped us 10x our YouTube Shorts views."
      author: "Alex Rivera",
      role: "Content Creator"
    }
  ];

  const pricing = [
    {
      name: "Free",
      price: "$0",
      period: "forever",
      description: "Perfect for trying out",
      features: [
        "60 minutes of transcription",
        "Basic cleaning",
        "Standard summaries",
        "Community support"
      ],
      cta: "Get Started",
      popular: false
    },
    {
      name: "Plus",
      price: "$12",
      period: "/month",
      description: "For content creators",
      features: [
        "10 hours of transcription",
        "Advanced AI cleaning",
        "Executive summaries",
        "Viral clip generation",
        "Priority processing",
        "Email support"
      ],
      cta: "Start Free Trial",
      popular: true
    },
    {
      name: "Pro",
      price: "$24",
      period: "/month",
      description: "For professionals",
      features: [
        "Unlimited transcription",
        "Premium AI cleaning",
        "Custom summaries",
        "Advanced clip AI",
        "Fastest processing",
        "Priority support",
        "API access"
      ],
      cta: "Start Free Trial",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-[#080a0f]">
      {/* Navigation */}
      <nav className="w-full px-6 py-4 border-b border-[#2a3b4f] bg-[#10141c]/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/static/logo.png" alt="n4mint" className="h-8" />
            <span className="font-audiowide text-[#ffd700]">n4<span className="text-white">mint</span></span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-[#e0ffe0] hover:text-[#ffd700] text-sm hidden sm:block">Features</a>
            <a href="#pricing" className="text-[#e0ffe0] hover:text-[#ffd700] text-sm hidden sm:block">Pricing</a>
            <Button 
              onClick={onGetStarted}
              className="bg-[#ffd700] text-[#080a0f] hover:bg-[#e6c200] font-audiowide text-sm"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative px-6 py-20 sm:py-32 overflow-hidden">
        <div className="scanlines" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="font-audiowide text-4xl sm:text-6xl lg:text-7xl text-[#ffd700] mb-6 leading-tight">
            Transform Audio & Video<br />
            <span className="text-white">Into Intelligence</span>
          </h1>
          <p className="text-[#e0ffe0] text-lg sm:text-xl max-w-2xl mx-auto mb-8 leading-relaxed">
            AI-powered transcription that doesn't just convert speech to text—it cleans, summarizes, 
            and extracts viral moments automatically.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              onClick={onGetStarted}
              className="bg-[#ffd700] text-[#080a0f] hover:bg-[#e6c200] font-audiowide text-lg px-8 py-6"
            >
              Start Free <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
            <Button 
              variant="outline"
              className="border-[#2a3b4f] text-[#e0ffe0] hover:border-[#ffd700] hover:text-[#ffd700] font-audiowide text-lg px-8 py-6"
            >
              <Play className="mr-2 w-5 h-5" /> See Demo
            </Button>
          </div>
          <p className="text-[#3c6e47] text-sm mt-4">No credit card required. 60 minutes free.</p>
        </div>
      </section>

      {/* Stats Section */}
      <section className="px-6 py-12 border-y border-[#2a3b4f]">
        <div className="max-w-5xl mx-auto grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          <div>
            <div className="font-audiowide text-3xl sm:text-4xl text-[#ffd700]">10K+</div>
            <div className="text-[#3c6e47] text-sm mt-1">Hours Processed</div>
          </div>
          <div>
            <div className="font-audiowide text-3xl sm:text-4xl text-[#ffd700]">99%</div>
            <div className="text-[#3c6e47] text-sm mt-1">Accuracy Rate</div>
          </div>
          <div>
            <div className="font-audiowide text-3xl sm:text-4xl text-[#ffd700]">5x</div>
            <div className="text-[#3c6e47] text-sm mt-1">Faster Processing</div>
          </div>
          <div>
            <div className="font-audiowide text-3xl sm:text-4xl text-[#ffd700]">4.9★</div>
            <div className="text-[#3c6e47] text-sm mt-1">User Rating</div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-audiowide text-3xl sm:text-4xl text-[#ffd700] text-center mb-4">
            Intelligence Processing
          </h2>
          <p className="text-[#e0ffe0] text-center max-w-2xl mx-auto mb-12">
            More than transcription. n4mint uses cutting-edge AI to transform your content into actionable intelligence.
          </p>
          <div className="grid sm:grid-cols-2 gap-6">
            {features.map((feature, i) => (
              <div key={i} className="bg-[#10141c] border border-[#2a3b4f] p-6 hover:border-[#ffd700] transition-colors group">
                <div className="w-12 h-12 bg-[#2a3b4f] rounded-lg flex items-center justify-center mb-4 group-hover:bg-[#ffd700] transition-colors">
                  <div className="text-[#ffd700] group-hover:text-[#080a0f]">{feature.icon}</div>
                </div>
                <h3 className="font-audiowide text-xl text-[#e0ffe0] mb-2">{feature.title}</h3>
                <p className="text-[#3c6e47] text-sm leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 bg-[#10141c]/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-audiowide text-3xl sm:text-4xl text-[#ffd700] text-center mb-12">
            How It Works
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-[#2a3b4f] rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="w-8 h-8 text-[#ffd700]" />
              </div>
              <h3 className="font-audiowide text-lg text-[#e0ffe0] mb-2">1. Upload</h3>
              <p className="text-[#3c6e47] text-sm">Drag & drop your audio or video file. We support all major formats.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#2a3b4f] rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-[#ffd700]" />
              </div>
              <h3 className="font-audiowide text-lg text-[#e0ffe0] mb-2">2. AI Processes</h3>
              <p className="text-[#3c6e47] text-sm">Our AI transcribes, cleans, and analyzes while you wait.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-[#2a3b4f] rounded-full flex items-center justify-center mx-auto mb-4">
                <FileAudio className="w-8 h-8 text-[#ffd700]" />
              </div>
              <h3 className="font-audiowide text-lg text-[#e0ffe0] mb-2">3. Download</h3>
              <p className="text-[#3c6e47] text-sm">Get transcripts, summaries, and viral clips instantly.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="px-6 py-20">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-audiowide text-3xl sm:text-4xl text-[#ffd700] text-center mb-12">
            Trusted by Creators
          </h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <div key={i} className="bg-[#10141c] border border-[#2a3b4f] p-6">
                <Quote className="w-8 h-8 text-[#ffd700] mb-4" />
                <p className="text-[#e0ffe0] mb-4 leading-relaxed">{t.quote}</p>
                <div>
                  <div className="font-audiowide text-[#ffd700]">{t.author}</div>
                  <div className="text-[#3c6e47] text-sm">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="px-6 py-20 bg-[#10141c]/50">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-audiowide text-3xl sm:text-4xl text-[#ffd700] text-center mb-4">
            Simple Pricing
          </h2>
          <p className="text-[#e0ffe0] text-center max-w-2xl mx-auto mb-12">
            Start free, upgrade when you need more power.
          </p>
          <div className="grid sm:grid-cols-3 gap-6">
            {pricing.map((plan, i) => (
              <div key={i} className={`bg-[#10141c] border ${plan.popular ? 'border-[#ffd700]' : 'border-[#2a3b4f]'} p-6 relative`}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#ffd700] text-[#080a0f] text-xs font-audiowide px-3 py-1">
                    MOST POPULAR
                  </div>
                )}
                <h3 className="font-audiowide text-xl text-[#e0ffe0] mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="font-audiowide text-4xl text-[#ffd700]">{plan.price}</span>
                  <span className="text-[#3c6e47]">{plan.period}</span>
                </div>
                <p className="text-[#3c6e47] text-sm mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2 text-[#e0ffe0] text-sm">
                      <Check className="w-4 h-4 text-[#ffd700]" /> {feature}
                    </li>
                  ))}
                </ul>
                <Button 
                  onClick={onGetStarted}
                  className={`w-full font-audiowide ${plan.popular ? 'bg-[#ffd700] text-[#080a0f] hover:bg-[#e6c200]' : 'border border-[#2a3b4f] text-[#e0ffe0] hover:border-[#ffd700] hover:text-[#ffd700]'}`}
                >
                  {plan.cta}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-audiowide text-3xl sm:text-4xl text-[#ffd700] mb-4">
            Ready to Transform Your Content?
          </h2>
          <p className="text-[#e0ffe0] mb-8">
            Join thousands of creators who save hours with AI-powered transcription.
          </p>
          <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="flex-1 bg-[#10141c] border border-[#2a3b4f] text-[#e0ffe0] px-4 py-3 rounded font-mono focus:border-[#ffd700] outline-none"
              required
            />
            <Button type="submit" className="bg-[#ffd700] text-[#080a0f] hover:bg-[#e6c200] font-audiowide">
              Get Access
            </Button>
          </form>
          <p className="text-[#3c6e47] text-sm mt-4">
            Start with 60 minutes free. No credit card required.
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 border-t border-[#2a3b4f]">
        <div className="max-w-5xl mx-auto">
          <div className="grid sm:grid-cols-4 gap-8 mb-8">
            <div className="sm:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/static/logo.png" alt="n4mint" className="h-8" />
                <span className="font-audiowide text-[#ffd700]">n4<span className="text-white">mint</span></span>
              </div>
              <p className="text-[#3c6e47] text-sm max-w-xs">
                AI-powered audio and video transcription platform. Transform speech to intelligence.
              </p>
            </div>
            <div>
              <h4 className="font-audiowide text-[#e0ffe0] mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="text-[#3c6e47] hover:text-[#ffd700]">Features</a></li>
                <li><a href="#pricing" className="text-[#3c6e47] hover:text-[#ffd700]">Pricing</a></li>
                <li><span className="text-[#3c6e47] hover:text-[#ffd700] cursor-pointer">API</span></li>
              </ul>
            </div>
            <div>
              <h4 className="font-audiowide text-[#e0ffe0] mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><span className="text-[#3c6e47] hover:text-[#ffd700] cursor-pointer">About</span></li>
                <li><span className="text-[#3c6e47] hover:text-[#ffd700] cursor-pointer">Contact</span></li>
                <li><span className="text-[#3c6e47] hover:text-[#ffd700] cursor-pointer">Privacy</span></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-[#2a3b4f] pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[#3c6e47] text-sm">© 2024 n4mint. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <a href="#" className="text-[#3c6e47] hover:text-[#ffd700] text-sm">Twitter</a>
              <a href="#" className="text-[#3c6e47] hover:text-[#ffd700] text-sm">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
