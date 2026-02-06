import { memo, useEffect, useState, useRef } from 'react';
import { BaseEdge, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

// Helper to interpolate between two hex colors
function interpolateColor(color1: string, color2: string, factor: number): string {
  const hex1 = color1.replace('#', '');
  const hex2 = color2.replace('#', '');

  const r1 = parseInt(hex1.substring(0, 2), 16);
  const g1 = parseInt(hex1.substring(2, 4), 16);
  const b1 = parseInt(hex1.substring(4, 6), 16);

  const r2 = parseInt(hex2.substring(0, 2), 16);
  const g2 = parseInt(hex2.substring(2, 4), 16);
  const b2 = parseInt(hex2.substring(4, 6), 16);

  const r = Math.round(r1 + (r2 - r1) * factor);
  const g = Math.round(g1 + (g2 - g1) * factor);
  const b = Math.round(b1 + (b2 - b1) * factor);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function RelationshipEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style = {},
}: EdgeProps) {
  const relationship = data?.relationship as {
    type?: 'one-to-one' | 'one-to-many' | 'many-to-many';
  } | undefined;

  const isActive = (data?.isActive as boolean) ?? false;
  const isAnimating = (data?.isAnimating as boolean) ?? false;
  const sourceColor = (data?.sourceColor as string) || '#3b82f6';
  const targetColor = (data?.targetColor as string) || '#8b5cf6';
  const edgeStyle = (data?.edgeStyle as 'gradient' | 'flat') || 'gradient';
  const shouldCycleColor = edgeStyle === 'gradient';

  const relType = relationship?.type || 'one-to-many';

  const label =
    relType === 'one-to-one' ? '1:1' :
    relType === 'one-to-many' ? '1:N' :
    'N:M';

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    borderRadius: 16,
  });

  // Animation state for the draw-in effect
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showFullPath, setShowFullPath] = useState(false);

  // Color cycling state - continuously cycles between source and target colors
  const [colorCycleProgress, setColorCycleProgress] = useState(0);
  const colorCycleRef = useRef<number | null>(null);

  // Draw-in animation effect
  useEffect(() => {
    if (isAnimating) {
      setAnimationProgress(0);
      setShowFullPath(false);

      const duration = 600;
      const startTime = Date.now();

      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setAnimationProgress(progress);

        if (progress < 1) {
          requestAnimationFrame(animate);
        } else {
          // Smooth transition to full path
          setTimeout(() => setShowFullPath(true), 50);
        }
      };

      requestAnimationFrame(animate);
    } else if (isActive) {
      setShowFullPath(true);
      setAnimationProgress(1);
    } else {
      setShowFullPath(false);
      setAnimationProgress(0);
    }
  }, [isAnimating, isActive]);

  // Continuous color cycling animation
  useEffect(() => {
    if (!isActive || !shouldCycleColor) {
      if (colorCycleRef.current) {
        cancelAnimationFrame(colorCycleRef.current);
        colorCycleRef.current = null;
      }
      return;
    }

    const cycleDuration = 4000; // 4 seconds for full cycle
    const startTime = Date.now();

    const animateColor = () => {
      const elapsed = Date.now() - startTime;
      // Use sine wave for smooth back-and-forth transition
      const progress = (Math.sin((elapsed / cycleDuration) * Math.PI * 2) + 1) / 2;
      setColorCycleProgress(progress);
      colorCycleRef.current = requestAnimationFrame(animateColor);
    };

    colorCycleRef.current = requestAnimationFrame(animateColor);

    return () => {
      if (colorCycleRef.current) {
        cancelAnimationFrame(colorCycleRef.current);
      }
    };
  }, [isActive, shouldCycleColor]);

  // If not active, don't render the edge at all
  if (!isActive && !isAnimating) {
    return null;
  }

  // Dark outline for contrast
  const outlineColor = '#0f172a';
  const strokeWidth = selected ? 3.5 : 3;

  // Calculate current color based on cycling progress
  const currentColor = shouldCycleColor
    ? interpolateColor(sourceColor, targetColor, colorCycleProgress)
    : sourceColor;

  // Calculate stroke-dasharray for draw-in animation
  const pathLength = 1000;
  const dashOffset = pathLength * (1 - animationProgress);

  return (
    <>
      {/* Dark outline for contrast against any background */}
      <BaseEdge
        id={`${id}-outline`}
        path={edgePath}
        style={{
          stroke: outlineColor,
          strokeWidth: strokeWidth + 4,
          strokeLinecap: 'round',
          opacity: showFullPath ? 1 : animationProgress,
        }}
      />

      {/* Subtle glow effect */}
      {showFullPath && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            stroke: currentColor,
            strokeWidth: strokeWidth + 6,
            strokeLinecap: 'round',
            filter: 'blur(6px)',
            opacity: 0.5,
          }}
        />
      )}

      {/* Animated trail effect during draw-in */}
      {isAnimating && !showFullPath && (
        <BaseEdge
          id={`${id}-trail`}
          path={edgePath}
          style={{
            stroke: currentColor,
            strokeWidth: strokeWidth + 3,
            strokeLinecap: 'round',
            strokeDasharray: pathLength,
            strokeDashoffset: dashOffset,
            filter: 'blur(3px)',
            opacity: 0.7,
          }}
        />
      )}

      {/* Main edge - solid color that cycles between source and target */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: currentColor,
          strokeWidth,
          strokeLinecap: 'round',
          strokeDasharray: isAnimating && !showFullPath ? pathLength : undefined,
          strokeDashoffset: isAnimating && !showFullPath ? dashOffset : undefined,
        }}
      />

      {/* Animated dot traveling along the path during draw-in */}
      {isAnimating && !showFullPath && (
        <circle r="5" fill={currentColor} filter="url(#glow-filter)">
          <animateMotion
            dur="0.6s"
            repeatCount="1"
            path={edgePath}
          />
        </circle>
      )}

      <EdgeLabelRenderer>
        {/* Center label - only show when path is visible */}
        {(showFullPath || animationProgress > 0.5) && (
          <div
            className="nodrag nopan pointer-events-auto"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              opacity: showFullPath ? 1 : (animationProgress - 0.5) * 2,
              transition: 'opacity 0.2s ease-out',
            }}
          >
            <div
              className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-lg"
              style={{
                background: currentColor,
                border: '1px solid rgba(255,255,255,0.3)',
              }}
            >
              {label}
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdge);
