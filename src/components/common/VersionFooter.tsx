// Version footer - increment this with each push
export const APP_VERSION = '1.1.0';

export function VersionFooter() {
  return (
    <div className="fixed bottom-0 right-0 px-2 py-1 text-[10px] text-slate-600 bg-slate-900/80 rounded-tl z-50 pointer-events-none">
      v{APP_VERSION}
    </div>
  );
}
