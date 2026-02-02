import React, { useState } from 'react';
import {
  Database,
  Code,
  Table2,
  Sparkles,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import SQLInput from './SQLInput';
import SchemaHelper from './SchemaHelper';
import TableList from './TableList';
import InferencePanel from './InferencePanel';

type TabType = 'sql' | 'schema' | 'tables' | 'infer';

const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('sql');
  const { tables, pendingInferences } = useStore();

  const tabs = [
    { id: 'sql' as TabType, label: 'SQL Input', icon: Code },
    { id: 'schema' as TabType, label: 'Schema Helper', icon: Database },
    { id: 'tables' as TabType, label: 'Tables', icon: Table2, count: tables.length },
    { id: 'infer' as TabType, label: 'Inferences', icon: Sparkles, count: pendingInferences.length },
  ];

  return (
    <div className="w-96 h-full bg-slate-800 border-r border-slate-700 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
            <Database className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-white">Schema Designer</h1>
            <p className="text-xs text-slate-400">ERD Visualization Tool</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex-1 py-3 px-2 text-xs font-medium transition-colors relative
              flex items-center justify-center gap-1.5
              ${activeTab === tab.id
                ? 'text-blue-400 bg-slate-700/50'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
              }
            `}
          >
            <tab.icon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={`
                ml-1 px-1.5 py-0.5 text-xs rounded-full
                ${activeTab === tab.id ? 'bg-blue-500/30 text-blue-300' : 'bg-slate-600 text-slate-300'}
              `}>
                {tab.count}
              </span>
            )}
            {activeTab === tab.id && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500" />
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
