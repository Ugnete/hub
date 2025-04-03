import React from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import GitHubSearch from './GitHubSearch';
import { GitHubRepo, getRepoDetails } from '../utils/github';
import { X } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

interface AddProjectDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAddProject: (project: any) => void;
}

export default function AddProjectDialog({ isOpen, onClose, onAddProject }: AddProjectDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSelectRepo = async (repo: GitHubRepo) => {
    setIsLoading(true);
    
    try {
      const [owner, repoName] = repo.full_name.split('/');
      
      const details = await getRepoDetails(owner, repoName);
      
      const totalBytes = Object.values(details.languages).reduce((sum, bytes) => sum + bytes, 0);
      const languages = Object.entries(details.languages).map(([name, bytes]) => ({
        name,
        percentage: Math.round((bytes / totalBytes) * 100)
      })).sort((a, b) => b.percentage - a.percentage);
      
      const project = {
        id: repo.id.toString(),
        name: repo.name,
        description: repo.description || '',
        category: '',
        url: repo.html_url,
        logo: repo.owner.avatar_url,
        owner: repo.owner.login,
        stats: {
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          watchers: repo.watchers_count,
          issues: repo.open_issues_count
        },
        lastActivity: repo.updated_at,
        contributors: details.contributors,
        branches: details.branches,
        commits: details.commits,
        pullRequests: details.pullRequests,
        categories: [],
        languages: languages,
        topics: details.topics || [],
        license: repo.license?.name,
        size: repo.size,
        lastRelease: details.lastRelease ? {
          name: details.lastRelease.name,
          published_at: details.lastRelease.published_at,
          url: details.lastRelease.html_url
        } : undefined,
        homepage: repo.homepage
      };

      onAddProject(project);
      onClose();
    } catch (error) {
      console.error('Error adding project:', error);
      
      const project = {
        id: repo.id.toString(),
        name: repo.name,
        description: repo.description || '',
        category: '',
        url: repo.html_url,
        logo: repo.owner.avatar_url,
        owner: repo.owner.login,
        stats: {
          stars: repo.stargazers_count,
          forks: repo.forks_count,
          watchers: repo.watchers_count,
          issues: repo.open_issues_count
        },
        lastActivity: repo.updated_at,
        contributors: 0,
        branches: 0,
        commits: 0,
        pullRequests: 0,
        categories: [],
        languages: [{ name: repo.language || 'Unknown', percentage: 100 }],
        topics: repo.topics || [],
        license: repo.license?.name,
        size: repo.size,
        homepage: repo.homepage
      };
      
      onAddProject(project);
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/80" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-xl p-6 text-left align-middle shadow-xl transition-all border border-gray-700/50">
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium text-white">
                    Add GitHub Project
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {isLoading ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    <p className="ml-3 text-gray-300">Fetching project details...</p>
                  </div>
                ) : (
                  <GitHubSearch onSelectRepo={handleSelectRepo} />
                )}
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}