import { Octokit } from 'octokit';
import { getGitHubToken } from './store';

let octokit: Octokit;

export const initializeOctokit = () => {
  const token = getGitHubToken();
  octokit = new Octokit({
    auth: token
  });
};

// Initialize on load
initializeOctokit();

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  name: string;
  bio: string;
  public_repos: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
  email?: string;
  location?: string;
  company?: string;
  blog?: string;
  twitter_username?: string;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  watchers_count: number;
  open_issues_count: number;
  language: string;
  owner: {
    avatar_url: string;
    login: string;
  };
  created_at: string;
  updated_at: string;
  topics?: string[];
  license?: {
    name: string;
    spdx_id: string;
  };
  size?: number;
  default_branch?: string;
  homepage?: string;
}

export const getUserProfile = async (username: string): Promise<GitHubUser> => {
  if (!octokit) throw new Error("Octokit not initialized");
  
  try {
    const response = await octokit.request('GET /users/{username}', {
      username,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    return response.data as GitHubUser;
  } catch (error) {
    console.error('Error fetching user profile:', error);
    throw error;
  }
};

export interface RepoDetails {
  languages: Record<string, number>;
  contributors: number;
  branches: number;
  commits: number;
  readme?: string;
  topics: string[];
  pullRequests: number;
  lastRelease?: {
    name: string;
    published_at: string;
    html_url: string;
  };
  symbolTree?: SymbolTreeItem[];
  dependencies?: Dependency[];
  codeQuality?: CodeQualityMetrics;
  activityGraph?: ActivityPoint[];
  collaborators?: Collaborator[];
}

export interface SymbolTreeItem {
  name: string;
  kind: 'class' | 'function' | 'variable' | 'interface' | 'enum' | 'namespace';
  path: string;
  line: number;
  children?: SymbolTreeItem[];
}

export interface Dependency {
  name: string;
  version: string;
  type: 'runtime' | 'development' | 'peer' | 'optional';
}

export interface CodeQualityMetrics {
  codeSmells: number;
  duplications: number;
  coverage: number;
  maintainability: number;
}

export interface ActivityPoint {
  date: string;
  commits: number;
}

export interface Collaborator {
  login: string;
  avatar_url: string;
  contributions: number;
  role?: string;
}

export interface RepoContent {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: 'file' | 'dir';
  content?: string;
  encoding?: string;
}

export const searchRepositories = async (query: string): Promise<GitHubRepo[]> => {
  if (!octokit) return [];
  
  try {
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
    console.error('Error searching repositories:', error);
    return [];
  }
};

export const getTrendingRepositories = async (
  language: string = '',
  since: 'daily' | 'weekly' | 'monthly' = 'daily'
): Promise<GitHubRepo[]> => {
  if (!octokit) return [];

  try {
    const date = new Date();
    if (since === 'weekly') {
      date.setDate(date.getDate() - 7);
    } else if (since === 'monthly') {
      date.setMonth(date.getMonth() - 1);
    } else {
      date.setDate(date.getDate() - 1);
    }

    const dateString = date.toISOString().split('T')[0];
    
    const query = `created:>${dateString} ${language ? `language:${language}` : ''}`;
    
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
    console.error('Error fetching trending repositories:', error);
    return [];
  }
};

export const getRecommendedRepositories = async (
  topics: string[] = [],
  language: string = ''
): Promise<GitHubRepo[]> => {
  if (!octokit) return [];

  try {
    const topicsQuery = topics.map(topic => `topic:${topic}`).join(' ');
    const query = `${topicsQuery} ${language ? `language:${language}` : ''} stars:>100`;
    
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
    console.error('Error fetching recommended repositories:', error);
    return [];
  }
};

export const getTopicRepositories = async (topic: string): Promise<GitHubRepo[]> => {
  if (!octokit) return [];

  try {
    const response = await octokit.request('GET /search/repositories', {
      q: `topic:${topic}`,
      sort: 'stars',
      order: 'desc',
      per_page: 30,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return response.data.items;
  } catch (error) {
    console.error('Error fetching topic repositories:', error);
    return [];
  }
};

export const getPopularTopics = async (): Promise<string[]> => {
  return [
    'machine-learning',
    'react',
    'typescript',
    'python',
    'javascript',
    'ai',
    'web-development',
    'data-science',
    'blockchain',
    'mobile-app',
    'game-development',
    'devops',
    'cloud',
    'backend',
    'frontend'
  ];
};

export const getLanguages = async (owner: string, repo: string): Promise<Record<string, number>> => {
  if (!octokit) return {};

  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/languages', {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching languages:', error);
    return {};
  }
};

export const getContributors = async (owner: string, repo: string): Promise<number> => {
  if (!octokit) return 0;

  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/contributors', {
      owner,
      repo,
      per_page: 1,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    const linkHeader = response.headers.link || '';
    const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
    return match ? parseInt(match[1]) : 1;
  } catch (error) {
    console.error('Error fetching contributors:', error);
    return 0;
  }
};

export const getCollaborators = async (owner: string, repo: string): Promise<Collaborator[]> => {
  if (!octokit) return [];

  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/contributors', {
      owner,
      repo,
      per_page: 10,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return response.data.map((contributor: any) => ({
      login: contributor.login,
      avatar_url: contributor.avatar_url,
      contributions: contributor.contributions
    }));
  } catch (error) {
    console.error('Error fetching collaborators:', error);
    return [];
  }
};

