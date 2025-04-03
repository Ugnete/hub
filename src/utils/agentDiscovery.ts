import { Octokit } from 'octokit';
import { getGitHubToken } from './store';
import { GitHubRepo, getRepoDetails, getRepoContents } from './github';
import { v4 as uuidv4 } from 'uuid';

// Initialize Octokit
let octokit: Octokit;

export const initializeOctokit = () => {
  const token = getGitHubToken();
  octokit = new Octokit({
    auth: token
  });
};

// Initialize on load
initializeOctokit();

// Types for agent-based discovery
export interface DiscoveryAgent {
  id: string;
  name: string;
  description: string;
  status: 'idle' | 'running' | 'completed' | 'error';
  lastRun: string | null;
  config: AgentConfig;
  results: AgentResult[];
}

export interface AgentConfig {
  searchCriteria: SearchCriteria;
  schedule: ScheduleConfig;
  filters: FilterConfig;
  notifications: boolean;
  contextSettings?: AgentContextSettings;
}

export interface AgentContextSettings {
  maxCodeFiles: number;
  includeReadme: boolean;
  includeMainFiles: boolean;
  textOverview: string;
  mainGoal: string;
  autoUpdateContext: boolean;
  savedRepos: SavedRepo[];
}

export interface SavedRepo {
  id: string;
  repo: GitHubRepo;
  addedAt: string;
  notes: string;
  selectedFiles: string[];
  contextImportance: 'high' | 'medium' | 'low';
}

export interface SearchCriteria {
  query: string;
  language?: string;
  topics?: string[];
  minStars?: number;
  maxAge?: number;
  codeSnippets?: string[];
  similarTo?: string; // repo name
  functionality?: string; // natural language description of functionality
}

export interface ScheduleConfig {
  frequency: 'hourly' | 'daily' | 'weekly';
  lastRun: string | null;
  nextRun: string | null;
}

export interface FilterConfig {
  excludeArchived?: boolean;
  excludeForks?: boolean;
  minContributors?: number;
  minCommits?: number;
  hasDocumentation?: boolean;
  hasTests?: boolean;
  activityThreshold?: number; // days since last commit
}

export interface AgentResult {
  id: string;
  timestamp: string;
  repos: GitHubRepo[];
  metrics: {
    totalFound: number;
    newSinceLastRun: number;
    trending: GitHubRepo[];
  };
}

// Mock storage for agents (in a real app, this would be in a database or persistent storage)
let discoveryAgents: DiscoveryAgent[] = [];

// Get all discovery agents
export const getDiscoveryAgents = (): DiscoveryAgent[] => {
  // Try to load from localStorage first
  try {
    const storedAgents = localStorage.getItem('discoveryAgents');
    if (storedAgents) {
      discoveryAgents = JSON.parse(storedAgents);
    }
  } catch (error) {
    console.error('Error loading discovery agents from localStorage:', error);
  }
  return discoveryAgents;
};

// Save agents to localStorage
const saveAgents = () => {
  try {
    localStorage.setItem('discoveryAgents', JSON.stringify(discoveryAgents));
  } catch (error) {
    console.error('Error saving discovery agents to localStorage:', error);
  }
};

// Create a new discovery agent
export const createDiscoveryAgent = (agent: Omit<DiscoveryAgent, 'id' | 'status' | 'lastRun' | 'results'>): DiscoveryAgent => {
  const newAgent: DiscoveryAgent = {
    id: uuidv4(),
    status: 'idle',
    lastRun: null,
    results: [],
    ...agent
  };
  
  // Initialize context settings if not provided
  if (!newAgent.config.contextSettings) {
    newAgent.config.contextSettings = {
      maxCodeFiles: 10,
      includeReadme: true,
      includeMainFiles: true,
      textOverview: '',
      mainGoal: '',
      autoUpdateContext: false,
      savedRepos: []
    };
  }
  
  discoveryAgents.push(newAgent);
  saveAgents();
  return newAgent;
};

// Update an existing discovery agent
export const updateDiscoveryAgent = (id: string, updates: Partial<DiscoveryAgent>): DiscoveryAgent | null => {
  const index = discoveryAgents.findIndex(agent => agent.id === id);
  if (index === -1) return null;
  
  discoveryAgents[index] = { ...discoveryAgents[index], ...updates };
  saveAgents();
  return discoveryAgents[index];
};

