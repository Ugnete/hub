import React from 'react';
import { GitFork, Star, Eye, ExternalLink } from 'lucide-react';
import { GitHubRepo } from '../utils/github';

interface RelatedReposProps {
  repos: GitHubRepo[];
  title: string;
  emptyMessage: string;
  onSelectRepo?: (repo: GitHubRepo) => void;
}

const RelatedRepos: React.FC<RelatedReposProps> = ({ 
  repos, 
  title, 
  emptyMessage,
  onSelectRepo 
}) => {
  if (!repos || repos.length === 0) {
    return (
      <div className="glass-card p-4 rounded-xl">
        <h3 className="text-lg font-semibold mb-2">{title}</h3>
        <p className="text-gray-400 text-sm">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 rounded-xl">
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <div className="space-y-3">
        {repos.map(repo => (
          <div 
            key={repo.id}
            className="border border-gray-700/30 rounded-lg p-3 hover:bg-gray-800/50 transition-all duration-200 cursor-pointer"
            onClick={() => onSelectRepo && onSelectRepo(repo)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img 
                  src={repo.owner.avatar_url} 
                  alt={`${repo.owner.login}'s avatar`}
                  className="w-6 h-6 rounded-full"
                />
                <h4 className="font-medium text-indigo-300">{repo.name}</h4>
              </div>
              <a 
                href={repo.html_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-400 hover:text-white transition-colors"
                onClick={e => e.stopPropagation()}
              >
                <ExternalLink size={16} />
              </a>
            </div>
            
            <p className="text-sm text-gray-400 mt-2 line-clamp-2">{repo.description}</p>
            
            <div className="flex items-center space-x-4 mt-3 text-xs text-gray-500">
              <div className="flex items-center space-x-1">
                <Star className="w-3.5 h-3.5 text-yellow-400" />
                <span>{repo.stargazers_count.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <GitFork className="w-3.5 h-3.5 text-blue-400" />
                <span>{repo.forks_count.toLocaleString()}</span>
              </div>
              <div className="flex items-center space-x-1">
                <Eye className="w-3.5 h-3.5 text-green-400" />
                <span>{repo.watchers_count.toLocaleString()}</span>
              </div>
              {repo.language && (
                <span className="px-1.5 py-0.5 bg-purple-500/20 text-purple-300 rounded-full">
                  {repo.language}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default RelatedRepos;