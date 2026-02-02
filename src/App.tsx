import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
import Sidebar from './components/Sidebar/Sidebar';
import ERDCanvas from './components/ERD/ERDCanvas';
import ChatPanel from './components/Chat/ChatPanel';

const App: React.FC = () => {
  return (
    <ReactFlowProvider>
      <div className="w-full h-screen flex bg-slate-900">
        {/* Left Sidebar - SQL Input, Tables, etc. */}
        <Sidebar />

        {/* Main Canvas - ERD Diagram */}
        <div className="flex-1 relative">
          <ERDCanvas />
        </div>

        {/* Right Panel - Chat/Q&A */}
        <ChatPanel />
      </div>
    </ReactFlowProvider>
  );
};

export default App;
