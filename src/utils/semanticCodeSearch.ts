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

export interface CodeSearchResult {
  repo: GitHubRepo;
  file: {
    name: string;
    path: string;
    url: string;
    content?: string;
  };
  matches: {
    line: number;
    content: string;
  }[];
  score: number;
}

export interface FunctionalitySearchResult {
  repo: GitHubRepo;
  matchScore: number;
  matchReason: string;
  relevantFiles?: {
    path: string;
    url: string;
    relevance: string;
  }[];
}

// Search for code across GitHub repositories
export const searchCode = async (
  query: string,
  language?: string,
  fileExtension?: string,
  organization?: string
): Promise<CodeSearchResult[]> => {
  if (!octokit) return [];
  
  try {
    let searchQuery = query;
    
    if (language) {
      searchQuery += ` language:${language}`;
    }
    
    if (fileExtension) {
      searchQuery += ` extension:${fileExtension}`;
    }
    
    if (organization) {
      searchQuery += ` org:${organization}`;
    }
    
    const response = await octokit.request('GET /search/code', {
      q: searchQuery,
      per_page: 30,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    const results: CodeSearchResult[] = [];
    
    // Process each search result
    for (const item of response.data.items) {
      try {
        // Get repository details
        const repoResponse = await octokit.request('GET /repos/{owner}/{repo}', {
          owner: item.repository.owner.login,
          repo: item.repository.name,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        });
        
        // Get file content
        const contentResponse = await octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
          owner: item.repository.owner.login,
          repo: item.repository.name,
          path: item.path,
          headers: {
            'X-GitHub-Api-Version': '2022-11-28'
          }
        });
        
        // Decode content if it's base64 encoded
        let content = '';
        if (contentResponse.data.encoding === 'base64' && contentResponse.data.content) {
          content = atob(contentResponse.data.content.replace(/\\n/g, ''));
        }
        
        // Find matches in the content
        const lines = content.split('\n');
        const matches = findMatches(lines, query);
        
        results.push({
          repo: repoResponse.data,
          file: {
            name: item.name,
            path: item.path,
            url: item.html_url,
            content
          },
          matches,
          score: calculateRelevanceScore(matches, query, repoResponse.data)
        });
      } catch (error) {
        console.error(`Error processing search result for ${item.repository.full_name}/${item.path}:`, error);
      }
    }
    
    // Sort results by score
    return results.sort((a, b) => b.score - a.score);
  } catch (error) {
    console.error('Error searching code:', error);
    return [];
  }
};

// Find matches in the content
const findMatches = (lines: string[], query: string): { line: number; content: string }[] => {
  const matches: { line: number; content: string }[] = [];
  const queryTerms = query.toLowerCase().split(' ');
  
  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    if (queryTerms.some(term => lowerLine.includes(term))) {
      matches.push({
        line: index + 1,
        content: line.trim()
      });
    }
  });
  
  return matches;
};

// Calculate relevance score based on matches and repository metrics
const calculateRelevanceScore = (
  matches: { line: number; content: string }[],
  query: string,
  repo: GitHubRepo
): number => {
  // Basic scoring based on number of matches
  let score = matches.length;
  
  // Boost score based on repository metrics
  score += Math.log10(repo.stargazers_count + 1) * 2;
  score += Math.log10(repo.forks_count + 1);
  
  // Boost score based on query term frequency
  const queryTerms = query.toLowerCase().split(' ');
  matches.forEach(match => {
    const lowerContent = match.content.toLowerCase();
    queryTerms.forEach(term => {
      const regex = new RegExp(term, 'gi');
      const count = (lowerContent.match(regex) || []).length;
      score += count * 0.5;
    });
  });
  
  return score;
};

