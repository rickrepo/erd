import { useState } from 'react';
import {
  Code,
  Database,
  Table2,
  Sparkles,
  ChevronDown,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { SQLDialect } from '../../store/useStore';
import SQLInput from './SQLInput';
import SchemaHelper from './SchemaHelper';
import TableList from './TableList';
import InferencePanel from './InferencePanel';
import { Branding } from '../common/Branding';

type TabType = 'sql' | 'schema' | 'tables' | 'infer';

const DIALECT_OPTIONS: { id: SQLDialect; label: string }[] = [
  { id: 'sql', label: 'SQL (Standard)' },
  { id: 'mysql', label: 'MySQL' },
  { id: 'postgres', label: 'PostgreSQL' },
  { id: 'sqlite', label: 'SQLite' },
  { id: 'sqlserver', label: 'SQL Server' },
];

const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('sql');
  const [showDialectDropdown, setShowDialectDropdown] = useState(false);
  const { tables, pendingInferences, sqlDialect, setSqlDialect } = useStore();

  const tabs = [
    { id: 'sql' as TabType, label: 'SQL', icon: Code },
    { id: 'schema' as TabType, label: 'Schema', icon: Database },
    { id: 'tables' as TabType, label: 'Tables', icon: Table2, count: tables.length },
    { id: 'infer' as TabType, label: 'AI', icon: Sparkles, count: pendingInferences.length },
  ];

  const currentDialect = DIALECT_OPTIONS.find(d => d.id === sqlDialect) || DIALECT_OPTIONS[0];

  return (
    <div className="w-96 h-full bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Header with Branding */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          <Branding size="md" showTagline />
        </div>

        {/* SQL Dialect Selector */}
        <div className="mt-4 relative">
          <button
            onClick={() => setShowDialectDropdown(!showDialectDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 bg-slate-700/50 rounded-lg text-sm text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <span className="flex items-center gap-2">
              <Code className="w-4 h-4 text-blue-400" />
              {currentDialect.label}
            </span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showDialectDropdown ? 'rotate-180' : ''}`} />
          </button>

          {showDialectDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-slate-700 rounded-lg shadow-xl border border-slate-600 z-50 overflow-hidden animate-slideIn">
              {DIALECT_OPTIONS.map((dialect) => (
                <button
                  key={dialect.id}
                  onClick={() => {
                    setSqlDialect(dialect.id);
                    setShowDialectDropdown(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-left transition-colors flex items-center gap-2 ${
                    sqlDialect === dialect.id
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-300 hover:bg-slate-600'
                  }`}
                >
                  {dialect.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 py-3 px-2 text-xs font-medium transition-all relative
              flex items-center justify-center gap-1.5
              ${activeTab === tab.id
                ? 'text-blue-400 bg-slate-700/50'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
              }
            `}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`
                px-1.5 py-0.5 text-[10px] rounded-full font-semibold
                ${activeTab === tab.id ? 'bg-blue-500 text-white' : 'bg-slate-600 text-slate-300'}
              `}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-blue-500 rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'sql' && <SQLInput />}
        {activeTab === 'schema' && <SchemaHelper />}
        {activeTab === 'tables' && <TableList />}
        {activeTab === 'infer' && <InferencePanel />}
      </div>
    </div>
  );
};

export default Sidebar;
