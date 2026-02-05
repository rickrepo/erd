import { memo, useEffect, useState } from 'react';
import { BaseEdge, getSmoothStepPath, EdgeLabelRenderer } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

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

  // Animation state for the glow trail effect
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showFullPath, setShowFullPath] = useState(false);

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
          setShowFullPath(true);
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

  // If not active, don't render the edge at all
  if (!isActive && !isAnimating) {
    return null;
  }

  // Better colors with higher contrast
  const edgeColor = selected ? '#22d3ee' : '#06b6d4'; // Cyan for better visibility
  const outlineColor = '#0f172a'; // Dark outline for contrast
  const glowColor = '#67e8f9';
  const strokeWidth = selected ? 3 : 2.5;

  // Calculate stroke-dasharray for animation
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
            stroke: glowColor,
            strokeWidth: strokeWidth + 6,
            strokeLinecap: 'round',
            filter: 'blur(6px)',
            opacity: 0.4,
          }}
        />
      )}

      {/* Animated trail effect */}
      {isAnimating && !showFullPath && (
        <BaseEdge
          id={`${id}-trail`}
          path={edgePath}
          style={{
            stroke: glowColor,
            strokeWidth: strokeWidth + 3,
            strokeLinecap: 'round',
            strokeDasharray: pathLength,
            strokeDashoffset: dashOffset,
            filter: 'blur(3px)',
            opacity: 0.7,
          }}
        />
      )}

      {/* Main edge */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth,
          strokeLinecap: 'round',
          strokeDasharray: isAnimating && !showFullPath ? pathLength : undefined,
          strokeDashoffset: isAnimating && !showFullPath ? dashOffset : undefined,
          transition: showFullPath ? 'all 0.3s ease-out' : undefined,
        }}
        markerEnd={showFullPath ? `url(#arrow-cyan)` : undefined}
      />

      {/* Animated dot traveling along the path */}
      {isAnimating && !showFullPath && (
        <circle r="5" fill={glowColor} filter="url(#glow-filter)">
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
            <div className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-600 text-white shadow-lg border border-cyan-400/50">
              {label}
            </div>
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdge);
