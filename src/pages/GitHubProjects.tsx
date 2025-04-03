import React, { useState } from 'react';
import GitHubDiscovery from '../components/GitHubDiscovery';
import UnifiedProjectView from '../components/UnifiedProjectView';
import { GitHubRepo } from '../utils/github';
import AgentDiscoveryPanel from '../components/AgentDiscoveryPanel';
import SemanticCodeSearch from '../components/SemanticCodeSearch';

export default function GitHubProjects() {
  const [selectedRepo, setSelectedRepo] = useState<GitHubRepo | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'agent' | 'semantic'>('discover');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
        GitHub Projects
      </h1>

      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-700/30">
        <button
          onClick={() => setActiveTab('discover')}
          className={`pb-2 px-4 transition-colors ${
            activeTab === 'discover'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Discover
        </button>
        <button
          onClick={() => setActiveTab('agent')}
          className={`pb-2 px-4 transition-colors ${
            activeTab === 'agent'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Agent Discovery
        </button>
        <button
          onClick={() => setActiveTab('semantic')}
          className={`pb-2 px-4 transition-colors ${
            activeTab === 'semantic'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          Semantic Code Search
        </button>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 gap-6">
        {selectedRepo ? (
          <UnifiedProjectView 
            repo={selectedRepo} 
            onBack={() => setSelectedRepo(null)} 
          />
        ) : (
          <>
            {activeTab === 'discover' && (
              <GitHubDiscovery onSelectRepo={setSelectedRepo} />
            )}
            {activeTab === 'agent' && (
              <AgentDiscoveryPanel onSelectRepo={setSelectedRepo} />
            )}
            {activeTab === 'semantic' && (
              <SemanticCodeSearch />
            )}
          </>
        )}
      </div>
    </div>
  );
}