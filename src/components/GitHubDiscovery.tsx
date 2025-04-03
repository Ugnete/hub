import React, { useState, useEffect } from 'react';
import { 
  Search, Star, GitFork, Eye, Code, Tag, Zap, Users, Building, 
  Activity, BarChart, Globe, Filter, Calendar, Award, Bookmark, 
  TrendingUp, Compass, Cpu, Database, FileCode, Layers, Sliders
} from 'lucide-react';
import { 
  searchRepositories, 
  getTrendingRepositories, 
  getTopicRepositories,
  getRecommendedRepositories,
  getPopularTopics,
  searchUserRepositories,
  searchOrganizationRepositories,
  getSimilarRepositories,
  GitHubRepo 
} from '../utils/github';
import {
  getAdvancedSearch,
  getEcosystemProjects,
  getRecentlyUpdatedRepositories,
  getMostActiveRepositories,
  getRepositoryRecommendations
} from '../utils/githubExtended';

interface GitHubDiscoveryProps {
  onSelectRepo: (repo: GitHubRepo) => void;
  currentRepo?: { owner: string; name: string } | null;
  initialActiveTab?: 'search' | 'trending' | 'topics' | 'recommended' | 'user' | 'org' | 'similar' | 
    'ecosystem' | 'recent' | 'active' | 'advanced' | 'discover';
  containerClassName?: string;
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

export default function GitHubDiscovery({ 
  onSelectRepo, 
  currentRepo, 
  initialActiveTab,
  containerClassName = ''
}: GitHubDiscoveryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useState('All');
  const [timePeriod, setTimePeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [repositories, setRepositories] = useState<GitHubRepo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    'search' | 'trending' | 'topics' | 'recommended' | 'user' | 'org' | 'similar' | 
    'ecosystem' | 'recent' | 'active' | 'advanced' | 'discover'
  >(initialActiveTab || 'trending');
  const [popularTopics, setPopularTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState('');
  const [userInterests, setUserInterests] = useState<string[]>([]);
  const [username, setUsername] = useState('');
  const [orgName, setOrgName] = useState('');
  const [insightMetrics, setInsightMetrics] = useState<{
    totalStars: number;
    totalForks: number;
    avgStars: number;
    topLanguage: string;
  }>({
    totalStars: 0,
    totalForks: 0,
    avgStars: 0,
    topLanguage: ''
  });

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

  useEffect(() => {
    if (activeTab === 'similar' && currentRepo) {
      fetchSimilarRepos();
    }
  }, [currentRepo, activeTab]);

  useEffect(() => {
    if (repositories.length > 0) {
      calculateInsights();
    }
  }, [repositories]);

  const calculateInsights = () => {
    const totalStars = repositories.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    const totalForks = repositories.reduce((sum, repo) => sum + repo.forks_count, 0);
    const avgStars = Math.round(totalStars / repositories.length);
    
    // Find the most common language
    const languageCounts: Record<string, number> = {};
    repositories.forEach(repo => {
      if (repo.language) {
        languageCounts[repo.language] = (languageCounts[repo.language] || 0) + 1;
      }
    });
    
    let topLanguage = '';
    let maxCount = 0;
    Object.entries(languageCounts).forEach(([lang, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topLanguage = lang;
      }
    });
    
    setInsightMetrics({
      totalStars,
      totalForks,
      avgStars,
      topLanguage
    });
  };

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

  const fetchUserRepos = async () => {
    if (!username.trim()) return;
    setIsLoading(true);
    const repos = await searchUserRepositories(username);
    setRepositories(repos);
    setIsLoading(false);
  };

  const fetchOrgRepos = async () => {
    if (!orgName.trim()) return;
    setIsLoading(true);
    const repos = await searchOrganizationRepositories(orgName);
    setRepositories(repos);
    setIsLoading(false);
  };

  const fetchSimilarRepos = async () => {
    if (!currentRepo) return;
    setIsLoading(true);
    const repos = await getSimilarRepositories(currentRepo.owner, currentRepo.name);
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
      if (activeTab === 'search') {
        handleSearch();
      } else if (activeTab === 'user') {
        fetchUserRepos();
      } else if (activeTab === 'org') {
        fetchOrgRepos();
      }
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
    <div className={`space-y-6 ${containerClassName}`}>
      {/* Tabs */}
      <div className="flex flex-wrap space-x-2 border-b border-gray-700/30">
        <button
          onClick={() => setActiveTab('trending')}
          className={`pb-2 px-4 transition-colors flex items-center space-x-2 ${
            activeTab === 'trending'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
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
          onClick={() => setActiveTab('user')}
          className={`pb-2 px-4 transition-colors flex items-center space-x-2 ${
            activeTab === 'user'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User</span>
        </button>
        <button
          onClick={() => setActiveTab('org')}
          className={`pb-2 px-4 transition-colors flex items-center space-x-2 ${
            activeTab === 'org'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Building className="w-4 h-4" />
          <span>Organization</span>
        </button>
        {currentRepo && (
          <button
            onClick={() => setActiveTab('similar')}
            className={`pb-2 px-4 transition-colors flex items-center space-x-2 ${
              activeTab === 'similar'
                ? 'text-purple-400 border-b-2 border-purple-400'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Similar</span>
          </button>
        )}
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

        {activeTab === 'user' && (
          <div className="flex-1">
            <div className="relative">
              <Users className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Enter GitHub username..."
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                className="search-input"
              />
            </div>
          </div>
        )}

        {activeTab === 'org' && (
          <div className="flex-1">
            <div className="relative">
              <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Enter organization name..."
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
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

        {activeTab === 'similar' && currentRepo && (
          <div className="w-full">
            <div className="glass-card p-4 rounded-xl">
              <h3 className="text-lg font-semibold mb-2">Finding repositories similar to:</h3>
              <div className="flex items-center space-x-2">
                <span className="text-indigo-400 font-medium">{currentRepo.owner}/{currentRepo.name}</span>
                <button 
                  onClick={fetchSimilarRepos}
                  className="btn-secondary text-sm py-1"
                >
                  <Zap className="w-4 h-4" />
                  <span>Refresh</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Insights */}
      {repositories.length > 0 && (
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center mb-3">
            <BarChart className="w-5 h-5 text-purple-400 mr-2" />
            <h3 className="text-lg font-semibold">Repository Insights</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="glass-card p-3 rounded-lg">
              <div className="text-sm text-gray-400">Total Stars</div>
              <div className="text-xl font-bold text-yellow-400">{insightMetrics.totalStars.toLocaleString()}</div>
            </div>
            <div className="glass-card p-3 rounded-lg">
              <div className="text-sm text-gray-400">Total Forks</div>
              <div className="text-xl font-bold text-blue-400">{insightMetrics.totalForks.toLocaleString()}</div>
            </div>
            <div className="glass-card p-3 rounded-lg">
              <div className="text-sm text-gray-400">Avg. Stars</div>
              <div className="text-xl font-bold text-green-400">{insightMetrics.avgStars.toLocaleString()}</div>
            </div>
            <div className="glass-card p-3 rounded-lg">
              <div className="text-sm text-gray-400">Top Language</div>
              <div className="text-xl font-bold text-purple-400">{insightMetrics.topLanguage || 'N/A'}</div>
            </div>
          </div>
        </div>
      )}

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
                <div>
                  <h3 className="text-lg font-semibold text-white">{repo.name}</h3>
                  <div className="text-xs text-gray-400">by {repo.owner.login}</div>
                </div>
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