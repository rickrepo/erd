import { X, Play, Upload, Sparkles, ArrowRight, Database, Download, MousePointer } from 'lucide-react';

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
      description: 'Paste your queries or CREATE TABLE statements and watch the magic happen',
    },
    {
      icon: Sparkles,
      title: 'AI-Powered Relationships',
      description: 'Automatically detect foreign keys from column naming patterns',
    },
    {
      icon: MousePointer,
      title: 'Drag & Drop Design',
      description: 'Arrange tables visually with multiple layout algorithms',
    },
    {
      icon: Download,
      title: 'Export Beautiful ERDs',
      description: 'Download high-quality PNG or SVG images of your schema',
    },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden border border-slate-700 animate-slideIn">
        {/* Header */}
        <div className="relative h-48 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-500 flex items-center justify-center overflow-hidden">
          {/* Animated background elements */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-white/10 rounded-full blur-2xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-40 h-40 bg-white/10 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          <div className="relative text-center">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                <Database className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome to Schema<span className="text-blue-200">Flow</span>
            </h1>
            <p className="text-white/80 text-sm">
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

        {/* Features Grid */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="p-4 rounded-xl bg-slate-700/50 hover:bg-slate-700 transition-colors group"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-5 h-5 text-blue-400" />
                </div>
                <h3 className="font-semibold text-white text-sm mb-1">{feature.title}</h3>
                <p className="text-xs text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={onLoadDemo}
              className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold flex items-center justify-center gap-3 transition-all shadow-lg shadow-purple-500/25 group"
            >
              <Play className="w-5 h-5 group-hover:scale-110 transition-transform" />
              <span>Try Interactive Demo</span>
              <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </button>

            <button
              onClick={onStartFresh}
              className="w-full py-3 px-6 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-medium flex items-center justify-center gap-2 transition-all"
            >
              <Upload className="w-4 h-4" />
              Start with Your Own SQL
            </button>
          </div>

          {/* Footer hint */}
          <p className="text-center text-xs text-slate-500 mt-4">
            Press <kbd className="px-1.5 py-0.5 bg-slate-700 rounded text-slate-400">Esc</kbd> to close
          </p>
        </div>
      </div>
    </div>
  );
}
