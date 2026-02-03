import { useState } from 'react';
import {
  X,
  Crown,
  Sparkles,
  Check,
  Zap,
  Shield,
  Palette,
  Mail,
  Lock,
  User,
  ArrowRight,
  Loader2
} from 'lucide-react';
import { Branding } from './Branding';
import { useAuthStore } from '../../store/useAuthStore';

interface PremiumModalProps {
  onClose: () => void;
}

type ModalView = 'pricing' | 'login' | 'register' | 'checkout';

export function PremiumModal({ onClose }: PremiumModalProps) {
  const { user, login, register, upgradeToPro, premiumModalTrigger } = useAuthStore();
  const [view, setView] = useState<ModalView>(user ? 'pricing' : 'pricing');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      setView('pricing');
    } catch {
      setError('Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await register(email, password, name);
      setView('pricing');
    } catch {
      setError('Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgrade = async () => {
    if (!user) {
      setView('register');
      return;
    }

    setIsLoading(true);
    try {
      await upgradeToPro();
      onClose();
    } catch {
      setError('Upgrade failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTriggerMessage = () => {
    switch (premiumModalTrigger) {
      case 'limit':
        return "You've reached your free tier limit";
      case 'feature':
        return "This feature requires Pro";
      default:
        return "Upgrade to Pro";
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <Branding size="md" variant="dark" />
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {view === 'pricing' && (
          <div className="p-6">
            {/* Trigger Message */}
            {premiumModalTrigger && (
              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-400 rounded-full text-sm">
                  <Sparkles className="w-4 h-4" />
                  {getTriggerMessage()}
                </div>
              </div>
            )}

            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Unlock the Full Power of SchemaFlow
            </h2>
            <p className="text-slate-400 text-center mb-8">
              Get AI-powered matching, unlimited generations, and more
            </p>

            {/* Pricing Cards */}
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              {/* Free Tier */}
              <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-slate-700 flex items-center justify-center">
                    <Zap className="w-5 h-5 text-slate-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Free</h3>
                    <p className="text-slate-400 text-sm">Get started</p>
                  </div>
                </div>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">$0</span>
                  <span className="text-slate-400">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-slate-300 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Unlimited SQL parsing
                  </li>
                  <li className="flex items-center gap-2 text-slate-300 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Unlimited ERD generation
                  </li>
                  <li className="flex items-center gap-2 text-slate-300 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    Export with watermark
                  </li>
                  <li className="flex items-center gap-2 text-slate-300 text-sm">
                    <Check className="w-4 h-4 text-green-500" />
                    No sign-up required
                  </li>
                  <li className="flex items-center gap-2 text-slate-500 text-sm">
                    <X className="w-4 h-4 text-slate-600" />
                    AI-powered matching
                  </li>
                </ul>
                <button
                  disabled
                  className="w-full py-2.5 px-4 rounded-lg bg-slate-700 text-slate-400 font-medium cursor-not-allowed"
                >
                  {user ? 'Current Plan' : 'Free Forever'}
                </button>
              </div>

              {/* Pro Tier */}
              <div className="bg-gradient-to-b from-blue-900/30 to-purple-900/30 rounded-xl p-6 border border-blue-500/30 relative overflow-hidden">
                <div className="absolute top-3 right-3">
                  <span className="px-2 py-1 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-bold rounded-full">
                    POPULAR
                  </span>
                </div>
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Crown className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Pro</h3>
                    <p className="text-blue-300 text-sm">For professionals</p>
                  </div>
                </div>
                <div className="mb-6">
                  <span className="text-3xl font-bold text-white">$12</span>
                  <span className="text-slate-400">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-center gap-2 text-slate-200 text-sm">
                    <Check className="w-4 h-4 text-green-400" />
                    100 ERD generations per day
                  </li>
                  <li className="flex items-center gap-2 text-slate-200 text-sm">
                    <Sparkles className="w-4 h-4 text-yellow-400" />
                    <span className="font-medium text-yellow-300">AI-powered relationship matching</span>
                  </li>
                  <li className="flex items-center gap-2 text-slate-200 text-sm">
                    <Check className="w-4 h-4 text-green-400" />
                    Export without watermark
                  </li>
                  <li className="flex items-center gap-2 text-slate-200 text-sm">
                    <Check className="w-4 h-4 text-green-400" />
                    Priority support
                  </li>
                </ul>
                <button
                  onClick={handleUpgrade}
                  disabled={isLoading}
                  className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      {user ? 'Upgrade to Pro' : 'Get Started'}
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Features Highlight */}
            <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-yellow-400" />
                Pro Feature: AI-Powered Matching
              </h3>
              <p className="text-slate-400 text-sm mb-4">
                Our AI analyzes your SQL queries and schema to automatically detect and suggest
                relationships between tables with high accuracy. It understands naming conventions,
                data types, and common patterns to save you time.
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-slate-800 rounded-lg">
                  <Shield className="w-6 h-6 text-blue-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Smart FK Detection</p>
                </div>
                <div className="text-center p-3 bg-slate-800 rounded-lg">
                  <Zap className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Instant Analysis</p>
                </div>
                <div className="text-center p-3 bg-slate-800 rounded-lg">
                  <Palette className="w-6 h-6 text-purple-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Pattern Recognition</p>
                </div>
              </div>
            </div>

            {/* Login Link */}
            {!user && (
              <p className="text-center text-slate-400 text-sm mt-6">
                Already have an account?{' '}
                <button
                  onClick={() => setView('login')}
                  className="text-blue-400 hover:text-blue-300 font-medium"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        )}

        {view === 'login' && (
          <div className="p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Welcome back
            </h2>
            <p className="text-slate-400 text-center mb-8">
              Sign in to your SchemaFlow account
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-6 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <p className="text-center text-slate-400 text-sm mt-6">
              Don't have an account?{' '}
              <button
                onClick={() => setView('register')}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Create one
              </button>
            </p>

            <button
              onClick={() => setView('pricing')}
              className="w-full mt-4 text-slate-500 text-sm hover:text-slate-400"
            >
              Back to pricing
            </button>
          </div>
        )}

        {view === 'register' && (
          <div className="p-8 max-w-md mx-auto">
            <h2 className="text-2xl font-bold text-white text-center mb-2">
              Create your account
            </h2>
            <p className="text-slate-400 text-center mb-8">
              Start designing professional database schemas
            </p>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg p-3 mb-6 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Name
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="Your name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="Create a password"
                    required
                    minLength={8}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  At least 8 characters
                </p>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  'Create Account'
                )}
              </button>

              <p className="text-xs text-slate-500 text-center">
                By creating an account, you agree to our Terms of Service and Privacy Policy.
              </p>
            </form>

            <p className="text-center text-slate-400 text-sm mt-6">
              Already have an account?{' '}
              <button
                onClick={() => setView('login')}
                className="text-blue-400 hover:text-blue-300 font-medium"
              >
                Sign in
              </button>
            </p>

            <button
              onClick={() => setView('pricing')}
              className="w-full mt-4 text-slate-500 text-sm hover:text-slate-400"
            >
              Back to pricing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
