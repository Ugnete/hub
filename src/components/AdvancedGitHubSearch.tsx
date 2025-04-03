import React, { useState, useEffect } from 'react';
import { Search, Filter, Calendar, Code, Tag, Star, GitFork, Eye, Users, Clock, X } from 'lucide-react';
import { searchRepositories, GitHubRepo } from '../utils/github';

interface AdvancedGitHubSearchProps {
  onSelectRepo: (repo: GitHubRepo) => void;
}

interface SearchFilter {
  type: 'language' | 'stars' | 'created' | 'topic' | 'user' | 'forks' | 'updated';
  value: string;
  label: string;
}

const AdvancedGitHubSearch: React.FC<AdvancedGitHubSearchProps> = ({ onSelectRepo }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilter[]>([]);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'stars' | 'forks' | 'updated' | 'created'>('stars');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const addFilter = (filter: SearchFilter) => {
    // Don't add duplicate filters of the same type
    if (!filters.some(f => f.type === filter.type && f.value === filter.value)) {
      setFilters([...filters, filter]);
    }
    setShowFilterMenu(false);
  };

  const removeFilter = (index: number) => {
    const newFilters = [...filters];
    newFilters.splice(index, 1);
    setFilters(newFilters);
  };

  const buildSearchQuery = () => {
    let query = searchQuery.trim();
    
    filters.forEach(filter => {
      switch (filter.type) {
        case 'language':
          query += ` language:${filter.value}`;
          break;
        case 'stars':
          query += ` stars:${filter.value}`;
          break;
        case 'created':
          query += ` created:${filter.value}`;
          break;
        case 'topic':
          query += ` topic:${filter.value}`;
          break;
        case 'user':
          query += ` user:${filter.value}`;
          break;
        case 'forks':
          query += ` forks:${filter.value}`;
          break;
        case 'updated':
          query += ` pushed:${filter.value}`;
          break;
      }
    });
    
    return query;
  };

  const handleSearch = async () => {
    const query = buildSearchQuery();
    if (!query) return;
    
    setIsLoading(true);
    try {
      const results = await searchRepositories(query);
      setRepositories(results);
    } catch (error) {
      console.error('Error searching repositories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const getFilterIcon = (type: string) => {
    switch (type) {
      case 'language':
        return <Code className="w-4 h-4 text-blue-400" />;
      case 'stars':
        return <Star className="w-4 h-4 text-yellow-400" />;
      case 'created':
        return <Calendar className="w-4 h-4 text-green-400" />;
      case 'topic':
        return <Tag className="w-4 h-4 text-purple-400" />;
      case 'user':
        return <Users className="w-4 h-4 text-indigo-400" />;
      case 'forks':
        return <GitFork className="w-4 h-4 text-blue-400" />;
      case 'updated':
        return <Clock className="w-4 h-4 text-orange-400" />;
      default:
        return <Filter className="w-4 h-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search GitHub repositories..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleKeyPress}
              className="search-input pl-10"
            />
          </div>
          <div className="relative">
            <button
              className="btn-secondary"
              onClick={() => setShowFilterMenu(!showFilterMenu)}
            >
              <Filter className="w-5 h-5" />
              <span>Filters</span>
            </button>
            
            {showFilterMenu && (
              <div className="absolute right-0 mt-2 w-64 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-10 p-3 space-y-3">
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Language</h4>
                  <div className="flex flex-wrap gap-2">
                    {['JavaScript', 'TypeScript', 'Python', 'Go', 'Rust'].map(lang => (
                      <button
                        key={lang}
                        className="px-2 py-1 text-xs rounded-full bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 transition-colors"
                        onClick={() => addFilter({ type: 'language', value: lang.toLowerCase(), label: lang })}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Stars</h4>
                  <div className="flex flex-wrap gap-2">
                    {['>100', '>1000', '>10000'].map(stars => (
                      <button
                        key={stars}
                        className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-300 hover:bg-yellow-500/30 transition-colors"
                        onClick={() => addFilter({ type: 'stars', value: stars, label: `Stars ${stars}` })}
                      >
                        {stars}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Created</h4>
                  <div className="flex flex-wrap gap-2">
                    {['>2023-01-01', '>2022-01-01', '>2020-01-01'].map(date => (
                      <button
                        key={date}
                        className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-300 hover:bg-green-500/30 transition-colors"
                        onClick={() => addFilter({ 
                          type: 'created', 
                          value: date, 
                          label: `Created ${date.replace('>', 'after ')}` 
                        })}
                      >
                        {date.replace('>', 'After ')}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-300">Topics</h4>
                  <div className="flex flex-wrap gap-2">
                    {['ai', 'machine-learning', 'web', 'blockchain', 'llm'].map(topic => (
                      <button
                        key={topic}
                        className="px-2 py-1 text-xs rounded-full bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 transition-colors"
                        onClick={() => addFilter({ type: 'topic', value: topic, label: `Topic: ${topic}` })}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          
          <button
            className="btn-primary"
            onClick={handleSearch}
          >
            <Search className="w-5 h-5" />
            <span>Search</span>
          </button>
        </div>
        
        {filters.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {filters.map((filter, index) => (
              <div
                key={`${filter.type}-${filter.value}`}
                className="flex items-center space-x-1 px-2 py-1 rounded-full bg-gray-700/50 text-sm"
              >
                {getFilterIcon(filter.type)}
                <span>{filter.label}</span>
                <button
                  className="ml-1 p-0.5 rounded-full hover:bg-gray-600 transition-colors"
                  onClick={() => removeFilter(index)}
                >
                  <X className="w-3 h-3 text-gray-400" />
                </button>
              </div>
            ))}
            <button
              className="text-sm text-gray-400 hover:text-white transition-colors"
              onClick={() => setFilters([])}
            >
              Clear all
            </button>
          </div>
        )}
        
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-400">Sort by:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-sm"
            >
              <option value="stars">Stars</option>
              <option value="forks">Forks</option>
              <option value="updated">Updated</option>
              <option value="created">Created</option>
            </select>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 rounded-md px-2 py-1 text-sm"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>
          
          {repositories.length > 0 && (
            <span className="text-sm text-gray-400">
              {repositories.length} repositories found
            </span>
          )}
        </div>
      </div>
      
      {/* Results */}
      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {repositories.map((repo) => (
            <div
              key={repo.id}
              className="glass-card p-6 rounded-xl space-y-4 cursor-pointer hover:scale-[1.02] transition-all duration-300"
              onClick={() => onSelectRepo(repo)}
            >
              <div className="flex items-center space-x-3">
                <img
                  src={repo.owner.avatar_url}
                  alt={`${repo.name} owner avatar`}
                  className="w-8 h-8 rounded-lg"
                />
                <h3 className="text-lg font-semibold text-white">{repo.name}</h3>
              </div>

              <p className="text-gray-400 line-clamp-2">{repo.description}</p>

              <div className="flex items-center space-x-4 text-sm text-gray-400">
                <span className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-400" />
                  <span>{repo.stargazers_count.toLocaleString()}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <GitFork className="w-4 h-4 text-blue-400" />
                  <span>{repo.forks_count.toLocaleString()}</span>
                </span>
                <span className="flex items-center space-x-1">
                  <Eye className="w-4 h-4 text-green-400" />
                  <span>{repo.watchers_count.toLocaleString()}</span>
                </span>
              </div>

              <div className="flex flex-wrap gap-2">
                {repo.language && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30">
                    {repo.language}
                  </span>
                )}
                {repo.topics?.slice(0, 3).map(topic => (
                  <span key={topic} className="px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30">
                    {topic}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdvancedGitHubSearch;