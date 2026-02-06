import { useStore } from '../../store/useStore';
import { useAuthStore } from '../../store/useAuthStore';

// Version footer - increment this with each push
export const APP_VERSION = '1.9.1';

export function VersionFooter() {
  const { tables, relationships } = useStore();
  const { subscription, setShowPremiumModal } = useAuthStore();
  const isPremium = subscription.tier === 'pro' || subscription.tier === 'enterprise';

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 z-40 pointer-events-auto">
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px]">
        {/* Left: Stats */}
        <div className="flex items-center gap-3 text-slate-400">
          {tables.length > 0 && (
            <>
              <span>
                <span className="text-white font-medium">{tables.length}</span> tables
              </span>
              <span className="text-slate-600">·</span>
              <span>
                <span className="text-white font-medium">{relationships.length}</span> joins
              </span>
            </>
          )}
        </div>

        {/* Right: Version & Watermark */}
        <div className="flex items-center gap-3">
          {!isPremium && tables.length > 0 && (
            <button
              onClick={() => setShowPremiumModal(true, 'feature')}
              className="text-slate-500 hover:text-purple-400 transition-colors"
            >
              Remove watermark
            </button>
          )}
          <span className="text-slate-600">v{APP_VERSION}</span>
        </div>
      </div>
    </div>
  );
}
