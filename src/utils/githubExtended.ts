import { Octokit } from 'octokit';
import { getGitHubToken } from './store';
import { GitHubRepo } from './github';

let octokit: Octokit;

export const initializeOctokit = () => {
  const token = getGitHubToken();
  octokit = new Octokit({
    auth: token
  });
};

// Initialize on load
initializeOctokit();

// New function for advanced search with multiple filters
export const getAdvancedSearch = async (options: {
  query: string;
  language?: string;
  minStars?: number;
  maxAge?: number;
  hasIssues?: boolean;
  hasWiki?: boolean;
  isTemplate?: boolean;
}): Promise<GitHubRepo[]> => {
  if (!octokit) return [];

  try {
    let queryParts = [];
    
    if (options.query) {
      queryParts.push(options.query);
    }
    
    if (options.language) {
      queryParts.push(`language:${options.language}`);
    }
    
    if (options.minStars && options.minStars > 0) {
      queryParts.push(`stars:>=${options.minStars}`);
    }
    
    if (options.maxAge && options.maxAge > 0) {
      const date = new Date();
      date.setDate(date.getDate() - options.maxAge);
      const dateString = date.toISOString().split('T')[0];
      queryParts.push(`pushed:>=${dateString}`);
    }
    
    if (options.hasIssues !== undefined) {
      queryParts.push(`has:issues`);
    }
    
    if (options.hasWiki !== undefined) {
      queryParts.push(`has:wiki`);
    }
    
    if (options.isTemplate !== undefined) {
      queryParts.push(`is:template`);
    }
    
    const query = queryParts.join(' ');
    
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
    console.error('Error performing advanced search:', error);
    return [];
  }
};

// Function to get ecosystem projects (e.g., popular libraries, frameworks, tools)
export const getEcosystemProjects = async (language: string = ''): Promise<GitHubRepo[]> => {
  if (!octokit) return [];

  try {
    // For ecosystem projects, we'll look for popular libraries and frameworks
    const ecosystemKeywords = language ? 
      [`${language} framework`, `${language} library`, `${language} tool`] : 
      ['framework', 'library', 'sdk', 'toolkit'];
    
    const query = ecosystemKeywords.map(kw => `${kw} stars:>1000`).join(' OR ');
    
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
    console.error('Error fetching ecosystem projects:', error);
    return [];
  }
};

// Function to get recently updated repositories
export const getRecentlyUpdatedRepositories = async (language: string = ''): Promise<GitHubRepo[]> => {
  if (!octokit) return [];

  try {
    // Get repositories updated in the last week
    const date = new Date();
    date.setDate(date.getDate() - 7);
    const dateString = date.toISOString().split('T')[0];
    
    const query = `pushed:>=${dateString} ${language ? `language:${language}` : ''} stars:>10`;
    
    const response = await octokit.request('GET /search/repositories', {
      q: query,
      sort: 'updated',
      order: 'desc',
      per_page: 30,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return response.data.items;
  } catch (error) {
    console.error('Error fetching recently updated repositories:', error);
    return [];
  }
};

// Function to get most active repositories (by commit frequency)
export const getMostActiveRepositories = async (language: string = ''): Promise<GitHubRepo[]> => {
  if (!octokit) return [];

  try {
    // For most active, we'll use a combination of recent pushes and high number of open PRs
    const query = `${language ? `language:${language}` : ''} stars:>100 pushed:>2023-01-01`;
    
    const response = await octokit.request('GET /search/repositories', {
      q: query,
      sort: 'updated',
      order: 'desc',
      per_page: 30,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return response.data.items;
  } catch (error) {
    console.error('Error fetching most active repositories:', error);
    return [];
  }
};

// Function to get personalized repository recommendations
export const getRepositoryRecommendations = async (
  interests: string[] = [],
  language: string = ''
): Promise<GitHubRepo[]> => {
  if (!octokit) return [];

  try {
    const topicsQuery = interests.map(topic => `topic:${topic}`).join(' ');
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