// Delete a discovery agent
export const deleteDiscoveryAgent = (id: string): boolean => {
  const initialLength = discoveryAgents.length;
  discoveryAgents = discoveryAgents.filter(agent => agent.id !== id);
  saveAgents();
  return discoveryAgents.length < initialLength;
};

// Run a discovery agent
export const runDiscoveryAgent = async (id: string): Promise<AgentResult | null> => {
  const agent = discoveryAgents.find(a => a.id === id);
  if (!agent) return null;
  
  // Update agent status
  updateDiscoveryAgent(id, { status: 'running' });
  
  try {
    // Execute the search based on agent configuration
    const repos = await executeAgentSearch(agent.config.searchCriteria, agent.config.filters);
    
    // Create result
    const result: AgentResult = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      repos,
      metrics: {
        totalFound: repos.length,
        newSinceLastRun: calculateNewRepos(repos, agent.results),
        trending: extractTrendingRepos(repos)
      }
    };
    
    // Update agent with results
    const updatedResults = [...agent.results, result];
    updateDiscoveryAgent(id, { 
      status: 'completed', 
      lastRun: result.timestamp,
      results: updatedResults
    });
    
    // Update next run time based on schedule
    updateNextRunTime(id, agent.config.schedule);
    
    // Auto-update context if enabled
    if (agent.config.contextSettings?.autoUpdateContext) {
      await updateAgentContext(id, repos);
    }
    
    return result;
  } catch (error) {
    console.error('Error running discovery agent:', error);
    updateDiscoveryAgent(id, { status: 'error' });
    return null;
  }
};

// New function to update agent context with discovered repositories
export const updateAgentContext = async (agentId: string, repos: GitHubRepo[]): Promise<boolean> => {
  const agent = discoveryAgents.find(a => a.id === agentId);
  if (!agent || !agent.config.contextSettings) return false;
  
  try {
    // Sort repos by stars and take top 3
    const topRepos = [...repos].sort((a, b) => b.stargazers_count - a.stargazers_count).slice(0, 3);
    
    // For each top repo, create a saved repo entry
    for (const repo of topRepos) {
      // Skip if already saved
      if (agent.config.contextSettings.savedRepos.some(saved => saved.repo.id === repo.id)) {
        continue;
      }
      
      // Get important files
      let selectedFiles: string[] = [];
      
      if (agent.config.contextSettings.includeReadme) {
        try {
          // Try to find README file
          const contents = await getRepoContents(repo.owner.login, repo.name, '');
          const readmeFile = contents.find((file: any) => 
            file.name.toLowerCase().includes('readme')
          );
          
          if (readmeFile) {
            selectedFiles.push(readmeFile.path);
          }
        } catch (error) {
          console.error(`Error getting README for ${repo.full_name}:`, error);
        }
      }
      
      // Add new saved repo
      const savedRepo: SavedRepo = {
        id: uuidv4(),
        repo,
        addedAt: new Date().toISOString(),
        notes: `Automatically added by agent "${agent.name}"`,
        selectedFiles,
        contextImportance: 'medium'
      };
      
      agent.config.contextSettings.savedRepos.push(savedRepo);
    }
    
    // Update agent
    updateDiscoveryAgent(agentId, {
      config: {
        ...agent.config,
        contextSettings: agent.config.contextSettings
      }
    });
    
    return true;
  } catch (error) {
    console.error('Error updating agent context:', error);
    return false;
  }
};

// New function to save a repository to agent context
export const saveRepoToAgentContext = async (
  agentId: string, 
  repo: GitHubRepo, 
  notes: string = '',
  importance: 'high' | 'medium' | 'low' = 'medium'
): Promise<SavedRepo | null> => {
  const agent = discoveryAgents.find(a => a.id === agentId);
  if (!agent || !agent.config.contextSettings) return null;
  
  try {
    // Check if repo is already saved
    const existingSavedRepo = agent.config.contextSettings.savedRepos.find(
      saved => saved.repo.id === repo.id
    );
    
    if (existingSavedRepo) {
      // Update existing saved repo
      existingSavedRepo.notes = notes || existingSavedRepo.notes;
      existingSavedRepo.contextImportance = importance;
      
      updateDiscoveryAgent(agentId, {
        config: {
          ...agent.config,
          contextSettings: agent.config.contextSettings
        }
      });
      
      return existingSavedRepo;
    }
    
    // Create new saved repo
    const savedRepo: SavedRepo = {
      id: uuidv4(),
      repo,
      addedAt: new Date().toISOString(),
      notes,
      selectedFiles: [],
      contextImportance: importance
    };
    
    // Add to agent context
    agent.config.contextSettings.savedRepos.push(savedRepo);
    
    // Update agent
    updateDiscoveryAgent(agentId, {
      config: {
        ...agent.config,
        contextSettings: agent.config.contextSettings
      }
    });
    
    return savedRepo;
  } catch (error) {
    console.error('Error saving repo to agent context:', error);
    return null;
  }
};

