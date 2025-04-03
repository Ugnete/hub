import React, { useState, useEffect } from 'react';
import { 
  Bot, Trash2, Plus, Settings, Code, Tag, Database, FileCode, 
  BookOpen, Bookmark, Star, GitFork, Eye, Calendar, ArrowRight, 
  Check, X, Edit, Save, Zap, RefreshCw, Clock
} from 'lucide-react';
import { 
  DiscoveryAgent, 
  SavedRepo,
  saveRepoToAgentContext,
  removeRepoFromAgentContext,
  updateDiscoveryAgent
} from '../utils/agentDiscovery';
import { GitHubRepo } from '../utils/github';

interface AgentContextManagerProps {
  agent: DiscoveryAgent;
  onAgentUpdate: (updatedAgent: DiscoveryAgent) => void;
  onAddRepo?: (repo: GitHubRepo) => void;
}

export default function AgentContextManager({ 
  agent, 
  onAgentUpdate,
  onAddRepo
}: AgentContextManagerProps) {
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [isEditingOverview, setIsEditingOverview] = useState(false);
  const [editedGoal, setEditedGoal] = useState(agent.config.contextSettings?.mainGoal || '');
  const [editedOverview, setEditedOverview] = useState(agent.config.contextSettings?.textOverview || '');
  const [selectedRepo, setSelectedRepo] = useState<SavedRepo | null>(null);
  const [isEditingRepo, setIsEditingRepo] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [editedImportance, setEditedImportance] = useState<'high' | 'medium' | 'low'>('medium');

  useEffect(() => {
    setEditedGoal(agent.config.contextSettings?.mainGoal || '');
    setEditedOverview(agent.config.contextSettings?.textOverview || '');
  }, [agent]);

  const handleSaveGoal = () => {
    if (!agent.config.contextSettings) return;
    
    const updatedAgent = {
      ...agent,
      config: {
        ...agent.config,
        contextSettings: {
          ...agent.config.contextSettings,
          mainGoal: editedGoal
        }
      }
    };
    
    onAgentUpdate(updatedAgent);
    setIsEditingGoal(false);
  };

  const handleSaveOverview = () => {
    if (!agent.config.contextSettings) return;
    
    const updatedAgent = {
      ...agent,
      config: {
        ...agent.config,
        contextSettings: {
          ...agent.config.contextSettings,
          textOverview: editedOverview
        }
      }
    };
    
    onAgentUpdate(updatedAgent);
    setIsEditingOverview(false);
  };

  const handleToggleAutoUpdate = () => {
    if (!agent.config.contextSettings) return;
    
    const updatedAgent = {
      ...agent,
      config: {
        ...agent.config,
        contextSettings: {
          ...agent.config.contextSettings,
          autoUpdateContext: !agent.config.contextSettings.autoUpdateContext
        }
      }
    };
    
    onAgentUpdate(updatedAgent);
  };

  const handleRemoveRepo = async (repoId: string) => {
    if (!agent.config.contextSettings) return;
    
    const success = await removeRepoFromAgentContext(agent.id, repoId);
    if (success) {
      // Refresh agent data
      const updatedAgent = {
        ...agent,
        config: {
          ...agent.config,
          contextSettings: {
            ...agent.config.contextSettings,
            savedRepos: agent.config.contextSettings.savedRepos.filter(repo => repo.id !== repoId)
          }
        }
      };
      
      onAgentUpdate(updatedAgent);
      if (selectedRepo?.id === repoId) {
        setSelectedRepo(null);
      }
    }
  };

  const handleSaveRepoChanges = async () => {
    if (!selectedRepo || !agent.config.contextSettings) return;
    
    // Find the repo in the agent's saved repos
    const repoIndex = agent.config.contextSettings.savedRepos.findIndex(
      repo => repo.id === selectedRepo.id
    );
    
    if (repoIndex === -1) return;
    
    // Update the repo
    const updatedRepos = [...agent.config.contextSettings.savedRepos];
    updatedRepos[repoIndex] = {
      ...updatedRepos[repoIndex],
      notes: editedNotes,
      contextImportance: editedImportance
    };
    
    // Update the agent
    const updatedAgent = {
      ...agent,
      config: {
        ...agent.config,
        contextSettings: {
          ...agent.config.contextSettings,
          savedRepos: updatedRepos
        }
      }
    };
    
    onAgentUpdate(updatedAgent);
    setSelectedRepo(updatedRepos[repoIndex]);
    setIsEditingRepo(false);
  };

  const handleEditRepo = (repo: SavedRepo) => {
    setSelectedRepo(repo);
    setEditedNotes(repo.notes);
    setEditedImportance(repo.contextImportance);
    setIsEditingRepo(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  const getImportanceColor = (importance: 'high' | 'medium' | 'low') => {
    switch (importance) {
      case 'high':
        return 'text-red-400 border-red-500/30 bg-red-500/10';
      case 'medium':
        return 'text-yellow-400 border-yellow-500/30 bg-yellow-500/10';
      case 'low':
        return 'text-green-400 border-green-500/30 bg-green-500/10';
      default:
        return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
    }
  };

  if (!agent.config.contextSettings) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
        <Database className="w-12 h-12 text-gray-600 mb-3" />
        <p>Context settings not available for this agent</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold flex items-center">
          <Bot className="w-5 h-5 mr-2 text-indigo-400" />
          Agent Context
        </h2>
        <div className="flex items-center space-x-2">
          <button 
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
              agent.config.contextSettings.autoUpdateContext 
                ? 'bg-green-600/20 text-green-300 border border-green-500/50' 
                : 'bg-gray-700/30 text-gray-400 border border-gray-700/50'
            }`}
            onClick={handleToggleAutoUpdate}
          >
            <RefreshCw className="w-4 h-4" />
            <span>Auto-Update {agent.config.contextSettings.autoUpdateContext ? 'On' : 'Off'}</span>
          </button>
          {onAddRepo && (
            <button 
              className="btn-secondary text-sm py-1.5"
              onClick={() => onAddRepo(selectedRepo?.repo || agent.results[0]?.repos[0])}
            >
              <Plus className="w-4 h-4" />
              <span>Add Repository</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Context Settings */}
        <div className="glass-card p-4 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium flex items-center">
              <Settings className="w-4 h-4 mr-2 text-indigo-400" />
              Context Settings
            </h3>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-400">Main Goal</label>
                <button 
                  className="p-1 rounded-md hover:bg-gray-700/50 transition-colors"
                  onClick={() => setIsEditingGoal(true)}
                >
                  <Edit className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
              {isEditingGoal ? (
                <div className="space-y-2">
                  <textarea
                    value={editedGoal}
                    onChange={(e) => setEditedGoal(e.target.value)}
                    className="w-full p-2 glass-card rounded-lg bg-gray-800/20 resize-none h-20 text-sm"
                    placeholder="Define the main goal for this agent..."
                  />
                  <div className="flex justify-end space-x-2">
                    <button 
                      className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors"
                      onClick={() => setIsEditingGoal(false)}
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                    <button 
                      className="p-1.5 rounded-lg hover:bg-indigo-700/50 transition-colors text-indigo-400"
                      onClick={handleSaveGoal}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm border border-gray-700/30 rounded-lg p-2 bg-gray-800/20">
                  {agent.config.contextSettings.mainGoal || 'No main goal defined'}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-400">Text Overview</label>
                <button 
                  className="p-1 rounded-md hover:bg-gray-700/50 transition-colors"
                  onClick={() => setIsEditingOverview(true)}
                >
                  <Edit className="w-3.5 h-3.5 text-gray-400" />
                </button>
              </div>
              {isEditingOverview ? (
                <div className="space-y-2">
                  <textarea
                    value={editedOverview}
                    onChange={(e) => setEditedOverview(e.target.value)}
                    className="w-full p-2 glass-card rounded-lg bg-gray-800/20 resize-none h-20 text-sm"
                    placeholder="Provide an overview of the context..."
                  />
                  <div className="flex justify-end space-x-2">
                    <button 
                      className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors"
                      onClick={() => setIsEditingOverview(false)}
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                    <button 
                      className="p-1.5 rounded-lg hover:bg-indigo-700/50 transition-colors text-indigo-400"
                      onClick={handleSaveOverview}
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm border border-gray-700/30 rounded-lg p-2 bg-gray-800/20">
                  {agent.config.contextSettings.textOverview || 'No overview defined'}
                </p>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-sm text-gray-400">Configuration</label>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm border border-gray-700/30 rounded-lg p-2 bg-gray-800/20">
                  <span>Max Code Files</span>
                  <span className="font-medium">{agent.config.contextSettings.maxCodeFiles}</span>
                </div>
                <div className="flex items-center justify-between text-sm border border-gray-700/30 rounded-lg p-2 bg-gray-800/20">
                  <span>Include README</span>
                  <span className={agent.config.contextSettings.includeReadme ? 'text-green-400' : 'text-red-400'}>
                    {agent.config.contextSettings.includeReadme ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-sm border border-gray-700/30 rounded-lg p-2 bg-gray-800/20">
                  <span>Include Main Files</span>
                  <span className={agent.config.contextSettings.includeMainFiles ? 'text-green-400' : 'text-red-400'}>
                    {agent.config.contextSettings.includeMainFiles ? 'Yes' : 'No'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Saved Repositories */}
        <div className="glass-card p-4 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium flex items-center">
              <Bookmark className="w-4 h-4 mr-2 text-indigo-400" />
              Saved Repositories
              <span className="ml-2 text-xs text-gray-400">
                ({agent.config.contextSettings.savedRepos.length})
              </span>
            </h3>
          </div>

          <div className="overflow-y-auto flex-grow">
            {agent.config.contextSettings.savedRepos.length > 0 ? (
              <div className="space-y-2">
                {agent.config.contextSettings.savedRepos.map(repo => (
                  <div 
                    key={repo.id}
                    className={`p-3 rounded-lg cursor-pointer transition-all border ${
                      selectedRepo?.id === repo.id 
                        ? 'bg-indigo-600/20 border-indigo-500/50' 
                        : 'hover:bg-gray-700/50 border-gray-700/30'
                    }`}
                    onClick={() => setSelectedRepo(repo)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <img
                          src={repo.repo.owner.avatar_url}
                          alt={`${repo.repo.name} owner avatar`}
                          className="w-5 h-5 rounded-md mr-2"
                        />
                        <span className="font-medium text-sm">{repo.repo.name}</span>
                      </div>
                      <div className={`px-1.5 py-0.5 rounded-full text-xs font-medium border ${
                        getImportanceColor(repo.contextImportance)
                      }`}>
                        {repo.contextImportance}
                      </div>
                    </div>
                    <div className="flex items-center text-xs text-gray-400 mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>Added: {new Date(repo.addedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                <Bookmark className="w-8 h-8 text-gray-600 mb-2" />
                <p className="text-sm">No saved repositories</p>
                <p className="text-xs mt-1">Run the agent to discover repositories</p>
              </div>
            )}
          </div>
        </div>

        {/* Repository Details */}
        <div className="glass-card p-4 rounded-xl overflow-hidden flex flex-col">
          {selectedRepo ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium flex items-center">
                  <Code className="w-4 h-4 mr-2 text-indigo-400" />
                  Repository Details
                </h3>
                <div className="flex items-center space-x-2">
                  <button 
                    className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors"
                    onClick={() => handleEditRepo(selectedRepo)}
                  >
                    <Edit className="w-4 h-4 text-gray-400" />
                  </button>
                  <button 
                    className="p-1.5 rounded-lg hover:bg-red-600/20 transition-colors"
                    onClick={() => handleRemoveRepo(selectedRepo.id)}
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-grow">
                {isEditingRepo ? (
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Notes</label>
                      <textarea
                        value={editedNotes}
                        onChange={(e) => setEditedNotes(e.target.value)}
                        className="w-full p-2 glass-card rounded-lg bg-gray-800/20 resize-none h-20 text-sm"
                        placeholder="Add notes about this repository..."
                      />
                    </div>
                    <div>
                      <label className="text-sm text-gray-400 block mb-1">Importance</label>
                      <select
                        value={editedImportance}
                        onChange={(e) => setEditedImportance(e.target.value as 'high' | 'medium' | 'low')}
                        className="w-full p-2 glass-card rounded-lg bg-gray-800/20 text-sm"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div className="flex justify-end space-x-2">
                      <button 
                        className="btn-secondary text-sm py-1"
                        onClick={() => setIsEditingRepo(false)}
                      >
                        Cancel
                      </button>
                      <button 
                        className="btn-primary text-sm py-1"
                        onClick={handleSaveRepoChanges}
                      >
                        <Save className="w-4 h-4" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3">
                      <img
                        src={selectedRepo.repo.owner.avatar_url}
                        alt={`${selectedRepo.repo.name} owner avatar`}
                        className="w-8 h-8 rounded-lg"
                      />
                      <div>
                        <h4 className="font-semibold">{selectedRepo.repo.name}</h4>
                        <div className="text-xs text-gray-400">by {selectedRepo.repo.owner.login}</div>
                      </div>
                    </div>

                    <p className="text-sm text-gray-300">{selectedRepo.repo.description}</p>

                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span className="flex items-center space-x-1">
                        <Star className="w-4 h-4 text-yellow-400" />
                        <span>{selectedRepo.repo.stargazers_count.toLocaleString()}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <GitFork className="w-4 h-4 text-blue-400" />
                        <span>{selectedRepo.repo.forks_count.toLocaleString()}</span>
                      </span>
                      <span className="flex items-center space-x-1">
                        <Eye className="w-4 h-4 text-green-400" />
                        <span>{selectedRepo.repo.watchers_count.toLocaleString()}</span>
                      </span>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-400 mb-1">Notes</h5>
                      <p className="text-sm border border-gray-700/30 rounded-lg p-2 bg-gray-800/20">
                        {selectedRepo.notes || 'No notes added'}
                      </p>
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-400 mb-1">Selected Files</h5>
                      {selectedRepo.selectedFiles.length > 0 ? (
                        <div className="space-y-1">
                          {selectedRepo.selectedFiles.map((file, index) => (
                            <div 
                              key={index}
                              className="text-sm flex items-center space-x-2 border border-gray-700/30 rounded-lg p-2 bg-gray-800/20"
                            >
                              <FileCode className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="truncate">{file}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm border border-gray-700/30 rounded-lg p-2 bg-gray-800/20">
                          No files selected
                        </p>
                      )}
                    </div>

                    <div>
                      <h5 className="text-sm font-medium text-gray-400 mb-1">Added At</h5>
                      <p className="text-sm border border-gray-700/30 rounded-lg p-2 bg-gray-800/20 flex items-center">
                        <Calendar className="w-3.5 h-3.5 text-indigo-400 mr-2" />
                        {formatDate(selectedRepo.addedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <Code className="w-12 h-12 text-gray-600 mb-3" />
              <p>Select a repository to view details</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}