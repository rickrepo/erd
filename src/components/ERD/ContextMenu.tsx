import { useEffect, useRef } from 'react';
import {
  Trash2,
  Edit3,
  Copy,
  Plus,
  LayoutGrid,
  Network,
  GitBranch,
  Columns3,
  ArrowLeftRight,
} from 'lucide-react';

export interface ContextMenuPosition {
  x: number;
  y: number;
}

interface ContextMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger';
  separator?: boolean;
}

interface ContextMenuProps {
  position: ContextMenuPosition;
  items: ContextMenuItem[];
  onClose: () => void;
}

export function ContextMenu({ position, items, onClose }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  const adjustedPosition = { ...position };
  if (typeof window !== 'undefined') {
    const menuWidth = 200;
    const menuHeight = items.length * 36 + 16;
    if (position.x + menuWidth > window.innerWidth) {
      adjustedPosition.x = window.innerWidth - menuWidth - 8;
    }
    if (position.y + menuHeight > window.innerHeight) {
      adjustedPosition.y = window.innerHeight - menuHeight - 8;
    }
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-[100] min-w-[180px] bg-slate-800 border border-slate-600 rounded-xl shadow-2xl py-1.5 animate-fadeIn"
      style={{ left: adjustedPosition.x, top: adjustedPosition.y }}
    >
      {items.map((item, index) => (
        <div key={index}>
          {item.separator && index > 0 && (
            <div className="my-1 border-t border-slate-700" />
          )}
          <button
            onClick={() => {
              item.onClick();
              onClose();
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
              item.variant === 'danger'
                ? 'text-red-400 hover:bg-red-500/10'
                : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            }`}
          >
            <span className="w-4 h-4 flex items-center justify-center">{item.icon}</span>
            {item.label}
          </button>
        </div>
      ))}
    </div>
  );
}

// Helper to build menu items for different contexts

export function buildTableMenuItems(opts: {
  tableId: string;
  tableName: string;
  onRename: () => void;
  onAddColumn: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}): ContextMenuItem[] {
  return [
    {
      label: 'Rename Table',
      icon: <Edit3 className="w-3.5 h-3.5" />,
      onClick: opts.onRename,
    },
    {
      label: 'Add Column',
      icon: <Columns3 className="w-3.5 h-3.5" />,
      onClick: opts.onAddColumn,
    },
    {
      label: 'Duplicate Table',
      icon: <Copy className="w-3.5 h-3.5" />,
      onClick: opts.onDuplicate,
    },
    {
      label: 'Delete Table',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      onClick: opts.onDelete,
      variant: 'danger',
      separator: true,
    },
  ];
}

export function buildEdgeMenuItems(opts: {
  relationshipId: string;
  currentType: string;
  onChangeType: (type: 'one-to-one' | 'one-to-many' | 'many-to-many') => void;
  onDelete: () => void;
}): ContextMenuItem[] {
  return [
    {
      label: 'Set 1:1 (One to One)',
      icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
      onClick: () => opts.onChangeType('one-to-one'),
    },
    {
      label: 'Set 1:N (One to Many)',
      icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
      onClick: () => opts.onChangeType('one-to-many'),
    },
    {
      label: 'Set N:M (Many to Many)',
      icon: <ArrowLeftRight className="w-3.5 h-3.5" />,
      onClick: () => opts.onChangeType('many-to-many'),
    },
    {
      label: 'Delete Relationship',
      icon: <Trash2 className="w-3.5 h-3.5" />,
      onClick: opts.onDelete,
      variant: 'danger',
      separator: true,
    },
  ];
}

export function buildCanvasMenuItems(opts: {
  onAddTable: () => void;
  onLayoutGrid: () => void;
  onLayoutForce: () => void;
  onLayoutHierarchical: () => void;
}): ContextMenuItem[] {
  return [
    {
      label: 'Add New Table',
      icon: <Plus className="w-3.5 h-3.5" />,
      onClick: opts.onAddTable,
    },
    {
      label: 'Grid Layout',
      icon: <LayoutGrid className="w-3.5 h-3.5" />,
      onClick: opts.onLayoutGrid,
      separator: true,
    },
    {
      label: 'Auto Layout',
      icon: <Network className="w-3.5 h-3.5" />,
      onClick: opts.onLayoutForce,
    },
    {
      label: 'Tree Layout',
      icon: <GitBranch className="w-3.5 h-3.5" />,
      onClick: opts.onLayoutHierarchical,
    },
  ];
}
