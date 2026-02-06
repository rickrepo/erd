import { X, Play, Upload, Sparkles, ArrowRight, Database, Download, MousePointer, Crown } from 'lucide-react';
import { APP_VERSION } from './VersionFooter';

interface WelcomeModalProps {
  onClose: () => void;
  onLoadDemo: () => void;
  onStartFresh: () => void;
}

export function WelcomeModal({ onClose, onLoadDemo, onStartFresh }: WelcomeModalProps) {
  const features = [
    {
      icon: Database,
      title: 'Parse SQL Instantly',
      description: 'Paste queries or CREATE TABLE statements — no sign-up required',
      free: true,
    },
    {
      icon: MousePointer,
      title: 'Drag & Drop Design',
      description: 'Arrange tables visually with multiple layout algorithms',
      free: true,
    },
    {
      icon: Download,
      title: 'Export Beautiful ERDs',
      description: 'Download high-quality PNG or SVG images of your schema',
      free: true,
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Matching',
      description: 'Smart relationship detection with semantic analysis',
      free: false,
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-auto">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-700 animate-slideIn my-auto max-h-[calc(100dvh-2rem)]">
        {/* Header - smaller on mobile */}
        <div className="relative h-32 sm:h-48 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center overflow-hidden flex-shrink-0">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative text-center px-4">
            <div className="flex justify-center mb-2 sm:mb-4">
              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Database className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
            </div>
            <h1 className="text-xl sm:text-3xl font-bold text-white mb-1 sm:mb-2">
              Welcome to Schema<span className="text-blue-200">Flow</span>
            </h1>
            <p className="text-white/80 text-xs sm:text-sm">
              The fastest way to visualize and design database schemas
            </p>
          </div>

          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Features Grid - scrollable on mobile */}
        <div className="p-4 sm:p-6 overflow-auto flex-1">
          <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`p-2.5 sm:p-4 rounded-lg sm:rounded-xl transition-colors group ${
                  feature.free
                    ? 'bg-slate-700/50 hover:bg-slate-700'
                    : 'bg-gradient-to-br from-purple-900/30 to-slate-800 border border-purple-700/20 hover:border-purple-600/40'
                }`}
              >
                <div className="flex items-start justify-between mb-2 sm:mb-3">
                  <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform ${
                    feature.free
                      ? 'bg-gradient-to-br from-blue-500/20 to-purple-500/20'
                      : 'bg-gradient-to-br from-purple-500/20 to-yellow-500/20'
                  }`}>
                    <feature.icon className={`w-4 h-4 sm:w-5 sm:h-5 ${feature.free ? 'text-blue-400' : 'text-purple-400'}`} />
                  </div>
                  {!feature.free && (
                    <span className="px-1.5 py-0.5 text-[9px] font-bold text-yellow-400 bg-yellow-400/10 rounded-full flex items-center gap-0.5">
                      <Crown className="w-2.5 h-2.5" />
                      PRO
                    </span>
                  )}
                </div>
                <h3 className="font-semibold text-white text-[11px] sm:text-sm mb-0.5 sm:mb-1">{feature.title}</h3>
                <p className="text-[10px] sm:text-xs text-slate-400 leading-tight">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Free tier callout */}
          <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-green-900/20 border border-green-700/30 rounded-lg text-center">
            <p className="text-[10px] sm:text-xs text-green-300 font-medium">
              No sign-up needed — start designing your schema right away
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2 sm:space-y-3">
            <button
              onClick={onLoadDemo}
              className="w-full py-3 sm:py-4 px-4 sm:px-6 rounded-lg sm:rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold flex items-center justify-center gap-2 sm:gap-3 transition-all shadow-lg shadow-purple-500/25 group text-sm sm:text-base"
            >
              <Play className="w-4 h-4 sm:w-5 sm:h-5 group-hover:scale-110 transition-transform" />
              <span>Try Interactive Demo</span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all hidden sm:block" />
            </button>

            <button
              onClick={onStartFresh}
              className="w-full py-2.5 sm:py-3 px-4 sm:px-6 rounded-lg sm:rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium flex items-center justify-center gap-2 transition-all text-sm sm:text-base"
            >
              <Upload className="w-4 h-4" />
              Start with Your Own SQL
            </button>
          </div>

          {/* Footer hint */}
          <div className="flex items-center justify-between mt-4 text-xs text-slate-500">
            <span className="text-slate-600">v{APP_VERSION}</span>
            <p className="hidden sm:block">
              Press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">Esc</kbd> to close
            </p>
            <span className="sm:hidden" />
          </div>
        </div>
      </div>
    </div>
  );
}
