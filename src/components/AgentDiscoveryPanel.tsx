import React, { useState, useEffect } from 'react';
import { 
  Bot, Play, Zap, Save, Trash2, Plus, Settings, RefreshCw, 
  Clock, Calendar, Star, GitFork, Eye, AlertCircle, CheckCircle, 
  Loader, Filter, Search, Code, Tag, Database, FileCode, Bookmark
} from 'lucide-react';
import { 
  DiscoveryAgent, 
  AgentResult, 
  getDiscoveryAgents, 
  createDiscoveryAgent, 
  updateDiscoveryAgent, 
  deleteDiscoveryAgent, 
  runDiscoveryAgent,
  getAgentTemplates,
  saveRepoToAgentContext
} from '../utils/agentDiscovery';
import { GitHubRepo } from '../utils/github';
import AgentContextManager from './AgentContextManager';

interface AgentDiscoveryPanelProps {
  onSelectRepo: (repo: GitHubRepo) => void;
}

export default function AgentDiscoveryPanel({ onSelectRepo }: AgentDiscoveryPanelProps) {
  const [agents, setAgents] = useState<DiscoveryAgent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<DiscoveryAgent | null>(null);
  const [selectedResult, setSelectedResult] = useState<AgentResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'idle' | 'running' | 'completed' | 'error'>('all');
  const [activeTab, setActiveTab] = useState<'results' | 'context'>('results');

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = () => {
    const loadedAgents = getDiscoveryAgents();
    setAgents(loadedAgents);
    
    if (loadedAgents.length > 0 && !selectedAgent) {
      setSelectedAgent(loadedAgents[0]);
      if (loadedAgents[0].results.length > 0) {
        setSelectedResult(loadedAgents[0].results[loadedAgents[0].results.length - 1]);
      }
    } else if (selectedAgent) {
      const updatedAgent = loadedAgents.find(a => a.id === selectedAgent.id);
      if (updatedAgent) {
        setSelectedAgent(updatedAgent);
      }
    }
  };

  const handleRunAgent = async (agentId: string) => {
    setIsLoading(true);
    try {
      const result = await runDiscoveryAgent(agentId);
      if (result) {
        setSelectedResult(result);
      }
      loadAgents();
    } catch (error) {
      console.error('Error running agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAgent = (agentId: string) => {
    if (window.confirm('Are you sure you want to delete this agent?')) {
      deleteDiscoveryAgent(agentId);
      
      if (selectedAgent && selectedAgent.id === agentId) {
        setSelectedAgent(null);
        setSelectedResult(null);
      }
      
      loadAgents();
    }
  };

  const handleCreateFromTemplate = (template: any) => {
    const newAgent = createDiscoveryAgent(template);
    setAgents([...agents, newAgent]);
    setSelectedAgent(newAgent);
    setShowTemplateModal(false);
  };

  const handleSelectResult = (result: AgentResult) => {
    setSelectedResult(result);
    setActiveTab('results');
  };

  const handleSaveToContext = async (repo: GitHubRepo) => {
    if (!selectedAgent) return;
    
    try {
      await saveRepoToAgentContext(selectedAgent.id, repo);
      loadAgents();
    } catch (error) {
      console.error('Error saving repo to context:', error);
    }
  };

  const handleAgentUpdate = (updatedAgent: DiscoveryAgent) => {
    updateDiscoveryAgent(updatedAgent.id, updatedAgent);
    loadAgents();
  };

  const filteredAgents = agents.filter(agent => {
    const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                         agent.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || agent.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'idle':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'running':
        return <Loader className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-400" />;
      default:
        return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Discovery Agents
        </h2>
        <div className="flex space-x-2">
          <button 
            className="btn-secondary"
            onClick={() => setShowTemplateModal(true)}
          >
            <Zap className="w-5 h-5" />
            <span>Templates</span>
          </button>
          <button 
            className="btn-primary"
            onClick={() => setShowCreateModal(true)}
          >
            <Plus className="w-5 h-5" />
            <span>New Agent</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
        <div className="glass-card p-4 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Bot className="w-5 h-5 mr-2 text-indigo-400" />
              Agents
            </h3>
            <div className="flex items-center space-x-2">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-xs"
              >
                <option value="all">All Status</option>
                <option value="idle">Idle</option>
                <option value="running">Running</option>
                <option value="completed">Completed</option>
                <option value="error">Error</option>
              </select>
              <button 
                className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors"
                onClick={loadAgents}
              >
                <RefreshCw className="w-4 h-4 text-gray-300" />
              </button>
            </div>
          </div>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search agents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm"
            />
          </div>
          
          <div className="space-y-2 overflow-y-auto flex-grow">
            {filteredAgents.length > 0 ? (
              filteredAgents.map(agent => (
                <div 
                  key={agent.id}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${
                    selectedAgent?.id === agent.id 
                      ? 'bg-indigo-600/20 border border-indigo-500/50' 
                      : 'hover:bg-gray-700/50 border border-gray-700/30'
                  }`}
                  onClick={() => {
                    setSelectedAgent(agent);
                    if (agent.results.length > 0) {
                      setSelectedResult(agent.results[agent.results.length - 1]);
                      setActiveTab('results');
                    } else {
                      setSelectedResult(null);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Bot className="w-5 h-5 text-indigo-400 mr-2" />
                      <span className="font-medium">{agent.name}</span>
                    </div>
                    {getStatusIcon(agent.status)}
                  </div>
                  <p className="text-sm text-gray-400 mt-1 line-clamp-2">{agent.description}</p>
                  <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                    <div className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1" />
                      <span>Last run: {formatDate(agent.lastRun)}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span>{agent.results.length} results</span>
                      <span className="flex items-center">
                        <Bookmark className="w-3.5 h-3.5 mr-1" />
                        <span>{agent.config.contextSettings?.savedRepos.length || 0}</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Bot className="w-12 h-12 text-gray-600 mb-3" />
                <p>No agents found</p>
                <button 
                  className="mt-4 text-indigo-400 hover:text-indigo-300 transition-colors"
                  onClick={() => setShowTemplateModal(true)}
                >
                  Create from template
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="glass-card p-4 rounded-xl overflow-hidden flex flex-col col-span-3">
          {selectedAgent ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold flex items-center">
                    <Bot className="w-5 h-5 mr-2 text-indigo-400" />
                    {selectedAgent.name}
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700/50">
                      {selectedAgent.status}
                    </span>
                  </h3>
                  <p className="text-sm text-gray-400 mt-1">{selectedAgent.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    className="btn-secondary text-sm py-1.5"
                    onClick={() => handleRunAgent(selectedAgent.id)}
                    disabled={isLoading || selectedAgent.status === 'running'}
                  >
                    {isLoading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    <span>Run</span>
                  </button>
                  <button 
                    className="p-1.5 rounded-lg hover:bg-red-600/20 transition-colors"
                    onClick={() => handleDeleteAgent(selectedAgent.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              
              <div className="flex space-x-4 border-b border-gray-700/30 mb-4">
                <button
                  onClick={() => setActiveTab('results')}
                  className={`pb-2 px-4 transition-colors ${
                    activeTab === 'results'
                      ? 'text-purple-400 border-b-2 border-purple-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4" />
                    <span>Results</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('context')}
                  className={`pb-2 px-4 transition-colors ${
                    activeTab === 'context'
                      ? 'text-purple-400 border-b-2 border-purple-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Bookmark className="w-4 h-4" />
                    <span>Context</span>
                  </div>
                </button>
              </div>
              
              {activeTab === 'results' && (
                <div>
                  {selectedAgent.results.length > 0 ? (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium flex items-center">
                          <Calendar className="w-4 h-4 mr-2 text-indigo-400" />
                          Run History
                        </h4>
                        <div className="text-xs text-gray-400">
                          {selectedAgent.results.length} runs total
                        </div>
                      </div>
                      <div className="flex space-x-2 overflow-x-auto pb-2">
                        {selectedAgent.results.map((result, index) => (
                          <button
                            key={result.id}
                            className={`px-3 py-1.5 rounded-md text-sm whitespace-nowrap ${
                              selectedResult?.id === result.id
                                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/50'
                                : 'bg-gray-700/30 text-gray-300 border border-gray-700/50 hover:bg-gray-700/50'
                            }`}
                            onClick={() => handleSelectResult(result)}
                          >
                            Run {index + 1} - {new Date(result.timestamp).toLocaleDateString()}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  
                  {selectedResult ? (
                    <div className="h-[calc(100%-2rem)] overflow-y-auto">
                      <div className="grid grid-cols-3 gap-4 mb-4">
                        <div className="glass-card p-3 rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">Total Repositories</div>
                          <div className="text-xl font-bold text-indigo-400">{selectedResult.metrics.totalFound}</div>
                        </div>
                        <div className="glass-card p-3 rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">New Since Last Run</div>
                          <div className="text-xl font-bold text-green-400">{selectedResult.metrics.newSinceLastRun}</div>
                        </div>
                        <div className="glass-card p-3 rounded-lg">
                          <div className="text-xs text-gray-400 mb-1">Run Date</div>
                          <div className="text-sm font-medium text-gray-300">{new Date(selectedResult.timestamp).toLocaleString()}</div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h5 className="font-medium flex items-center">
                          <Star className="w-4 h-4 mr-2 text-yellow-400" />
                          Discovered Repositories
                        </h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {selectedResult.repos.map((repo) => (
                            <div
                              key={repo.id}
                              className="glass-card p-4 rounded-lg space-y-3 cursor-pointer hover:scale-[1.02] transition-all duration-300 relative group"
                            >
                              <div className="flex items-center space-x-3">
                                <img
                                  src={repo.owner.avatar_url}
                                  alt={`${repo.name} owner avatar`}
                                  className="w-6 h-6 rounded-lg"
                                />
                                <h3 className="font-semibold text-white">{repo.name}</h3>
                              </div>

                              <p className="text-sm text-gray-400 line-clamp-2">{repo.description}</p>

                              <div className="flex items-center space-x-4 text-xs text-gray-400">
                                <span className="flex items-center space-x-1">
                                  <Star className="w-3.5 h-3.5 text-yellow-400" />
                                  <span>{repo.stargazers_count.toLocaleString()}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <GitFork className="w-3.5 h-3.5 text-blue-400" />
                                  <span>{repo.forks_count.toLocaleString()}</span>
                                </span>
                                <span className="flex items-center space-x-1">
                                  <Eye className="w-3.5 h-3.5 text-green-400" />
                                  <span>{repo.watchers_count.toLocaleString()}</span>
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-1">
                                {repo.language && (
                                  <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                                    {repo.language}
                                  </span>
                                )}
                                {repo.topics?.slice(0, 2).map(topic => (
                                  <span key={topic} className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                    {topic}
                                  </span>
                                ))}
                              </div>
                              
                              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <div className="flex space-x-1">
                                  <button 
                                    className="p-1.5 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/40 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSaveToContext(repo);
                                    }}
                                    title="Save to context"
                                  >
                                    <Bookmark className="w-4 h-4 text-indigo-400" />
                                  </button>
                                  <button 
                                    className="p-1.5 rounded-lg bg-purple-600/20 hover:bg-purple-600/40 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onSelectRepo(repo);
                                    }}
                                    title="View details"
                                  >
                                    <Eye className="w-4 h-4 text-purple-400" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                      <Database className="w-12 h-12 text-gray-600 mb-3" />
                      <p>No results yet</p>
                      <button 
                        className="mt-4 btn-primary"
                        onClick={() => handleRunAgent(selectedAgent.id)}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        <span>Run Agent</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
              
              {activeTab === 'context' && (
                <AgentContextManager 
                  agent={selectedAgent}
                  onAgentUpdate={handleAgentUpdate}
                  onAddRepo={onSelectRepo}
                />
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <Bot className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Agent Selected</h3>
              <p className="text-gray-400 text-center mb-6">Select an agent to view details or create a new one</p>
              <button 
                className="btn-primary"
                onClick={() => setShowTemplateModal(true)}
              >
                <Plus className="w-5 h-5" />
                <span>Create Agent</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="glass-card p-6 rounded-xl w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Agent Templates</h3>
              <button 
                className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors"
                onClick={() => setShowTemplateModal(false)}
              >
                <Trash2 className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto">
              {getAgentTemplates().map((template, index) => (
                <div 
                  key={index}
                  className="glass-card p-4 rounded-lg space-y-3 cursor-pointer hover:scale-[1.02] transition-all duration-300"
                  onClick={() => handleCreateFromTemplate(template)}
                >
                  <div className="flex items-center space-x-2">
                    <Bot className="w-5 h-5 text-indigo-400" />
                    <h4 className="font-semibold">{template.name}</h4>
                  </div>
                  <p className="text-sm text-gray-400">{template.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {template.config.searchCriteria.language && (
                      <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                        {template.config.searchCriteria.language}
                      </span>
                    )}
                    {template.config.searchCriteria.minStars && (
                      <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-400">
                        ★ {template.config.searchCriteria.minStars}+
                      </span>
                    )}
                    <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400">
                      {template.config.schedule.frequency}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end mt-6">
              <button 
                className="btn-secondary"
                onClick={() => setShowTemplateModal(false)}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="glass-card p-6 rounded-xl w-full max-w-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Create New Agent</h3>
              <button 
                className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors"
                onClick={() => setShowCreateModal(false)}
              >
                <Trash2 className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            
            <p className="text-gray-400 mb-4">
              This would be a form to create a custom agent. For now, please use the templates.
            </p>
            
            <div className="flex justify-end mt-6">
              <button 
                className="btn-secondary mr-2"
                onClick={() => setShowCreateModal(false)}
              >
                Cancel
              </button>
              <button 
                className="btn-primary"
                onClick={() => {
                  setShowCreateModal(false);
                  setShowTemplateModal(true);
                }}
              >
                <Zap className="w-5 h-5" />
                <span>Use Templates</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}