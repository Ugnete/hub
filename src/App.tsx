import React, { useState } from 'react';
import {
  Github,
  Settings,
  Laptop,
  BookOpen,
  BrainCircuit
} from 'lucide-react';

// Import pages
import GitHubProjects from './pages/GitHubProjects';
import Knowledgebase from './pages/Knowledgebase';
import AgentStudio from './pages/AgentStudio';
import SettingsPage from './pages/Settings';

function App() {
  const [activeTab, setActiveTab] = useState<'github-projects' | 'knowledgebase' | 'agent-studio' | 'settings'>('github-projects');

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <div className="fixed h-full w-16 glass-card border-r border-gray-700/30 flex flex-col items-center py-4 space-y-4">
        <div className="group relative">
          <button
            onClick={() => setActiveTab('github-projects')}
            className={`nav-button ${activeTab === 'github-projects' ? 'active' : ''}`}
            title="GitHub Projects"
          >
            <Github className="w-6 h-6" />
          </button>
          <div className="absolute left-16 transform -translate-y-1/2 top-1/2 bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
            GitHub Projects
          </div>
        </div>


        <div className="group relative">
          <button
            onClick={() => setActiveTab('knowledgebase')}
            className={`nav-button ${activeTab === 'knowledgebase' ? 'active' : ''}`}
            title="Knowledgebase"
          >
            <BookOpen className="w-6 h-6" />
          </button>
          <div className="absolute left-16 transform -translate-y-1/2 top-1/2 bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
            Knowledgebase
          </div>
        </div>

        <div className="group relative">
          <button
            onClick={() => setActiveTab('agent-studio')}
            className={`nav-button ${activeTab === 'agent-studio' ? 'active' : ''}`}
            title="Agent Studio"
          >
            <BrainCircuit className="w-6 h-6" />
          </button>
          <div className="absolute left-16 transform -translate-y-1/2 top-1/2 bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
            Agent Studio
          </div>
        </div>

        <div className="group relative">
          <button
            onClick={() => setActiveTab('settings')}
            className={`nav-button ${activeTab === 'settings' ? 'active' : ''}`}
            title="Settings"
          >
            <Settings className="w-6 h-6" />
          </button>
          <div className="absolute left-16 transform -translate-y-1/2 top-1/2 bg-gray-800 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none z-10">
            Settings
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-16 p-8">
        {activeTab === 'github-projects' && <GitHubProjects />}
        {activeTab === 'knowledgebase' && <Knowledgebase />}
        {activeTab === 'agent-studio' && <AgentStudio />}
        {activeTab === 'settings' && <SettingsPage />}
      </div>
    </div>
  );
}

export default App;

