import { useState, useCallback } from 'react';
import { toPng, toSvg } from 'html-to-image';
import { Download, Image, FileCode, Loader2, Check, Settings2, Crown } from 'lucide-react';
import { useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { BrandingWatermark } from '../common/Branding';
import { useAuthStore } from '../../store/useAuthStore';

interface ExportPanelProps {
  onClose: () => void;
}

type ExportFormat = 'png' | 'svg';
type ExportQuality = 'standard' | 'high' | 'ultra';

const QUALITY_SETTINGS: Record<ExportQuality, { scale: number; label: string }> = {
  standard: { scale: 1, label: '1x (Standard)' },
  high: { scale: 2, label: '2x (High DPI)' },
  ultra: { scale: 4, label: '4x (Print Quality)' },
};

export function ExportPanel({ onClose }: ExportPanelProps) {
  const { hasFeature, setShowPremiumModal } = useAuthStore();
  const canRemoveWatermark = hasFeature('exportWithoutWatermark');

  const [format, setFormat] = useState<ExportFormat>('png');
  const [quality, setQuality] = useState<ExportQuality>('high');
  const [includeBranding, setIncludeBranding] = useState(!canRemoveWatermark);
  const [transparentBg, setTransparentBg] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exported, setExported] = useState(false);

  const { getNodes } = useReactFlow();

  const handleExport = useCallback(async () => {
    setIsExporting(true);

    try {
      const nodes = getNodes();
      if (nodes.length === 0) {
        alert('No tables to export. Add some tables first!');
        setIsExporting(false);
        return;
      }

      const nodesBounds = getNodesBounds(nodes);
      const padding = 60;
      const width = nodesBounds.width + padding * 2;
      const height = nodesBounds.height + padding * 2 + (includeBranding ? 40 : 0);

      const viewport = getViewportForBounds(
        nodesBounds,
        width,
        height,
        0.5,
        2,
        padding
      );

      const flowElement = document.querySelector('.react-flow') as HTMLElement;
      if (!flowElement) {
        throw new Error('Could not find React Flow element');
      }

      const scale = QUALITY_SETTINGS[quality].scale;

      const options = {
        backgroundColor: transparentBg ? 'transparent' : '#0f172a',
        width: width,
        height: height,
        style: {
          width: `${width}px`,
          height: `${height}px`,
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
        },
        pixelRatio: scale,
      };

      let dataUrl: string;

      if (format === 'svg') {
        dataUrl = await toSvg(flowElement, options);
      } else {
        dataUrl = await toPng(flowElement, options);
      }

      // If branding is enabled, we need to add the watermark
      if (includeBranding && format === 'png') {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Could not get canvas context');

        const img = new window.Image();
        img.crossOrigin = 'anonymous';

        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);

            // Draw branding watermark
            const watermarkHeight = 32 * scale;
            const padding = 16 * scale;

            // Semi-transparent background for watermark
            ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
            ctx.roundRect(
              padding,
              canvas.height - watermarkHeight - padding,
              200 * scale,
              watermarkHeight,
              8 * scale
            );
            ctx.fill();

            // Draw text
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${14 * scale}px Inter, system-ui, sans-serif`;
            ctx.fillText(
              'SchemaFlow',
              padding + 12 * scale,
              canvas.height - padding - 10 * scale
            );

            ctx.fillStyle = '#94a3b8';
            ctx.font = `${10 * scale}px Inter, system-ui, sans-serif`;
            ctx.fillText(
              'schemaflow.io',
              padding + 110 * scale,
              canvas.height - padding - 10 * scale
            );

            dataUrl = canvas.toDataURL('image/png', 1.0);
            resolve();
          };
          img.onerror = reject;
          img.src = dataUrl;
        });
      }

      // Download
      const link = document.createElement('a');
      link.download = `schema-${Date.now()}.${format}`;
      link.href = dataUrl;
      link.click();

      setExported(true);
      setTimeout(() => {
        setExported(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, [format, quality, includeBranding, transparentBg, getNodes, onClose]);

  return (
    <div className="absolute top-4 right-4 w-80 bg-slate-800 rounded-xl shadow-2xl border border-slate-700 overflow-hidden z-50 animate-slideIn">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Download className="w-4 h-4 text-blue-400" />
          <span className="font-semibold text-white">Export ERD</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white transition-colors text-xl leading-none"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        {/* Format Selection */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">Format</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFormat('png')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                format === 'png'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <Image className="w-4 h-4" />
              PNG
            </button>
            <button
              onClick={() => setFormat('svg')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                format === 'svg'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
              }`}
            >
              <FileCode className="w-4 h-4" />
              SVG
            </button>
          </div>
        </div>

        {/* Quality Selection */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            <Settings2 className="w-3 h-3 inline mr-1" />
            Quality
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(QUALITY_SETTINGS) as ExportQuality[]).map((q) => (
              <button
                key={q}
                onClick={() => setQuality(q)}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  quality === q
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {QUALITY_SETTINGS[q].label}
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-3">
          <label className={`flex items-center gap-3 group ${canRemoveWatermark ? 'cursor-pointer' : ''}`}>
            <input
              type="checkbox"
              checked={canRemoveWatermark ? includeBranding : true}
              onChange={(e) => {
                if (canRemoveWatermark) {
                  setIncludeBranding(e.target.checked);
                } else {
                  setShowPremiumModal(true, 'feature');
                }
              }}
              disabled={!canRemoveWatermark}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800 disabled:opacity-50"
            />
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors flex items-center gap-2">
              Include SchemaFlow branding
              {!canRemoveWatermark && (
                <button
                  onClick={() => setShowPremiumModal(true, 'feature')}
                  className="px-1.5 py-0.5 text-[9px] font-bold text-yellow-400 bg-yellow-400/10 rounded-full flex items-center gap-0.5 hover:bg-yellow-400/20 transition-colors"
                >
                  <Crown className="w-2.5 h-2.5" />
                  PRO to remove
                </button>
              )}
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={transparentBg}
              onChange={(e) => setTransparentBg(e.target.checked)}
              className="w-4 h-4 rounded border-slate-600 bg-slate-700 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800"
            />
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">
              Transparent background
            </span>
          </label>
        </div>

        {/* Preview of branding */}
        {includeBranding && (
          <div className="p-3 bg-slate-900 rounded-lg">
            <p className="text-[10px] text-slate-500 mb-2">Watermark preview:</p>
            <BrandingWatermark />
          </div>
        )}
      </div>

      {/* Export Button */}
      <div className="px-4 pb-4">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`w-full py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-all ${
            exported
              ? 'bg-green-600 text-white'
              : isExporting
                ? 'bg-slate-600 text-slate-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg'
          }`}
        >
          {exported ? (
            <>
              <Check className="w-4 h-4" />
              Exported!
            </>
          ) : isExporting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Exporting...
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              Export {format.toUpperCase()}
            </>
          )}
        </button>
      </div>
    </div>
  );
}