// New function to remove a repository from agent context
export const removeRepoFromAgentContext = (agentId: string, savedRepoId: string): boolean => {
  const agent = discoveryAgents.find(a => a.id === agentId);
  if (!agent || !agent.config.contextSettings) return false;
  
  try {
    // Filter out the repo to remove
    const initialLength = agent.config.contextSettings.savedRepos.length;
    agent.config.contextSettings.savedRepos = agent.config.contextSettings.savedRepos.filter(
      saved => saved.id !== savedRepoId
    );
    
    // Update agent
    updateDiscoveryAgent(agentId, {
      config: {
        ...agent.config,
        contextSettings: agent.config.contextSettings
      }
    });
    
    return agent.config.contextSettings.savedRepos.length < initialLength;
  } catch (error) {
    console.error('Error removing repo from agent context:', error);
    return false;
  }
};

// Execute search based on agent configuration
const executeAgentSearch = async (
  criteria: SearchCriteria,
  filters: FilterConfig
): Promise<GitHubRepo[]> => {
  if (!octokit) return [];
  
  try {
    // Build query string
    let queryParts = [];
    
    if (criteria.query) {
      queryParts.push(criteria.query);
    }
    
    if (criteria.language) {
      queryParts.push(`language:${criteria.language}`);
    }
    
    if (criteria.topics && criteria.topics.length > 0) {
      criteria.topics.forEach(topic => {
        queryParts.push(`topic:${topic}`);
      });
    }
    
    if (criteria.minStars && criteria.minStars > 0) {
      queryParts.push(`stars:>=${criteria.minStars}`);
    }
    
    if (criteria.maxAge && criteria.maxAge > 0) {
      const date = new Date();
      date.setDate(date.getDate() - criteria.maxAge);
      const dateString = date.toISOString().split('T')[0];
      queryParts.push(`pushed:>=${dateString}`);
    }
    
    if (filters.excludeArchived) {
      queryParts.push('archived:false');
    }
    
    if (filters.excludeForks) {
      queryParts.push('fork:false');
    }
    
    // Execute the search
    const query = queryParts.join(' ');
    const response = await octokit.request('GET /search/repositories', {
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: 100,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    let repos = response.data.items;
    
    // Apply post-search filters
    if (filters.minContributors || filters.minCommits || filters.hasDocumentation || 
        filters.hasTests || filters.activityThreshold) {
      repos = await applyPostSearchFilters(repos, filters);
    }
    
    // If functionality description is provided, filter based on semantic similarity
    if (criteria.functionality) {
      repos = await filterByFunctionality(repos, criteria.functionality);
    }
    
    // If code snippets are provided, filter based on code similarity
    if (criteria.codeSnippets && criteria.codeSnippets.length > 0) {
      repos = await filterByCodeSnippets(repos, criteria.codeSnippets);
    }
    
    // If similarTo is provided, find similar repositories
    if (criteria.similarTo) {
      const [owner, repo] = criteria.similarTo.split('/');
      if (owner && repo) {
        const similarRepos = await findSimilarRepositories(owner, repo);
        // Merge and deduplicate
        const allRepoIds = new Set(repos.map(r => r.id));
        similarRepos.forEach(repo => {
          if (!allRepoIds.has(repo.id)) {
            repos.push(repo);
            allRepoIds.add(repo.id);
          }
        });
      }
    }
    
    return repos;
  } catch (error) {
    console.error('Error executing agent search:', error);
    return [];
  }
};

// Apply post-search filters that require additional API calls
const applyPostSearchFilters = async (
  repos: GitHubRepo[],
  filters: FilterConfig
): Promise<GitHubRepo[]> => {
  if (!octokit) return repos;
  
  // For demo purposes, we'll just return the original repos
  // In a real implementation, you would make additional API calls to check:
  // - Number of contributors
  // - Number of commits
  // - Presence of documentation (README, docs folder)
  // - Presence of tests (test folder, test files)
  // - Recent activity
  
  return repos;
};

// Filter repositories based on natural language description of functionality
const filterByFunctionality = async (
  repos: GitHubRepo[],
  functionality: string
): Promise<GitHubRepo[]> => {
  // This would ideally use an embedding model to compare the functionality description
  // with repository descriptions, READMEs, etc.
  // For now, we'll just do a simple text search
  
  const normalizedFunctionality = functionality.toLowerCase();
  return repos.filter(repo => {
    const description = repo.description?.toLowerCase() || '';
    return description.includes(normalizedFunctionality);
  });
};

// Filter repositories based on code snippets
const filterByCodeSnippets = async (
  repos: GitHubRepo[],
  codeSnippets: string[]
): Promise<GitHubRepo[]> => {
  if (!octokit || codeSnippets.length === 0) return repos;
  
  // In a real implementation, this would use the GitHub code search API
  // or a more sophisticated code similarity algorithm
  // For now, we'll just return the original repos
  
  return repos;
};

// Find repositories similar to a given repository
const findSimilarRepositories = async (
  owner: string,
  repo: string
): Promise<GitHubRepo[]> => {
  if (!octokit) return [];
  
  try {
    // Get the repository details to extract topics and language
    const repoResponse = await octokit.request('GET /repos/{owner}/{repo}', {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    const topics = repoResponse.data.topics || [];
    const language = repoResponse.data.language;
    
    // Build a query based on topics and language
    let query = '';
    
    if (topics.length > 0) {
      // Use up to 3 topics to find similar repos
      query += topics.slice(0, 3).map(topic => `topic:${topic}`).join(' ');
    }
    
    if (language) {
      query += ` language:${language}`;
    }
    
    // Exclude the current repository
    query += ` -repo:${owner}/${repo}`;
    
    // Search for similar repositories
    const response = await octokit.request('GET /search/repositories', {
      q: query,
      sort: 'stars',
      order: 'desc',
      per_page: 30,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    return response.data.items;
  } catch (error) {
    console.error('Error finding similar repositories:', error);
    return [];
  }
};

// Calculate new repositories since last run
const calculateNewRepos = (
  currentRepos: GitHubRepo[],
  previousResults: AgentResult[]
): number => {
  if (previousResults.length === 0) return currentRepos.length;
  
  const lastResult = previousResults[previousResults.length - 1];
  const previousRepoIds = new Set(lastResult.repos.map(repo => repo.id));
  
  let newCount = 0;
  currentRepos.forEach(repo => {
    if (!previousRepoIds.has(repo.id)) {
      newCount++;
    }
  });
  
  return newCount;
};

// Extract trending repositories (those with recent activity)
const extractTrendingRepos = (repos: GitHubRepo[]): GitHubRepo[] => {
  // Sort by updated_at and take the top 5
  return [...repos]
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
    .slice(0, 5);
};

// Update the next run time based on schedule
const updateNextRunTime = (agentId: string, schedule: ScheduleConfig): void => {
  const now = new Date();
  let nextRun: Date;
  
  switch (schedule.frequency) {
    case 'hourly':
      nextRun = new Date(now.getTime() + 60 * 60 * 1000);
      break;
    case 'daily':
      nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      break;
    case 'weekly':
      nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  }
  
  updateDiscoveryAgent(agentId, {
    config: {
      ...discoveryAgents.find(a => a.id === agentId)!.config,
      schedule: {
        ...schedule,
        nextRun: nextRun.toISOString()
      }
    }
  });
};

// Check for agents that need to be run
export const checkScheduledAgents = (): string[] => {
  const now = new Date();
  const agentsToRun: string[] = [];
  
  discoveryAgents.forEach(agent => {
    if (agent.status !== 'running' && agent.config.schedule.nextRun) {
      const nextRun = new Date(agent.config.schedule.nextRun);
      if (nextRun <= now) {
        agentsToRun.push(agent.id);
      }
    }
  });
  
  return agentsToRun;
};

// New function to start continuous discovery
export const startContinuousDiscovery = (agentId: string): boolean => {
  const agent = discoveryAgents.find(a => a.id === agentId);
  if (!agent) return false;
  
  // Set up interval to check if agent should run
  const intervalId = setInterval(() => {
    const agent = discoveryAgents.find(a => a.id === agentId);
    if (!agent) {
      clearInterval(intervalId);
      return;
    }
    
    if (agent.status !== 'running' && agent.config.schedule.nextRun) {
      const nextRun = new Date(agent.config.schedule.nextRun);
      const now = new Date();
      
      if (nextRun <= now) {
        runDiscoveryAgent(agentId);
      }
    }
  }, 60000); // Check every minute
  
  // Store interval ID in localStorage
  try {
    const intervals = JSON.parse(localStorage.getItem('continuousDiscoveryIntervals') || '{}');
    intervals[agentId] = true;
    localStorage.setItem('continuousDiscoveryIntervals', JSON.stringify(intervals));
  } catch (error) {
    console.error('Error storing interval ID:', error);
  }
  
  return true;
};

// New function to stop continuous discovery
export const stopContinuousDiscovery = (agentId: string): boolean => {
  try {
    const intervals = JSON.parse(localStorage.getItem('continuousDiscoveryIntervals') || '{}');
    delete intervals[agentId];
    localStorage.setItem('continuousDiscoveryIntervals', JSON.stringify(intervals));
    return true;
  } catch (error) {
    console.error('Error stopping continuous discovery:', error);
    return false;
  }
};

// Initialize continuous discovery for all agents that were running
export const initializeContinuousDiscovery = (): void => {
  try {
    const intervals = JSON.parse(localStorage.getItem('continuousDiscoveryIntervals') || '{}');
    Object.keys(intervals).forEach(agentId => {
      startContinuousDiscovery(agentId);
    });
  } catch (error) {
    console.error('Error initializing continuous discovery:', error);
  }
};

// Sample agent templates
export const getAgentTemplates = (): Omit<DiscoveryAgent, 'id' | 'status' | 'lastRun' | 'results'>[] => {
  return [
    {
      name: 'Trending JavaScript Libraries',
      description: 'Discovers trending JavaScript libraries with over 1000 stars',
      config: {
        searchCriteria: {
          query: 'library framework',
          language: 'JavaScript',
          minStars: 1000,
          maxAge: 90
        },
        schedule: {
          frequency: 'weekly',
          lastRun: null,
          nextRun: null
        },
        filters: {
          excludeArchived: true,
          excludeForks: true,
          activityThreshold: 30
        },
        notifications: true,
        contextSettings: {
          maxCodeFiles: 10,
          includeReadme: true,
          includeMainFiles: true,
          textOverview: 'Collection of trending JavaScript libraries and frameworks',
          mainGoal: 'Discover and analyze modern JavaScript development patterns and tools',
          autoUpdateContext: true,
          savedRepos: []
        }
      }
    },
    {
      name: 'AI/ML Projects',
      description: 'Discovers artificial intelligence and machine learning projects',
      config: {
        searchCriteria: {
          topics: ['artificial-intelligence', 'machine-learning', 'deep-learning'],
          minStars: 500
        },
        schedule: {
          frequency: 'daily',
          lastRun: null,
          nextRun: null
        },
        filters: {
          excludeArchived: true,
          excludeForks: true
        },
        notifications: true,
        contextSettings: {
          maxCodeFiles: 15,
          includeReadme: true,
          includeMainFiles: true,
          textOverview: 'Collection of AI and ML projects and libraries',
          mainGoal: 'Stay updated on latest AI/ML techniques and implementations',
          autoUpdateContext: true,
          savedRepos: []
        }
      }
    },
    {
      name: 'Developer Tools',
      description: 'Discovers developer tools and utilities',
      config: {
        searchCriteria: {
          query: 'developer tool utility',
          minStars: 300
        },
        schedule: {
          frequency: 'weekly',
          lastRun: null,
          nextRun: null
        },
        filters: {
          excludeArchived: true,
          excludeForks: true,
          hasDocumentation: true
        },
        notifications: true,
        contextSettings: {
          maxCodeFiles: 10,
          includeReadme: true,
          includeMainFiles: true,
          textOverview: 'Collection of developer tools and utilities',
          mainGoal: 'Find useful tools to improve development workflow',
          autoUpdateContext: true,
          savedRepos: []
        }
      }
    },
    {
      name: 'Code Generation Tools',
      description: 'Discovers AI code generation and assistance tools',
      config: {
        searchCriteria: {
          topics: ['code-generation', 'ai-assistant', 'copilot', 'code-completion'],
          minStars: 100
        },
        schedule: {
          frequency: 'daily',
          lastRun: null,
          nextRun: null
        },
        filters: {
          excludeArchived: true,
          excludeForks: true
        },
        notifications: true,
        contextSettings: {
          maxCodeFiles: 20,
          includeReadme: true,
          includeMainFiles: true,
          textOverview: 'Collection of AI-powered code generation and assistance tools',
          mainGoal: 'Research and analyze modern approaches to AI code generation',
          autoUpdateContext: true,
          savedRepos: []
        }
      }
    }
  ];
};