// Search for repositories by functionality description
export const searchByFunctionality = async (
  functionality: string,
  language?: string,
  minStars?: number
): Promise<FunctionalitySearchResult[]> => {
  if (!octokit) return [];
  
  try {
    // Extract key terms from functionality description
    const keyTerms = extractKeyTerms(functionality);
    
    // Build search query
    let searchQuery = keyTerms.join(' OR ');
    
    if (language) {
      searchQuery += ` language:${language}`;
    }
    
    if (minStars && minStars > 0) {
      searchQuery += ` stars:>=${minStars}`;
    }
    
    // Search repositories
    const response = await octokit.request('GET /search/repositories', {
      q: searchQuery,
      sort: 'stars',
      order: 'desc',
      per_page: 30,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    // Process results
    const results: FunctionalitySearchResult[] = [];
    
    for (const repo of response.data.items) {
      // Calculate match score
      const matchScore = calculateFunctionalityMatchScore(repo, functionality, keyTerms);
      
      // Generate match reason
      const matchReason = generateMatchReason(repo, functionality, keyTerms);
      
      results.push({
        repo,
        matchScore,
        matchReason
      });
    }
    
    // Sort by match score
    return results.sort((a, b) => b.matchScore - a.matchScore);
  } catch (error) {
    console.error('Error searching by functionality:', error);
    return [];
  }
};

// Extract key terms from functionality description
const extractKeyTerms = (functionality: string): string[] => {
  // In a real implementation, this would use NLP techniques
  // For now, we'll just split by spaces and filter out common words
  const commonWords = new Set([
    'a', 'an', 'the', 'and', 'or', 'but', 'for', 'with', 'in', 'on', 'at', 'to', 'from',
    'of', 'by', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has',
    'had', 'do', 'does', 'did', 'can', 'could', 'will', 'would', 'should', 'shall', 'may',
    'might', 'must', 'that', 'which', 'who', 'whom', 'whose', 'what', 'where', 'when',
    'why', 'how', 'this', 'these', 'those', 'it', 'its', 'it\'s', 'they', 'them', 'their',
    'theirs', 'we', 'us', 'our', 'ours', 'you', 'your', 'yours', 'he', 'him', 'his', 'she',
    'her', 'hers'
  ]);
  
  return functionality
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(' ')
    .filter(word => word.length > 2 && !commonWords.has(word));
};

// Calculate match score for functionality search
const calculateFunctionalityMatchScore = (
  repo: GitHubRepo,
  functionality: string,
  keyTerms: string[]
): number => {
  let score = 0;
  
  // Check description
  if (repo.description) {
    const lowerDescription = repo.description.toLowerCase();
    keyTerms.forEach(term => {
      if (lowerDescription.includes(term)) {
        score += 2;
      }
    });
    
    // Bonus for exact phrase match
    if (lowerDescription.includes(functionality.toLowerCase())) {
      score += 10;
    }
  }
  
  // Check topics
  if (repo.topics && repo.topics.length > 0) {
    const lowerTopics = repo.topics.map(t => t.toLowerCase());
    keyTerms.forEach(term => {
      if (lowerTopics.some(topic => topic.includes(term))) {
        score += 3;
      }
    });
  }
  
  // Add score based on repository metrics
  score += Math.log10(repo.stargazers_count + 1) * 0.5;
  score += Math.log10(repo.forks_count + 1) * 0.3;
  
  return score;
};

// Generate match reason for functionality search
const generateMatchReason = (
  repo: GitHubRepo,
  functionality: string,
  keyTerms: string[]
): string => {
  const reasons: string[] = [];
  
  // Check description
  if (repo.description) {
    const lowerDescription = repo.description.toLowerCase();
    const matchedTerms = keyTerms.filter(term => lowerDescription.includes(term));
    
    if (matchedTerms.length > 0) {
      reasons.push(`Repository description contains key terms: ${matchedTerms.join(', ')}`);
    }
    
    if (lowerDescription.includes(functionality.toLowerCase())) {
      reasons.push('Repository description closely matches the functionality description');
    }
  }
  
  // Check topics
  if (repo.topics && repo.topics.length > 0) {
    const lowerTopics = repo.topics.map(t => t.toLowerCase());
    const matchedTopics = repo.topics.filter(topic => 
      keyTerms.some(term => topic.toLowerCase().includes(term))
    );
    
    if (matchedTopics.length > 0) {
      reasons.push(`Repository has relevant topics: ${matchedTopics.join(', ')}`);
    }
  }
  
  // Add repository metrics
  reasons.push(`Repository has ${repo.stargazers_count} stars and ${repo.forks_count} forks`);
  
  return reasons.join('. ');
};

// Get relevant files for a repository based on functionality
export const getRelevantFiles = async (
  owner: string,
  repo: string,
  functionality: string
): Promise<{ path: string; url: string; relevance: string }[]> => {
  if (!octokit) return [];
  
  try {
    // Extract key terms from functionality description
    const keyTerms = extractKeyTerms(functionality);
    
    // Build search query for code search
    const searchQuery = `${keyTerms.join(' OR ')} repo:${owner}/${repo}`;
    
    // Search code
    const response = await octokit.request('GET /search/code', {
      q: searchQuery,
      per_page: 10,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });
    
    // Process results
    return response.data.items.map(item => ({
      path: item.path,
      url: item.html_url,
      relevance: `Contains key terms related to ${functionality}`
    }));
  } catch (error) {
    console.error('Error getting relevant files:', error);
    return [];
  }
};