export const getBranches = async (owner: string, repo: string): Promise<number> => {
  if (!octokit) return 0;

  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/branches', {
      owner,
      repo,
      per_page: 1,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    const linkHeader = response.headers.link || '';
    const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
    return match ? parseInt(match[1]) : 1;
  } catch (error) {
    console.error('Error fetching branches:', error);
    return 0;
  }
};

export const getCommits = async (owner: string, repo: string): Promise<number> => {
  if (!octokit) return 0;

  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/commits', {
      owner,
      repo,
      per_page: 1,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    const linkHeader = response.headers.link || '';
    const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
    return match ? parseInt(match[1]) : 1;
  } catch (error) {
    console.error('Error fetching commits:', error);
    return 0;
  }
};

export const getCommitActivity = async (owner: string, repo: string): Promise<ActivityPoint[]> => {
  if (!octokit) return [];

  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/stats/commit_activity', {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return response.data.slice(-12).map((week: any) => {
      const date = new Date(week.week * 1000);
      return {
        date: date.toISOString().split('T')[0],
        commits: week.total
      };
    });
  } catch (error) {
    console.error('Error fetching commit activity:', error);
    return [];
  }
};

export const getPullRequests = async (owner: string, repo: string): Promise<number> => {
  if (!octokit) return 0;

  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/pulls', {
      owner,
      repo,
      state: 'all',
      per_page: 1,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    const linkHeader = response.headers.link || '';
    const match = linkHeader.match(/&page=(\d+)>; rel="last"/);
    return match ? parseInt(match[1]) : 1;
  } catch (error) {
    console.error('Error fetching pull requests:', error);
    return 0;
  }
};

export const getReadme = async (owner: string, repo: string): Promise<string | null> => {
  if (!octokit) return null;

  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/readme', {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28',
        'Accept': 'application/vnd.github.html'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching readme:', error);
    return null;
  }
};

export const getRepoContents = async (
  owner: string, 
  repo: string, 
  path: string,
  getContent: boolean = false
): Promise<any> => {
  if (!octokit) return [];

  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    if (getContent && !Array.isArray(response.data) && response.data.content) {
      return Buffer.from(response.data.content, 'base64').toString('utf-8');
    }

    return Array.isArray(response.data) ? response.data : [response.data];
  } catch (error) {
    console.error(`Error fetching repo contents for ${path}:`, error);
    return [];
  }
};

