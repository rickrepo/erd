import { X, AlertCircle, Crown, Clock, Sparkles, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { Branding } from './Branding';
import { useAuthStore } from '../../store/useAuthStore';
import { ANONYMOUS_LIMITS } from '../../types';
import { useState, useEffect } from 'react';

interface UsageLimitModalProps {
  onClose: () => void;
  onUpgrade: () => void;
}

export function UsageLimitModal({ onClose, onUpgrade }: UsageLimitModalProps) {
  const { user, usage, subscription, setShowAuthPage, getAnonymousUsageData } = useAuthStore();
  const [anonymousData, setAnonymousData] = useState({ used: 0, limit: 2, remaining: 0 });

  const isAnonymous = !user;

  useEffect(() => {
    if (isAnonymous) {
      getAnonymousUsageData().then(setAnonymousData);
    }
  }, [isAnonymous, getAnonymousUsageData]);

  const getResetTime = () => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const diff = tomorrow.getTime() - now.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  const handleSignUp = () => {
    onClose();
    setShowAuthPage(true);
  };

  // Anonymous user - needs to sign up
  if (isAnonymous) {
    return (
      <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-700">
            <Branding size="sm" variant="dark" />
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 text-center">
            {/* Icon */}
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-purple-500/10 flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-purple-400" />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">
              Free Trial Complete!
            </h2>
            <p className="text-slate-400 mb-6">
              You've used all {ANONYMOUS_LIMITS.maxGenerationsTotal} free schema generations.
              Sign up for free to continue with {subscription.features.maxGenerationsPerDay} generations per day!
            </p>

            {/* Usage Stats */}
            <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <span className="text-slate-400 text-sm">Free trial usage</span>
                <span className="text-white font-medium">
                  {anonymousData.used} / {anonymousData.limit}
                </span>
              </div>
              <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full"
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              <button
                onClick={handleSignUp}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-purple-500 to-blue-600 text-white font-medium hover:from-purple-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2"
              >
                <UserPlus className="w-5 h-5" />
                Create Free Account
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={handleSignUp}
                className="w-full py-3 px-4 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
              >
                <LogIn className="w-4 h-4" />
                Sign In to Existing Account
              </button>
            </div>

            {/* Benefits */}
            <div className="mt-6 pt-6 border-t border-slate-700">
              <p className="text-sm text-slate-500 mb-3">Free account includes:</p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Sparkles className="w-3.5 h-3.5 text-green-400" />
                  3 generations/day
                </div>
                <div className="flex items-center gap-1.5 text-slate-400">
                  <Crown className="w-3.5 h-3.5 text-blue-400" />
                  Save your schemas
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Registered user - needs to upgrade
  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full border border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <Branding size="sm" variant="dark" />
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-700 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          {/* Warning Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-500/10 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-amber-400" />
          </div>

          <h2 className="text-xl font-bold text-white mb-2">
            Daily Limit Reached
          </h2>
          <p className="text-slate-400 mb-6">
            You've used all {subscription.features.maxGenerationsPerDay} generations for today.
            Upgrade to Pro for 100 generations per day!
          </p>

          {/* Usage Stats */}
          <div className="bg-slate-900/50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-slate-400 text-sm">Today's usage</span>
              <span className="text-white font-medium">
                {usage.generationsToday} / {subscription.features.maxGenerationsPerDay}
              </span>
            </div>
            <div className="w-full h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-500 to-red-500 rounded-full"
                style={{ width: '100%' }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 mt-3 text-slate-500 text-sm">
              <Clock className="w-4 h-4" />
              Resets in {getResetTime()}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <button
              onClick={onUpgrade}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium hover:from-blue-600 hover:to-purple-700 transition-all flex items-center justify-center gap-2"
            >
              <Crown className="w-5 h-5" />
              Upgrade to Pro
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              onClick={onClose}
              className="w-full py-3 px-4 rounded-xl bg-slate-700 text-slate-300 font-medium hover:bg-slate-600 transition-colors"
            >
              Wait for Reset
            </button>
          </div>

          {/* Pro Benefits */}
          <div className="mt-6 pt-6 border-t border-slate-700">
            <p className="text-sm text-slate-500 mb-3">With Pro, you get:</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-1.5 text-slate-400">
                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                AI-powered matching
              </div>
              <div className="flex items-center gap-1.5 text-slate-400">
                <Crown className="w-3.5 h-3.5 text-blue-400" />
                100 generations/day
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
