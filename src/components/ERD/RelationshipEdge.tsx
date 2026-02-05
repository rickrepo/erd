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
    borderRadius: 20,
  });

  // Animation state for the glow trail effect
  const [animationProgress, setAnimationProgress] = useState(0);
  const [showFullPath, setShowFullPath] = useState(false);

  useEffect(() => {
    if (isAnimating) {
      setAnimationProgress(0);
      setShowFullPath(false);

      // Animate the progress from 0 to 1
      const duration = 600; // ms
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

  const edgeColor = selected ? '#c084fc' : '#a855f7'; // Purple-blue AI theme
  const glowColor = '#c4b5fd';
  const strokeWidth = selected ? 4 : 3;

  // Calculate stroke-dasharray for animation
  const pathLength = 1000; // Approximate - will be clamped by SVG
  const dashOffset = pathLength * (1 - animationProgress);

  return (
    <>
      {/* Glow effect layer */}
      <BaseEdge
        id={`${id}-glow`}
        path={edgePath}
        style={{
          stroke: glowColor,
          strokeWidth: strokeWidth + 8,
          strokeLinecap: 'round',
          filter: 'blur(8px)',
          opacity: showFullPath ? 0.6 : animationProgress * 0.6,
        }}
      />

      {/* Animated trail effect */}
      {isAnimating && !showFullPath && (
        <BaseEdge
          id={`${id}-trail`}
          path={edgePath}
          style={{
            stroke: '#c4b5fd',
            strokeWidth: strokeWidth + 4,
            strokeLinecap: 'round',
            strokeDasharray: pathLength,
            strokeDashoffset: dashOffset,
            filter: 'blur(4px)',
            opacity: 0.8,
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
        markerEnd={showFullPath ? `url(#arrow-active)` : undefined}
      />

      {/* Animated dot traveling along the path */}
      {isAnimating && !showFullPath && (
        <circle r="6" fill="#c4b5fd" filter="url(#glow-filter)">
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
            <div className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500 text-white shadow-lg shadow-purple-500/40">
              {label}
            </div>
          </div>
        )}

        {/* Source indicator */}
        {showFullPath && (
          <div
            className="nodrag nopan animate-fadeIn"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${sourceX + (targetX > sourceX ? 20 : -20)}px,${sourceY}px)`,
            }}
          >
            <div className="w-3 h-3 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50 animate-pulse" />
          </div>
        )}

        {/* Target indicator */}
        {showFullPath && (
          <div
            className="nodrag nopan animate-fadeIn"
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${targetX + (sourceX > targetX ? 20 : -20)}px,${targetY}px)`,
            }}
          >
            <div className="w-3 h-3 rounded-full bg-purple-400 shadow-lg shadow-purple-400/50 animate-pulse" />
          </div>
        )}
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdge);
