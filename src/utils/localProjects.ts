import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';

export interface CodeSearchResult {
  fileName: string;
  filePath: string;
  snippet: string;
  content: string;
  lineStart: number;
  lineEnd: number;
  relevanceScore?: number;
}

/**
 * Search code semantically or by keyword in a local project
 * @param query The search query
 * @param projectPath The path to the project directory
 * @param semantic Whether to use semantic search (true) or keyword search (false)
 * @returns Array of search results
 */
export const searchCodeSemantically = async (
  query: string,
  projectPath?: string,
  semantic: boolean = true
): Promise<CodeSearchResult[]> => {
  if (!projectPath) {
    console.error('No project path provided');
    return [];
  }

  try {
    // Get all code files in the project
    const files = await getCodeFiles(projectPath);
    
    // Search results array
    const results: CodeSearchResult[] = [];

    // Process each file
    for (const filePath of files) {
      try {
        // Read file content
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');
        
        // For semantic search, we would ideally use an embedding model
        // For this implementation, we'll use a simplified approach
        if (semantic) {
          const result = semanticSearch(query, filePath, content, lines);
          if (result) {
            results.push(result);
          }
        } else {
          // Keyword search
          const keywordResults = keywordSearch(query, filePath, content, lines);
          results.push(...keywordResults);
        }
      } catch (error) {
        console.error(`Error processing file ${filePath}:`, error);
      }
    }

    // Sort results by relevance score
    return results.sort((a, b) => {
      const scoreA = a.relevanceScore || 0;
      const scoreB = b.relevanceScore || 0;
      return scoreB - scoreA;
    });
  } catch (error) {
    console.error('Error searching code:', error);
    return [];
  }
};

/**
 * Get all code files in a directory
 * @param directory The directory to search
 * @returns Array of file paths
 */
const getCodeFiles = async (directory: string): Promise<string[]> => {
  // Define code file extensions to search for
  const extensions = [
    '**/*.js', '**/*.jsx', '**/*.ts', '**/*.tsx', 
    '**/*.py', '**/*.java', '**/*.c', '**/*.cpp', 
    '**/*.cs', '**/*.go', '**/*.rb', '**/*.php',
    '**/*.html', '**/*.css', '**/*.scss', '**/*.sass'
  ];
  
  // Use glob to find all files with the specified extensions
  const files: string[] = [];
  
  for (const pattern of extensions) {
    const matches = glob.sync(pattern, { cwd: directory, absolute: true });
    files.push(...matches);
  }
  
  return files;
};

/**
 * Perform semantic search on a file
 * @param query The search query
 * @param filePath The file path
 * @param content The file content
 * @param lines The file content split into lines
 * @returns Search result or null if no match
 */
const semanticSearch = (
  query: string,
  filePath: string,
  content: string,
  lines: string[]
): CodeSearchResult | null => {
  // In a real implementation, this would use embeddings and semantic similarity
  // For this simplified version, we'll use a basic relevance scoring approach
  
  // Extract key terms from the query
  const queryTerms = query.toLowerCase()
    .split(/\s+/)
    .filter(term => term.length > 2)
    .filter(term => !['the', 'and', 'for', 'with'].includes(term));
  
  if (queryTerms.length === 0) return null;
  
  // Calculate relevance score based on term frequency
  let maxScore = 0;
  let bestSnippetStart = 0;
  let bestSnippetEnd = Math.min(10, lines.length - 1);
  
  // Sliding window approach to find the most relevant snippet
  const windowSize = 10;
  
  for (let i = 0; i <= lines.length - windowSize; i++) {
    const windowText = lines.slice(i, i + windowSize).join(' ').toLowerCase();
    let score = 0;
    
    for (const term of queryTerms) {
      const regex = new RegExp(term, 'gi');
      const matches = windowText.match(regex);
      if (matches) {
        score += matches.length;
      }
    }
    
    // Boost score for matches in important parts of the file (function/class definitions)
    const windowHasDefinition = windowText.includes('function') || 
                               windowText.includes('class') || 
                               windowText.includes('interface') ||
                               windowText.includes('export') ||
                               windowText.includes('import');
    
    if (windowHasDefinition) {
      score *= 1.5;
    }
    
    if (score > maxScore) {
      maxScore = score;
      bestSnippetStart = i;
      bestSnippetEnd = i + windowSize - 1;
    }
  }
  
  // If no relevant content found, return null
  if (maxScore === 0) return null;
  
  // Normalize score to 0-1 range
  const normalizedScore = Math.min(maxScore / (queryTerms.length * 2), 1);
  
  // Create snippet
  const snippet = lines.slice(bestSnippetStart, bestSnippetEnd + 1).join('\n');
  
  return {
    fileName: path.basename(filePath),
    filePath: filePath,
    snippet: snippet,
    content: content,
    lineStart: bestSnippetStart + 1, // 1-based line numbers
    lineEnd: bestSnippetEnd + 1,
    relevanceScore: normalizedScore
  };
};

