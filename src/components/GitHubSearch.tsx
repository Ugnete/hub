import React, { useState, useEffect } from 'react';
import { Search, Star, GitFork, Eye, Code, Tag, Zap } from 'lucide-react';
import { 
  searchRepositories, 
  getTrendingRepositories, 
  getTopicRepositories,
  getRecommendedRepositories,
  getPopularTopics,
  GitHubRepo 
} from '../utils/github';

interface GitHubSearchProps {
  onSelectRepo: (repo: GitHubRepo) => void;
}

const LANGUAGES = [
  'All',
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'Go',
  'Rust',
  'C++',
  'PHP',
  'Ruby'
];

const TIME_PERIODS = [
  { label: 'Today', value: 'daily' },
  { label: 'This Week', value: 'weekly' },
  { label: 'This Month', value: 'monthly' }
] as const;

export default function GitHubSearch({ onSelectRepo }: GitHubSearchProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'search' | 'trending' | 'topics' | 'recommended'>('trending');
  const [popularTopics, setPopularTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [userInterests, setUserInterests] = useState<string[]>([]);

  useEffect(() => {
    fetchTrendingRepos();
    fetchPopularTopics();
  }, []);

  useEffect(() => {
    if (activeTab === 'trending') {
      fetchTrendingRepos();
    }
  }, [selectedLanguage, timePeriod, activeTab]);

  useEffect(() => {
    if (activeTab === 'topics' && selectedTopic) {
      fetchTopicRepos();
    }
  }, [selectedTopic, activeTab]);

  useEffect(() => {
    if (activeTab === 'recommended' && userInterests.length > 0) {
      fetchRecommendedRepos();
    }
  }, [userInterests, selectedLanguage, activeTab]);

  const fetchPopularTopics = async () => {
    const topics = await getPopularTopics();
    setPopularTopics(topics);
    if (topics.length > 0) {
      setSelectedTopic(topics[0]);
    }
  };

  const fetchTrendingRepos = async () => {
    setIsLoading(true);
    const repos = await getTrendingRepositories(
      selectedLanguage === 'All' ? '' : selectedLanguage,
      timePeriod
    );
    setRepositories(repos);
    setIsLoading(false);
  };

  const fetchTopicRepos = async () => {
    if (!selectedTopic) return;
    setIsLoading(true);
    const repos = await getTopicRepositories(selectedTopic);
    setRepositories(repos);
    setIsLoading(false);
  };

  const fetchRecommendedRepos = async () => {
    setIsLoading(true);
    const repos = await getRecommendedRepositories(
      userInterests,
      selectedLanguage === 'All' ? '' : selectedLanguage
    );
    setRepositories(repos);
    setIsLoading(false);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setIsLoading(true);
    const repos = await searchRepositories(searchQuery);
    setRepositories(repos);
    setIsLoading(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const toggleInterest = (topic: string) => {
    setUserInterests(prev => 
      prev.includes(topic)
        ? prev.filter(t => t !== topic)
        : [...prev, topic]
    );
  };

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex space-x-4 border-b border-gray-700/30">
        <button
          onClick={() => setActiveTab('trending')}
          className={`pb-2 px-4 transition-colors flex items-center space-x-2 ${
            activeTab === 'trending'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Trending</span>
        </button>
        <button
          onClick={() => setActiveTab('topics')}
          className={`pb-2 px-4 transition-colors flex items-center space-x-2 ${
            activeTab === 'topics'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Topics</span>
        </button>
        <button
          onClick={() => setActiveTab('recommended')}
          className={`pb-2 px-4 transition-colors flex items-center space-x-2 ${
            activeTab === 'recommended'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Star className="w-4 h-4" />
          <span>For You</span>
        </button>
        <button
          onClick={() => setActiveTab('search')}
          className={`pb-2 px-4 transition-colors flex items-center space-x-2 ${
            activeTab === 'search'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>Search</span>
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-wrap gap-4">
        {activeTab === 'search' && (
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search GitHub repositories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="search-input"
              />
            </div>
          </div>
        )}

        {activeTab === 'trending' && (
          <>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="search-input bg-transparent"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang} className="bg-gray-800">
                  {lang}
                </option>
              ))}
            </select>

            <select
              value={timePeriod}
              onChange={(e) => setTimePeriod(e.target.value as typeof timePeriod)}
              className="search-input bg-transparent"
            >
              {TIME_PERIODS.map((period) => (
                <option key={period.value} value={period.value} className="bg-gray-800">
                  {period.label}
                </option>
              ))}
            </select>
          </>
        )}

        {activeTab === 'topics' && (
          <div className="w-full">
            <div className="flex flex-wrap gap-2 mb-4">
              {popularTopics.map(topic => (
                <button
                  key={topic}
                  onClick={() => setSelectedTopic(topic)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedTopic === topic
                      ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                      : 'bg-gray-700/30 text-gray-300 border border-gray-600/30 hover:bg-gray-700/50'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'recommended' && (
          <div className="w-full">
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-300 mb-2">Select your interests:</h3>
              <div className="flex flex-wrap gap-2">
                {popularTopics.map(topic => (
                  <button
                    key={topic}
                    onClick={() => toggleInterest(topic)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      userInterests.includes(topic)
                        ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                        : 'bg-gray-700/30 text-gray-300 border border-gray-600/30 hover:bg-gray-700/50'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>
            <select
              value={selectedLanguage}
              onChange={(e) => setSelectedLanguage(e.target.value)}
              className="search-input bg-transparent"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang} className="bg-gray-800">
                  {lang}
                </option>
              ))}
            </select>
          </div>
        )}
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
}