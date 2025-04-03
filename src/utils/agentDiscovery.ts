import { Octokit } from 'octokit';
import { getGitHubToken } from './store';
import { GitHubRepo } from './github';

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
  return discoveryAgents;
};

// Create a new discovery agent
export const createDiscoveryAgent = (agent: Omit<DiscoveryAgent, 'id' | 'status' | 'lastRun' | 'results'>): DiscoveryAgent => {
  const newAgent: DiscoveryAgent = {
    id: Date.now().toString(),
    status: 'idle',
    lastRun: null,
    results: [],
    ...agent
  };
  
  discoveryAgents.push(newAgent);
  return newAgent;
};

// Update an existing discovery agent
export const updateDiscoveryAgent = (id: string, updates: Partial<DiscoveryAgent>): DiscoveryAgent | null => {
  const index = discoveryAgents.findIndex(agent => agent.id === id);
  if (index === -1) return null;
  
  discoveryAgents[index] = { ...discoveryAgents[index], ...updates };
  return discoveryAgents[index];
};

// Delete a discovery agent
export const deleteDiscoveryAgent = (id: string): boolean => {
  const initialLength = discoveryAgents.length;
  discoveryAgents = discoveryAgents.filter(agent => agent.id !== id);
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
      id: Date.now().toString(),
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
    
    return result;
  } catch (error) {
    console.error('Error running discovery agent:', error);
    updateDiscoveryAgent(id, { status: 'error' });
    return null;
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
        notifications: true
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
        notifications: true
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
        notifications: true
      }
    }
  ];
};