/**
 * Perform keyword search on a file
 * @param query The search query
 * @param filePath The file path
 * @param content The file content
 * @param lines The file content split into lines
 * @returns Array of search results
 */
const keywordSearch = (
  query: string,
  filePath: string,
  content: string,
  lines: string[]
): CodeSearchResult[] => {
  const results: CodeSearchResult[] = [];
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
  
  if (queryTerms.length === 0) return [];
  
  // Find all line matches
  const matchedLines: number[] = [];
  
  lines.forEach((line, index) => {
    const lowerLine = line.toLowerCase();
    for (const term of queryTerms) {
      if (lowerLine.includes(term)) {
        matchedLines.push(index);
        break;
      }
    }
  });
  
  if (matchedLines.length === 0) return [];
  
  // Group consecutive line matches into snippets
  const snippets: { start: number; end: number }[] = [];
  let snippetStart = matchedLines[0];
  let snippetEnd = matchedLines[0];
  
  for (let i = 1; i < matchedLines.length; i++) {
    if (matchedLines[i] <= snippetEnd + 3) { // Allow up to 3 lines gap
      snippetEnd = matchedLines[i];
    } else {
      snippets.push({ start: snippetStart, end: snippetEnd });
      snippetStart = matchedLines[i];
      snippetEnd = matchedLines[i];
    }
  }
  
  snippets.push({ start: snippetStart, end: snippetEnd });
  
  // Create result objects for each snippet
  for (const snippet of snippets) {
    // Add context lines
    const contextStart = Math.max(0, snippet.start - 2);
    const contextEnd = Math.min(lines.length - 1, snippet.end + 2);
    
    const snippetText = lines.slice(contextStart, contextEnd + 1).join('\n');
    
    results.push({
      fileName: path.basename(filePath),
      filePath: filePath,
      snippet: snippetText,
      content: content,
      lineStart: contextStart + 1, // 1-based line numbers
      lineEnd: contextEnd + 1,
      relevanceScore: calculateKeywordRelevance(snippetText, query)
    });
  }
  
  return results;
};

/**
 * Calculate keyword relevance score
 * @param text The text to analyze
 * @param query The search query
 * @returns Relevance score between 0 and 1
 */
const calculateKeywordRelevance = (text: string, query: string): number => {
  const lowerText = text.toLowerCase();
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 0);
  
  if (queryTerms.length === 0) return 0;
  
  let score = 0;
  
  // Score based on term frequency
  for (const term of queryTerms) {
    const regex = new RegExp(term, 'gi');
    const matches = lowerText.match(regex);
    if (matches) {
      score += matches.length;
    }
  }
  
  // Bonus for exact phrase match
  if (lowerText.includes(query.toLowerCase())) {
    score += queryTerms.length;
  }
  
  // Normalize score to 0-1 range
  return Math.min(score / (queryTerms.length * 3), 1);
};