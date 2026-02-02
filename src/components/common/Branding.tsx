import { Database } from 'lucide-react';

interface BrandingProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  variant?: 'light' | 'dark';
}

export function Branding({ size = 'md', showTagline = false, variant = 'dark' }: BrandingProps) {
  const sizes = {
    sm: { icon: 'w-4 h-4', text: 'text-sm', tagline: 'text-[10px]' },
    md: { icon: 'w-5 h-5', text: 'text-base', tagline: 'text-xs' },
    lg: { icon: 'w-6 h-6', text: 'text-lg', tagline: 'text-sm' },
  };

  const colors = {
    light: { text: 'text-slate-800', subtext: 'text-slate-500' },
    dark: { text: 'text-white', subtext: 'text-slate-400' },
  };

  const s = sizes[size];
  const c = colors[variant];

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600">
        <Database className={`${s.icon} text-white`} />
      </div>
      <div className="flex flex-col">
        <span className={`font-bold ${s.text} ${c.text}`}>
          Schema<span className="text-blue-500">Flow</span>
        </span>
        {showTagline && (
          <span className={`${s.tagline} ${c.subtext}`}>
            Database Design Made Simple
          </span>
        )}
      </div>
    </div>
  );
}

export function BrandingWatermark() {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 rounded-lg backdrop-blur-sm">
      <div className="flex items-center justify-center w-5 h-5 rounded bg-gradient-to-br from-blue-500 to-purple-600">
        <Database className="w-3 h-3 text-white" />
      </div>
      <span className="text-xs font-semibold text-white">
        Schema<span className="text-blue-400">Flow</span>
      </span>
      <span className="text-[10px] text-slate-400 ml-1">
        schemaflow.io
      </span>
    </div>
  );
}

export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg"
      style={{ width: size, height: size }}
    >
      <Database className="text-white" style={{ width: size * 0.5, height: size * 0.5 }} />
    </div>
  );
}
