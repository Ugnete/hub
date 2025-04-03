import React, { useState } from 'react';
import { Search, Code, FileText, Folder, ArrowRight, Zap, Cpu, Loader, ExternalLink } from 'lucide-react';
import { searchCodeSemantically, CodeSearchResult } from '../utils/localProjects';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface SemanticCodeSearchProps {
  projectPath?: string;
}

export default function SemanticCodeSearch({ projectPath }: SemanticCodeSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<CodeSearchResult[]>([]);
  const [selectedResult, setSelectedResult] = useState<CodeSearchResult | null>(null);
  const [searchMode, setSearchMode] = useState<'semantic' | 'keyword'>('semantic');

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsLoading(true);
    try {
      const searchResults = await searchCodeSemantically(
        searchQuery, 
        projectPath, 
        searchMode === 'semantic'
      );
      setResults(searchResults);
      setSelectedResult(null);
    } catch (error) {
      console.error('Error searching code:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getFileExtension = (filename: string) => {
    return filename.split('.').pop() || '';
  };

  const getLanguageFromExtension = (ext: string): string => {
    const languageMap: Record<string, string> = {
      js: 'javascript',
      jsx: 'jsx',
      ts: 'typescript',
      tsx: 'tsx',
      py: 'python',
      rb: 'ruby',
      java: 'java',
      go: 'go',
      rs: 'rust',
      cpp: 'cpp',
      c: 'c',
      cs: 'csharp',
      php: 'php',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      md: 'markdown',
      yml: 'yaml',
      yaml: 'yaml',
      sh: 'bash',
      bash: 'bash',
      txt: 'text'
    };
    
    return languageMap[ext.toLowerCase()] || 'text';
  };

  const highlightMatches = (text: string, query: string) => {
    if (!query.trim() || searchMode === 'semantic') return text;
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-500/30 text-yellow-200">$1</mark>');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Code Search
        </h2>
        <div className="flex space-x-3">
          <button
            onClick={() => setSearchMode('semantic')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
              searchMode === 'semantic' 
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/50' 
                : 'hover:bg-gray-700/50 text-gray-400 border border-gray-700/30'
            }`}
          >
            <Cpu className="w-4 h-4" />
            <span>Semantic</span>
          </button>
          <button
            onClick={() => setSearchMode('keyword')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center space-x-2 ${
              searchMode === 'keyword' 
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/50' 
                : 'hover:bg-gray-700/50 text-gray-400 border border-gray-700/30'
            }`}
          >
            <Code className="w-4 h-4" />
            <span>Keyword</span>
          </button>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder={searchMode === 'semantic' ? "Describe the code you're looking for..." : "Enter keywords to search..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="search-input"
            />
          </div>
        </div>
        <button 
          onClick={handleSearch}
          className="btn-primary"
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
          <span>Search</span>
        </button>
      </div>

      {searchMode === 'semantic' && (
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center space-x-2 text-indigo-400 mb-2">
            <Zap className="w-5 h-5" />
            <h3 className="font-medium">Semantic Search</h3>
          </div>
          <p className="text-sm text-gray-400">
            Semantic search understands the meaning behind your query, not just the keywords. 
            Try describing what you're looking for in natural language.
          </p>
          <div className="mt-3 text-xs text-gray-500">
            <p>Examples:</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              <li>"Find code that handles user authentication"</li>
              <li>"Show me how API requests are processed"</li>
              <li>"Where is the database connection configured?"</li>
            </ul>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results List */}
        <div className="lg:col-span-1 glass-card p-4 rounded-xl overflow-hidden flex flex-col h-[calc(100vh-20rem)]">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-indigo-400" />
            Results
            {results.length > 0 && <span className="ml-2 text-sm text-gray-400">({results.length})</span>}
          </h3>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500 mb-4"></div>
                <p className="text-gray-400">Searching code{searchMode === 'semantic' ? ' semantically' : ''}...</p>
              </div>
            </div>
          ) : results.length > 0 ? (
            <div className="overflow-y-auto flex-grow">
              {results.map((result, index) => (
                <div 
                  key={`${result.filePath}-${index}`}
                  className={`p-3 rounded-lg mb-2 cursor-pointer transition-colors ${
                    selectedResult === result 
                      ? 'bg-indigo-600/20 border border-indigo-500/50' 
                      : 'hover:bg-gray-700/50 border border-gray-700/30'
                  }`}
                  onClick={() => setSelectedResult(result)}
                >
                  <div className="flex items-center mb-1">
                    <Code className="w-4 h-4 text-indigo-400 mr-2" />
                    <span className="font-medium text-sm truncate">{result.fileName}</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-2 truncate">
                    {result.filePath}
                  </div>
                  <div 
                    className="text-xs text-gray-400 line-clamp-2"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightMatches(result.snippet, searchQuery) 
                    }}
                  />
                  {searchMode === 'semantic' && result.relevanceScore && (
                    <div className="flex items-center mt-2">
                      <div className="flex-1 h-1 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
                          style={{ width: `${result.relevanceScore * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 ml-2">
                        {Math.round(result.relevanceScore * 100)}%
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              {searchQuery ? (
                <>
                  <Search className="w-12 h-12 text-gray-600 mb-3" />
                  <p>No results found</p>
                  <p className="text-sm mt-2">Try a different search query</p>
                </>
              ) : (
                <>
                  <Search className="w-12 h-12 text-gray-600 mb-3" />
                  <p>Enter a search query to find code</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Code Preview */}
        <div className="lg:col-span-2 glass-card p-4 rounded-xl overflow-hidden flex flex-col h-[calc(100vh-20rem)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center">
              <Code className="w-5 h-5 mr-2 text-indigo-400" />
              {selectedResult ? (
                <span className="truncate">{selectedResult.fileName}</span>
              ) : (
                <span>Code Preview</span>
              )}
            </h3>
            {selectedResult && (
              <a 
                href={`file://${selectedResult.filePath}`}
                className="flex items-center space-x-1 text-indigo-400 hover:text-indigo-300 transition-colors text-sm"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Open File</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
          
          <div className="overflow-y-auto flex-grow">
            {selectedResult ? (
              <div className="text-sm">
                <SyntaxHighlighter
                  language={getLanguageFromExtension(getFileExtension(selectedResult.fileName))}
                  style={atomDark}
                  customStyle={{ background: 'transparent', padding: '1rem' }}
                  showLineNumbers
                  wrapLines
                  lineProps={(lineNumber) => {
                    const isHighlighted = 
                      lineNumber >= selectedResult.lineStart && 
                      lineNumber <= selectedResult.lineEnd;
                    return {
                      style: {
                        backgroundColor: isHighlighted ? 'rgba(79, 70, 229, 0.2)' : undefined,
                        borderLeft: isHighlighted ? '2px solid #6366f1' : undefined,
                        paddingLeft: isHighlighted ? '1rem' : undefined,
                      },
                    };
                  }}
                >
                  {selectedResult.content}
                </SyntaxHighlighter>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Code className="w-16 h-16 text-gray-600 mb-3" />
                <p>Select a result to view code</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}