import { useStore } from '../../store/useStore';

// Version footer - increment this with each push
export const APP_VERSION = '2.1.6';

export function VersionFooter() {
  const { tables, relationships } = useStore();

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 z-40 pointer-events-auto">
      <div className="flex items-center justify-between px-3 py-1.5 text-[11px]">
        {/* Left: Branding & Stats */}
        <div className="flex items-center gap-3 text-slate-400">
          <span className="text-slate-500">
            Made with <span className="text-purple-400 font-medium">SchemaFlow</span>
            <span className="text-slate-600 mx-1">·</span>
            Built by <span className="text-purple-400 font-medium">Ricky</span>
          </span>
          {tables.length > 0 && (
            <>
              <span className="text-slate-600">·</span>
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

        {/* Right: Version */}
        <span className="text-slate-600">v{APP_VERSION}</span>
      </div>
    </div>
  );
}
