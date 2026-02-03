import { memo } from 'react';
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

  const edgeColor = selected ? '#818cf8' : '#6366f1';
  const strokeWidth = selected ? 3 : 2;

  // Source/target cardinality markers
  const sourceLabel = relType === 'many-to-many' ? 'N' : '1';
  const targetLabel = relType === 'one-to-one' ? '1' : relType === 'one-to-many' ? 'N' : 'M';

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          ...style,
          stroke: edgeColor,
          strokeWidth,
          transition: 'stroke 0.2s, stroke-width 0.2s',
        }}
        markerEnd={`url(#arrow-${selected ? 'selected' : 'default'})`}
      />

      <EdgeLabelRenderer>
        {/* Center label */}
        <div
          className="nodrag nopan pointer-events-auto"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
          }}
        >
          <div
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-all ${
              selected
                ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 scale-110'
                : 'bg-slate-800 text-slate-400 border border-slate-600 hover:bg-slate-700 hover:text-white hover:border-slate-500'
            }`}
          >
            {label}
          </div>
        </div>

        {/* Source cardinality */}
        <div
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${sourceX + (targetX > sourceX ? 18 : -18)}px,${sourceY - 12}px)`,
          }}
        >
          <span className={`text-[9px] font-bold ${selected ? 'text-indigo-300' : 'text-slate-500'}`}>
            {sourceLabel}
          </span>
        </div>

        {/* Target cardinality */}
        <div
          className="nodrag nopan"
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${targetX + (sourceX > targetX ? 18 : -18)}px,${targetY - 12}px)`,
          }}
        >
          <span className={`text-[9px] font-bold ${selected ? 'text-indigo-300' : 'text-slate-500'}`}>
            {targetLabel}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

export default memo(RelationshipEdge);
