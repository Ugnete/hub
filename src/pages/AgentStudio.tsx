import React, { useState, useEffect } from 'react';
import { 
  Bot, MessageSquare, Play, SquarePen, Zap, Save, Trash2, Plus, 
  Settings, Database, Code, BrainCircuit, Download, Upload, RefreshCw, 
  Terminal, Search, BookOpen, Compass, Bookmark, Clock
} from 'lucide-react';
import SearchBar from '../components/SearchBar';
import AgentContextManager from '../components/AgentContextManager';
import { 
  getDiscoveryAgents, 
  updateDiscoveryAgent, 
  runDiscoveryAgent,
  startContinuousDiscovery,
  stopContinuousDiscovery,
  initializeContinuousDiscovery,
  DiscoveryAgent
} from '../utils/agentDiscovery';
import { GitHubRepo } from '../utils/github';

export default function AgentStudio() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [conversationInput, setConversationInput] = useState('');
  const [activeTab, setActiveTab] = useState<'chat' | 'context' | 'settings'>('chat');
  const [agents, setAgents] = useState<DiscoveryAgent[]>([]);
  const [isRunningAgent, setIsRunningAgent] = useState(false);
  const [isContinuousRunning, setIsContinuousRunning] = useState<Record<string, boolean>>({});

  // Mock data for conversations
  const conversations = [
    {
      id: 'conv1',
      agentId: 'agent1',
      title: 'Debugging React Hooks',
      timestamp: '2023-07-15T14:30:00',
      messages: [
        { role: 'user', content: 'I have an issue with useEffect dependency array', timestamp: '2023-07-15T14:30:00' },
        { role: 'agent', content: 'Could you share the code causing problems?', timestamp: '2023-07-15T14:30:30' },
        { role: 'user', content: 'Here\'s my component...', timestamp: '2023-07-15T14:31:00' },
        { role: 'agent', content: 'I see the issue. Your dependency array is missing the "count" variable which is being used in the effect.', timestamp: '2023-07-15T14:32:00' }
      ]
    },
    {
      id: 'conv2',
      agentId: 'agent2',
      title: 'Research on Quantum Computing',
      timestamp: '2023-07-14T10:15:00',
      messages: [
        { role: 'user', content: 'Can you explain quantum computing basics?', timestamp: '2023-07-14T10:15:00' },
        { role: 'agent', content: 'Quantum computing uses quantum bits or qubits...', timestamp: '2023-07-14T10:15:30' }
      ]
    }
  ];

  useEffect(() => {
    // Load discovery agents
    loadAgents();
    
    // Initialize continuous discovery
    initializeContinuousDiscovery();
    
    // Check for continuous running agents every minute
    const intervalId = setInterval(() => {
      const runningAgents = Object.keys(isContinuousRunning).filter(id => isContinuousRunning[id]);
      if (runningAgents.length > 0) {
        loadAgents();
      }
    }, 60000);
    
    return () => clearInterval(intervalId);
  }, []);

  const loadAgents = () => {
    const discoveryAgents = getDiscoveryAgents();
    setAgents(discoveryAgents);
    
    // Update continuous running status
    const runningStatus: Record<string, boolean> = {};
    try {
      const intervals = JSON.parse(localStorage.getItem('continuousDiscoveryIntervals') || '{}');
      Object.keys(intervals).forEach(agentId => {
        runningStatus[agentId] = true;
      });
      setIsContinuousRunning(runningStatus);
    } catch (error) {
      console.error('Error loading continuous discovery status:', error);
    }
  };

  const handleRunAgent = async (agentId: string) => {
    setIsRunningAgent(true);
    try {
      await runDiscoveryAgent(agentId);
      loadAgents();
    } catch (error) {
      console.error('Error running agent:', error);
    } finally {
      setIsRunningAgent(false);
    }
  };

  const handleToggleContinuousDiscovery = async (agentId: string) => {
    if (isContinuousRunning[agentId]) {
      // Stop continuous discovery
      const success = await stopContinuousDiscovery(agentId);
      if (success) {
        setIsContinuousRunning(prev => ({
          ...prev,
          [agentId]: false
        }));
      }
    } else {
      // Start continuous discovery
      const success = await startContinuousDiscovery(agentId);
      if (success) {
        setIsContinuousRunning(prev => ({
          ...prev,
          [agentId]: true
        }));
      }
    }
  };

  const handleAgentUpdate = (updatedAgent: DiscoveryAgent) => {
    updateDiscoveryAgent(updatedAgent.id, updatedAgent);
    loadAgents();
  };

  const handleAddRepoToContext = (repo: GitHubRepo) => {
    if (!activeAgent) return;
    
    const agent = agents.find(a => a.id === activeAgent);
    if (!agent) return;
    
    // Logic to add repo to context would go here
    alert(`Adding ${repo.name} to agent context`);
  };

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedAgent = activeAgent ? agents.find(agent => agent.id === activeAgent) : null;
  const activeConversations = activeAgent 
    ? conversations.filter(conv => conv.agentId === activeAgent)
    : conversations;
  const selectedConversation = activeConversations.length > 0 ? activeConversations[0] : null;

  const getStatusIcon = (agent: DiscoveryAgent) => {
    if (isRunningAgent && agent.id === activeAgent) {
      return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
    }
    
    switch (agent.status) {
      case 'idle':
        return <Clock className="w-4 h-4 text-gray-400" />;
      case 'running':
        return <RefreshCw className="w-4 h-4 text-blue-400 animate-spin" />;
      case 'completed':
        return <Zap className="w-4 h-4 text-green-400" />;
      case 'error':
        return <Trash2 className="w-4 h-4 text-red-400" />;
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
      <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
        Agent Studio
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 h-[calc(100vh-12rem)]">
        {/* Agents Panel */}
        <div className="glass-card p-4 rounded-xl overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center">
              <Bot className="w-5 h-5 mr-2 text-indigo-400" />
              Agents
            </h2>
            <button className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors">
              <Plus className="w-4 h-4 text-gray-300" />
            </button>
          </div>
          
          <SearchBar
            placeholder="Search agents..."
            value={searchQuery}
            onChange={setSearchQuery}
            className="mb-4"
          />
          
          <div className="space-y-2 overflow-y-auto flex-grow">
            {filteredAgents.map(agent => (
              <div 
                key={agent.id}
                className={`p-3 rounded-lg cursor-pointer transition-all ${
                  activeAgent === agent.id 
                    ? 'bg-indigo-600/20 border border-indigo-500/50' 
                    : 'hover:bg-gray-700/50 border border-gray-700/30'
                }`}
                onClick={() => setActiveAgent(activeAgent === agent.id ? null : agent.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <BrainCircuit className="w-5 h-5 text-indigo-400 mr-2" />
                    <span className="font-medium">{agent.name}</span>
                  </div>
                  {getStatusIcon(agent)}
                </div>
                <p className="text-sm text-gray-400 mt-1">{agent.description}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-gray-500">
                  <div className="flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    <span>Last run: {formatDate(agent.lastRun)}</span>
                  </div>
                  <div className="flex items-center">
                    <Bookmark className="w-3.5 h-3.5 mr-1" />
                    <span>{agent.config.contextSettings?.savedRepos.length || 0} repos</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="pt-3 border-t border-gray-700/30 mt-3">
            <button className="w-full py-2 px-3 rounded-lg bg-gray-700/50 hover:bg-gray-700/70 transition-colors text-sm flex items-center justify-center">
              <Settings className="w-4 h-4 mr-2" />
              Configure Agents
            </button>
          </div>
        </div>

        {/* Agent Panel */}
        <div className="glass-card p-4 rounded-xl overflow-hidden flex flex-col col-span-3">
          {selectedAgent ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold flex items-center">
                    <BrainCircuit className="w-5 h-5 mr-2 text-indigo-400" />
                    {selectedAgent.name}
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-700/50">
                      {selectedAgent.status}
                    </span>
                  </h2>
                  <p className="text-sm text-gray-400 mt-1">{selectedAgent.description}</p>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
                      isContinuousRunning[selectedAgent.id] 
                        ? 'bg-green-600/20 text-green-300 border border-green-500/50' 
                        : 'bg-gray-700/30 text-gray-400 border border-gray-700/50'
                    }`}
                    onClick={() => handleToggleContinuousDiscovery(selectedAgent.id)}
                  >
                    <RefreshCw className={`w-4 h-4 ${isContinuousRunning[selectedAgent.id] ? 'animate-spin' : ''}`} />
                    <span>{isContinuousRunning[selectedAgent.id] ? 'Auto Running' : 'Auto Run'}</span>
                  </button>
                  <button 
                    className="btn-secondary"
                    onClick={() => handleRunAgent(selectedAgent.id)}
                    disabled={isRunningAgent}
                  >
                    {isRunningAgent ? (
                      <RefreshCw className="w-5 h-5 animate-spin" />
                    ) : (
                      <Play className="w-5 h-5" />
                    )}
                    <span>Run Now</span>
                  </button>
                </div>
              </div>
              
              {/* Tabs */}
              <div className="flex space-x-4 border-b border-gray-700/30 mb-4">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`pb-2 px-4 transition-colors ${
                    activeTab === 'chat'
                      ? 'text-purple-400 border-b-2 border-purple-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <MessageSquare className="w-4 h-4" />
                    <span>Chat</span>
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
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`pb-2 px-4 transition-colors ${
                    activeTab === 'settings'
                      ? 'text-purple-400 border-b-2 border-purple-400'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Settings className="w-4 h-4" />
                    <span>Settings</span>
                  </div>
                </button>
              </div>
              
              {/* Tab Content */}
              <div className="overflow-y-auto flex-grow">
                {activeTab === 'chat' && (
                  <>
                    {selectedConversation ? (
                      <div className="space-y-4">
                        {selectedConversation.messages.map((message, index) => (
                          <div 
                            key={index}
                            className={`p-3 rounded-lg ${
                              message.role === 'user' 
                                ? 'bg-indigo-600/10 ml-12 border border-indigo-500/30' 
                                : 'bg-gray-700/30 mr-12 border border-gray-600/30'
                            }`}
                          >
                            <div className="flex items-center mb-1">
                              <span className="text-xs font-medium text-gray-400">
                                {message.role === 'user' ? 'You' : selectedAgent.name}
                              </span>
                              <span className="text-xs text-gray-500 ml-auto">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm">{message.content}</p>
                          </div>
                        ))}
                        
                        <div className="border-t border-gray-700/30 pt-4">
                          <div className="relative">
                            <textarea
                              value={conversationInput}
                              onChange={(e) => setConversationInput(e.target.value)}
                              placeholder="Type your message..."
                              className="w-full p-3 pr-12 glass-card rounded-lg bg-gray-800/20 resize-none h-20"
                            />
                            <button 
                              className="absolute right-3 bottom-3 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors text-white"
                            >
                              <Play className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="flex justify-between mt-2 text-xs text-gray-400">
                            <div className="flex items-center">
                              <Terminal className="w-3.5 h-3.5 mr-1" />
                              <span>Markdown supported</span>
                            </div>
                            <div className="flex items-center">
                              <Upload className="w-3.5 h-3.5 mr-1" />
                              <span>Drag files to upload or</span>
                              <button className="text-indigo-400 hover:text-indigo-300 ml-1">browse</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-64 text-gray-400">
                        <MessageSquare className="w-12 h-12 text-gray-600 mb-3" />
                        <p>No conversations yet</p>
                        <button className="mt-4 btn-primary">
                          <Plus className="w-5 h-5" />
                          <span>New Conversation</span>
                        </button>
                      </div>
                    )}
                  </>
                )}
                
                {activeTab === 'context' && (
                  <AgentContextManager 
                    agent={selectedAgent}
                    onAgentUpdate={handleAgentUpdate}
                    onAddRepo={handleAddRepoToContext}
                  />
                )}
                
                {activeTab === 'settings' && (
                  <div className="space-y-6">
                    <div className="glass-card p-4 rounded-xl">
                      <h3 className="text-lg font-semibold mb-3 flex items-center">
                        <Settings className="w-5 h-5 mr-2 text-indigo-400" />
                        Agent Settings
                      </h3>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm text-gray-400 block mb-1">Search Criteria</label>
                          <div className="glass-card p-3 rounded-lg">
                            <div className="grid grid-cols-2 gap-3">
                              {selectedAgent.config.searchCriteria.query && (
                                <div className="flex items-center space-x-2">
                                  <Search className="w-4 h-4 text-indigo-400" />
                                  <span className="text-sm">{selectedAgent.config.searchCriteria.query}</span>
                                </div>
                              )}
                              {selectedAgent.config.searchCriteria.language && (
                                <div className="flex items-center space-x-2">
                                  <Code className="w-4 h-4 text-indigo-400" />
                                  <span className="text-sm">{selectedAgent.config.searchCriteria.language}</span>
                                </div>
                              )}
                              {selectedAgent.config.searchCriteria.minStars && (
                                <div className="flex items-center space-x-2">
                                  <Star className="w-4 h-4 text-yellow-400" />
                                  <span className="text-sm">Min Stars: {selectedAgent.config.searchCriteria.minStars}</span>
                                </div>
                              )}
                              {selectedAgent.config.searchCriteria.topics && selectedAgent.config.searchCriteria.topics.length > 0 && (
                                <div className="flex items-center space-x-2">
                                  <Tag className="w-4 h-4 text-indigo-400" />
                                  <span className="text-sm">{selectedAgent.config.searchCriteria.topics.join(', ')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm text-gray-400 block mb-1">Schedule</label>
                          <div className="glass-card p-3 rounded-lg">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-indigo-400" />
                                <span className="text-sm">Frequency: {selectedAgent.config.schedule.frequency}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RefreshCw className="w-4 h-4 text-indigo-400" />
                                <span className="text-sm">
                                  Next run: {formatDate(selectedAgent.config.schedule.nextRun)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <label className="text-sm text-gray-400 block mb-1">Filters</label>
                          <div className="glass-card p-3 rounded-lg">
                            <div className="grid grid-cols-2 gap-3">
                              {selectedAgent.config.filters.excludeArchived && (
                                <div className="flex items-center space-x-2">
                                  <Trash2 className="w-4 h-4 text-indigo-400" />
                                  <span className="text-sm">Exclude Archived</span>
                                </div>
                              )}
                              {selectedAgent.config.filters.excludeForks && (
                                <div className="flex items-center space-x-2">
                                  <GitFork className="w-4 h-4 text-indigo-400" />
                                  <span className="text-sm">Exclude Forks</span>
                                </div>
                              )}
                              {selectedAgent.config.filters.hasDocumentation && (
                                <div className="flex items-center space-x-2">
                                  <BookOpen className="w-4 h-4 text-indigo-400" />
                                  <span className="text-sm">Has Documentation</span>
                                </div>
                              )}
                              {selectedAgent.config.filters.activityThreshold && (
                                <div className="flex items-center space-x-2">
                                  <Activity className="w-4 h-4 text-indigo-400" />
                                  <span className="text-sm">Activity: {selectedAgent.config.filters.activityThreshold} days</span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <Bot className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Agent Selected</h3>
              <p className="text-gray-400 text-center mb-6">Select an agent to start a conversation or create a new one</p>
              <button className="btn-primary">
                <Plus className="w-5 h-5" />
                <span>New Agent</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}