export const getLatestRelease = async (owner: string, repo: string): Promise<any | null> => {
  if (!octokit) return null;

  try {
    const response = await octokit.request('GET /repos/{owner}/{repo}/releases/latest', {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return {
      name: response.data.name,
      published_at: response.data.published_at,
      html_url: response.data.html_url
    };
  } catch (error) {
    console.error('Error fetching latest release:', error);
    return null;
  }
};

export const getDependencies = async (owner: string, repo: string): Promise<Dependency[]> => {
  if (!octokit) return [];

  try {
    const packageJson = await getRepoContents(owner, repo, 'package.json', true).catch(() => null);
    
    if (packageJson) {
      try {
        const parsed = JSON.parse(packageJson);
        const dependencies: Dependency[] = [];
        
        const addDeps = (deps: Record<string, string>, type: 'runtime' | 'development' | 'peer' | 'optional') => {
          if (!deps) return;
          Object.entries(deps).forEach(([name, version]) => {
            dependencies.push({ name, version, type });
          });
        };
        
        addDeps(parsed.dependencies, 'runtime');
        addDeps(parsed.devDependencies, 'development');
        addDeps(parsed.peerDependencies, 'peer');
        addDeps(parsed.optionalDependencies, 'optional');
        
        return dependencies;
      } catch (e) {
        console.error('Error parsing package.json:', e);
      }
    }
    
    const requirementsTxt = await getRepoContents(owner, repo, 'requirements.txt', true).catch(() => null);
    
    if (requirementsTxt) {
      const lines = requirementsTxt.split('\n');
      return lines
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => {
          const [name, version] = line.split('==');
          return {
            name: name.trim(),
            version: version ? version.trim() : 'latest',
            type: 'runtime'
          };
        });
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching dependencies:', error);
    return [];
  }
};

export const getSymbolTree = async (owner: string, repo: string): Promise<SymbolTreeItem[]> => {
  return [];
};

export const getCodeQualityMetrics = async (owner: string, repo: string): Promise<CodeQualityMetrics | null> => {
  return {
    codeSmells: Math.floor(Math.random() * 100),
    duplications: Math.floor(Math.random() * 30),
    coverage: Math.floor(Math.random() * 100),
    maintainability: Math.floor(Math.random() * 100)
  };
};

export const getRepoDetails = async (owner: string, repo: string): Promise<RepoDetails> => {
  const [
    languages, 
    contributors, 
    branches, 
    commits, 
    pullRequests, 
    readme, 
    latestRelease,
    collaborators,
    activityGraph,
    dependencies,
    codeQuality
  ] = await Promise.all([
    getLanguages(owner, repo),
    getContributors(owner, repo),
    getBranches(owner, repo),
    getCommits(owner, repo),
    getPullRequests(owner, repo),
    getReadme(owner, repo).catch(() => null),
    getLatestRelease(owner, repo).catch(() => null),
    getCollaborators(owner, repo).catch(() => []),
    getCommitActivity(owner, repo).catch(() => []),
    getDependencies(owner, repo).catch(() => []),
    getCodeQualityMetrics(owner, repo).catch(() => null)
  ]);

  // Get repository to fetch topics
  let topics: string[] = [];
  try {
    const repoResponse = await octokit.request('GET /repos/{owner}/{repo}', {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    topics = repoResponse.data.topics || [];
  } catch (error) {
    console.error('Error fetching repository details:', error);
  }

  // Get symbol tree (mock implementation)
  const symbolTree = await getSymbolTree(owner, repo).catch(() => []);

  return {
    languages,
    contributors,
    branches,
    commits,
    readme,
    topics,
    pullRequests,
    lastRelease: latestRelease,
    collaborators,
    activityGraph,
    dependencies,
    codeQuality,
    symbolTree
  };
};

export const validateGitHubToken = async (token: string): Promise<boolean> => {
  try {
    const testOctokit = new Octokit({ auth: token });
    await testOctokit.request('GET /user');
    return true;
  } catch (error) {
    return false;
  }
};

export const getSimilarRepositories = async (owner: string, repo: string): Promise<GitHubRepo[]> => {
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
      per_page: 5,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    return response.data.items;
  } catch (error) {
    console.error('Error fetching similar repositories:', error);
    return [];
  }
};

export const getRepositoryInsights = async (owner: string, repo: string): Promise<any> => {
  if (!octokit) return null;

  try {
    // Get participation stats (commit counts)
    const participationResponse = await octokit.request('GET /repos/{owner}/{repo}/stats/participation', {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    // Get code frequency (additions/deletions per week)
    const codeFrequencyResponse = await octokit.request('GET /repos/{owner}/{repo}/stats/code_frequency', {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    // Get contributor stats
    const contributorStatsResponse = await octokit.request('GET /repos/{owner}/{repo}/stats/contributors', {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    return {
      participation: participationResponse.data,
      codeFrequency: codeFrequencyResponse.data,
      contributorStats: contributorStatsResponse.data
    };
  } catch (error) {
    console.error('Error fetching repository insights:', error);
    return null;
  }
};

export const searchUserRepositories = async (username: string): Promise<GitHubRepo[]> => {
  if (!octokit) return [];

  try {
    const response = await octokit.request('GET /users/{username}/repos', {
      username,
      sort: 'updated',
      per_page: 30,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching user repositories:', error);
    return [];
  }
};

export const searchOrganizationRepositories = async (org: string): Promise<GitHubRepo[]> => {
  if (!octokit) return [];

  try {
    const response = await octokit.request('GET /orgs/{org}/repos', {
      org,
      sort: 'updated',
      per_page: 30,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return response.data;
  } catch (error) {
    console.error('Error fetching organization repositories:', error);
    return [];
  }
};
