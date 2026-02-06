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
  const sourceColor = (data?.sourceColor as string) || '#3b82f6';
  const targetColor = (data?.targetColor as string) || '#8b5cf6';

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

  // Generate unique gradient ID for this edge
  const gradientId = `gradient-${id}`;

  // Calculate gradient direction based on source/target positions
  const isLeftToRight = targetX >= sourceX;

  // Dark outline for contrast
  const outlineColor = '#0f172a';
  const strokeWidth = selected ? 3 : 2.5;

  // For glow, blend the two colors
  const glowColor = sourceColor;

  // Calculate stroke-dasharray for animation
  const pathLength = 1000;
  const dashOffset = pathLength * (1 - animationProgress);

  return (
    <>
      {/* SVG Gradient Definition */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <linearGradient
            id={gradientId}
            x1={isLeftToRight ? '0%' : '100%'}
            y1="0%"
            x2={isLeftToRight ? '100%' : '0%'}
            y2="0%"
          >
            <stop offset="0%" stopColor={sourceColor} />
            <stop offset="50%" stopColor={selected ? '#22d3ee' : '#67e8f9'} />
            <stop offset="100%" stopColor={targetColor} />
          </linearGradient>
          {/* Arrow marker matching target color */}
          <marker
            id={`arrow-${id}`}
            viewBox="0 0 10 10"
            refX="10"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={targetColor} />
          </marker>
        </defs>
      </svg>

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

      {/* Subtle glow effect with gradient */}
      {showFullPath && (
        <BaseEdge
          id={`${id}-glow`}
          path={edgePath}
          style={{
            stroke: `url(#${gradientId})`,
            strokeWidth: strokeWidth + 6,
            strokeLinecap: 'round',
            filter: 'blur(6px)',
            opacity: 0.5,
          }}
        />
      )}

      {/* Animated trail effect */}
      {isAnimating && !showFullPath && (
        <BaseEdge
          id={`${id}-trail`}
          path={edgePath}
          style={{
            stroke: `url(#${gradientId})`,
            strokeWidth: strokeWidth + 3,
            strokeLinecap: 'round',
            strokeDasharray: pathLength,
            strokeDashoffset: dashOffset,
            filter: 'blur(3px)',
            opacity: 0.7,
          }}
        />
      )}

      {/* Main edge with gradient */}
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: `url(#${gradientId})`,
          strokeWidth,
          strokeLinecap: 'round',
          strokeDasharray: isAnimating && !showFullPath ? pathLength : undefined,
          strokeDashoffset: isAnimating && !showFullPath ? dashOffset : undefined,
          transition: showFullPath ? 'all 0.3s ease-out' : undefined,
        }}
        markerEnd={showFullPath ? `url(#arrow-${id})` : undefined}
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
            <div
              className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white shadow-lg"
              style={{
                background: `linear-gradient(90deg, ${sourceColor}, ${targetColor})`,
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
