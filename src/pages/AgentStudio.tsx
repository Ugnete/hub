import React, { useState } from 'react';
import { 
  Bot, MessageSquare, Play, SquarePen, Zap, Save, Trash2, Plus, 
  Settings, Database, Code, BrainCircuit, Download, Upload, RefreshCw, 
  Terminal
} from 'lucide-react';
import SearchBar from '../components/SearchBar';

export default function AgentStudio() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeAgent, setActiveAgent] = useState<string | null>(null);
  const [conversationInput, setConversationInput] = useState('');

  // Mock data
  const agents = [
    {
      id: 'agent1',
      name: 'Code Assistant',
      description: 'Helps with coding tasks and debugging',
      icon: <Code className="w-5 h-5 text-blue-400" />,
      isActive: true
    },
    {
      id: 'agent2',
      name: 'Research Agent',
      description: 'Gathers and summarizes information from various sources',
      icon: <Database className="w-5 h-5 text-green-400" />,
      isActive: true
    },
    {
      id: 'agent3',
      name: 'Creative Writer',
      description: 'Generates creative content and assists with writing',
      icon: <SquarePen className="w-5 h-5 text-purple-400" />,
      isActive: false
    },
    {
      id: 'agent4',
      name: 'System Analyzer',
      description: 'Analyzes system performance and provides recommendations',
      icon: <BrainCircuit className="w-5 h-5 text-yellow-400" />,
      isActive: true
    }
  ];

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

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const activeConversations = activeAgent 
    ? conversations.filter(conv => conv.agentId === activeAgent)
    : conversations;

  const selectedConversation = activeConversations.length > 0 ? activeConversations[0] : null;

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
                    {agent.icon}
                    <span className="font-medium ml-2">{agent.name}</span>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${agent.isActive ? 'bg-green-400' : 'bg-gray-400'}`} />
                </div>
                <p className="text-sm text-gray-400 mt-1">{agent.description}</p>
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

        {/* Conversation Panel */}
        <div className="glass-card p-4 rounded-xl overflow-hidden flex flex-col col-span-3">
          {selectedConversation ? (
            <>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center">
                  <MessageSquare className="w-5 h-5 mr-2 text-indigo-400" />
                  {selectedConversation.title}
                </h2>
                <div className="flex items-center space-x-2">
                  <button className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <Save className="w-4 h-4 text-gray-300" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors">
                    <Download className="w-4 h-4 text-gray-300" />
                  </button>
                  <button className="p-1.5 rounded-lg hover:bg-red-600/20 transition-colors">
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
              
              <div className="overflow-y-auto flex-grow space-y-4 mb-4">
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
                        {message.role === 'user' ? 'You' : agents.find(a => a.id === selectedConversation.agentId)?.name}
                      </span>
                      <span className="text-xs text-gray-500 ml-auto">
                        {new Date(message.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                  </div>
                ))}
              </div>
              
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
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full">
              <Bot className="w-16 h-16 text-gray-600 mb-4" />
              <h3 className="text-xl font-semibold mb-2">No Conversation Selected</h3>
              <p className="text-gray-400 text-center mb-6">Select an agent to start a conversation or create a new one</p>
              <button className="btn-primary">
                <Plus className="w-5 h-5" />
                <span>New Conversation</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 