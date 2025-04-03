import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Save, 
  FolderSync, 
  Trash2, 
  Tag, 
  GitFork, 
  Star, 
  Eye, 
  Activity, 
  Clock, 
  Code, 
  FileText, 
  Folder, 
  Book, 
  ChevronRight, 
  ChevronDown,
  ExternalLink,
  GitBranch as Branch,
  GitCommit,
  Users
} from 'lucide-react';
import { getReadme, getRepoContents, getSymbolTree, SymbolTreeItem } from '../utils/github';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

type Project = {
  id: string;
  name: string;
  description: string;
  category: string;
  url: string;
  logo?: string;
  owner: string;
  stats: {
    stars: number;
    forks: number;
    watchers: number;
    issues: number;
  };
  lastActivity: string;
  contributors: number;
  branches: number;
  commits: number;
  pullRequests: number;
  categories: any[];
  languages: { name: string; percentage: number }[];
  topics: string[];
  license?: string;
  size?: number;
  lastRelease?: {
    name: string;
    published_at: string;
    url: string;
  };
  homepage?: string;
};

interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: FileTreeItem[];
  expanded?: boolean;
}

interface UnifiedProjectViewProps {
  project: Project;
  onBack: () => void;
  onCategoryDialogOpen: () => void;
  onRemoveProject: (id: string) => void;
}

export default function UnifiedProjectView({ 
  project, 
  onBack, 
  onCategoryDialogOpen,
  onRemoveProject
}: UnifiedProjectViewProps) {
  const [activeLeftTab, setActiveLeftTab] = useState<'files' | 'symbols'>('files');
  const [activeRightTab, setActiveRightTab] = useState<'readme' | 'details'>('readme');
  const [readme, setReadme] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [symbolTree, setSymbolTree] = useState<SymbolTreeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string; name: string } | null>(null);

  useEffect(() => {
    const fetchProjectData = async () => {
      setIsLoading(true);
      try {
        // Fetch README
        const readmeContent = await getReadme(project.owner, project.name);
        setReadme(readmeContent);
        
        // Fetch root directory contents
        const rootContents = await getRepoContents(project.owner, project.name, '');
        setFileTree(rootContents.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          expanded: false,
          children: item.type === 'dir' ? [] : undefined
        })));

        // Fetch symbol tree
        const symbols = await getSymbolTree(project.owner, project.name);
        setSymbolTree(symbols);
      } catch (error) {
        console.error('Error fetching project data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProjectData();
  }, [project.owner, project.name]);

  const toggleDirectory = async (item: FileTreeItem, index: number, parentPath: string[] = []) => {
    if (item.type !== 'dir') return;

    const newFileTree = [...fileTree];
    let currentLevel = newFileTree;
    let currentItem = item;

    // Navigate to the correct level in the tree
    for (const pathPart of parentPath) {
      const foundIndex = currentLevel.findIndex(i => i.name === pathPart);
      if (foundIndex !== -1 && currentLevel[foundIndex].children) {
        currentLevel = currentLevel[foundIndex].children!;
      }
    }

    const itemIndex = parentPath.length === 0 ? index : currentLevel.findIndex(i => i.name === item.name);
    
    // Toggle expanded state
    currentLevel[itemIndex].expanded = !currentLevel[itemIndex].expanded;
    
    // If expanding and no children loaded yet, fetch them
    if (currentLevel[itemIndex].expanded && (!currentLevel[itemIndex].children || currentLevel[itemIndex].children.length === 0)) {
      try {
        const contents = await getRepoContents(project.owner, project.name, currentLevel[itemIndex].path);
        currentLevel[itemIndex].children = contents.map(content => ({
          name: content.name,
          path: content.path,
          type: content.type,
          expanded: false,
          children: content.type === 'dir' ? [] : undefined
        }));
      } catch (error) {
        console.error('Error fetching directory contents:', error);
      }
    }
    
    setFileTree(newFileTree);
  };

  const handleFileClick = async (item: FileTreeItem) => {
    if (item.type === 'file') {
      try {
        const fileContent = await getRepoContents(project.owner, project.name, item.path, true);
        setSelectedFile({
          path: item.path,
          content: fileContent,
          name: item.name
        });
        setActiveRightTab('details'); // Switch to file view when a file is selected
      } catch (error) {
        console.error('Error fetching file content:', error);
      }
    }
  };

  const renderFileTree = (items: FileTreeItem[], parentPath: string[] = []) => {
    return (
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={item.path} className="select-none">
            <div 
              className={`flex items-center py-1.5 px-2 rounded-md hover:bg-gray-700/50 cursor-pointer transition-colors duration-150 ${
                selectedFile?.path === item.path ? 'bg-indigo-600/20 text-indigo-300 border-l-2 border-indigo-400' : ''
              }`}
              onClick={() => item.type === 'dir' 
                ? toggleDirectory(item, index, parentPath) 
                : handleFileClick(item)
              }
            >
              {item.type === 'dir' && (
                item.expanded 
                  ? <ChevronDown className="w-4 h-4 mr-1 text-indigo-400 transition-transform duration-200" /> 
                  : <ChevronRight className="w-4 h-4 mr-1 text-gray-400 transition-transform duration-200" />
              )}
              {item.type === 'dir' 
                ? <Folder className={`w-4 h-4 mr-2 ${item.expanded ? 'text-indigo-400' : 'text-blue-400'}`} /> 
                : <FileText className="w-4 h-4 mr-2 text-gray-400" />
              }
              <span className="text-sm truncate">{item.name}</span>
            </div>
            {item.type === 'dir' && item.expanded && item.children && (
              <div className="ml-4 pl-2 border-l border-gray-700/50 mt-1">
                {renderFileTree(item.children, [...parentPath, item.name])}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  const renderSymbolTree = (items: SymbolTreeItem[]) => {
    return (
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={`${item.name}-${index}`} className="select-none">
            <div 
              className="flex items-center py-1.5 px-2 rounded-md hover:bg-gray-700/50 cursor-pointer transition-colors duration-150"
            >
              <Code className="w-4 h-4 mr-2 text-indigo-400" />
              <span className="text-sm truncate">{item.name}</span>
              <span className="ml-2 text-xs text-gray-500">{item.kind}</span>
            </div>
            {item.children && item.children.length > 0 && (
              <div className="ml-4 pl-2 border-l border-gray-700/50 mt-1">
                {renderSymbolTree(item.children)}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  const getLanguageColor = (language: string): string => {
    const colors: Record<string, string> = {
      JavaScript: '#f1e05a',
      TypeScript: '#3178c6',
      Python: '#3572A5',
      Java: '#b07219',
      Go: '#00ADD8',
      Rust: '#dea584',
      'C++': '#f34b7d',
      PHP: '#4F5D95',
      Ruby: '#701516',
      HTML: '#e34c26',
      CSS: '#563d7c',
      Shell: '#89e051',
      Swift: '#ffac45',
      Kotlin: '#A97BFF',
      Dart: '#00B4AB',
      C: '#555555',
      'C#': '#178600'
    };
    
    return colors[language] || '#8257e5'; // Default purple color
  };

  const getFileExtension = (filename: string): string => {
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="btn-secondary"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              {project.logo && (
                <img 
                  src={project.logo} 
                  alt={`${project.name} logo`} 
                  className="w-8 h-8 rounded-lg mr-3"
                />
              )}
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                {project.name}
              </span>
            </h1>
            <div className="text-sm text-gray-400">by {project.owner}</div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1 px-3 py-2 rounded-lg bg-gray-800/50">
            <Star className="w-5 h-5 text-yellow-400" />
            <span className="font-semibold">{project.stats.stars.toLocaleString()}</span>
          </div>

          <a 
            href={project.url} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="btn-secondary"
          >
            <span>View on GitHub</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Main content */}
      <div className="grid grid-cols-4 gap-6 h-[calc(100vh-14rem)]">
        {/* Left sidebar: File/Symbol Tree */}
        <div className="glass-card rounded-xl p-4 overflow-hidden flex flex-col col-span-1">
          <div className="flex items-center justify-between mb-3">
            <div className="flex space-x-2">
              <button 
                className={`p-1.5 rounded-md transition-colors ${
                  activeLeftTab === 'files' 
                    ? 'bg-indigo-600/20 text-indigo-300' 
                    : 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveLeftTab('files')}
                title="File Tree"
              >
                <Folder className="w-5 h-5" />
              </button>
              <button 
                className={`p-1.5 rounded-md transition-colors ${
                  activeLeftTab === 'symbols' 
                    ? 'bg-indigo-600/20 text-indigo-300' 
                    : 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveLeftTab('symbols')}
                title="Symbol Tree"
              >
                <Code className="w-5 h-5" />
              </button>
            </div>

            <button
              onClick={onCategoryDialogOpen}
              className="p-1.5 rounded-md hover:bg-gray-700/50 text-gray-400 hover:text-white transition-colors"
              title="Manage Categories"
            >
              <Tag className="w-5 h-5" />
            </button>
          </div>

          <div className="overflow-y-auto flex-grow border border-gray-700/30 rounded-lg bg-gray-800/20 p-2">
            {isLoading ? (
              <div className="text-gray-400 text-sm flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500 mr-2"></div>
                Loading...
              </div>
            ) : activeLeftTab === 'files' ? (
              fileTree.length > 0 ? (
                renderFileTree(fileTree)
              ) : (
                <div className="text-gray-400 text-sm flex items-center justify-center h-full">
                  No files available
                </div>
              )
            ) : (
              symbolTree.length > 0 ? (
                renderSymbolTree(symbolTree)
              ) : (
                <div className="text-gray-400 text-sm flex items-center justify-center h-full">
                  No symbol information available
                </div>
              )
            )}
          </div>

          {/* Project categories */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium">Categories</h3>
              <button
                onClick={onCategoryDialogOpen}
                className="text-xs text-indigo-400 hover:text-indigo-300"
              >
                Manage
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {project.categories && project.categories.length > 0 ? (
                project.categories.map(category => (
                  <div
                    key={category.id}
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${category.color}20`,
                      color: category.color,
                      border: `1px solid ${category.color}40`,
                    }}
                  >
                    {category.name}
                  </div>
                ))
              ) : (
                <span className="text-xs text-gray-400">No categories assigned</span>
              )}
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="glass-card rounded-xl p-4 col-span-3 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveRightTab('readme')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeRightTab === 'readme' 
                    ? 'bg-indigo-600/20 text-indigo-300' 
                    : 'hover:bg-gray-700/50 text-gray-400'
                }`}
              >
                <div className="flex items-center">
                  <Book className="w-4 h-4 mr-2" />
                  README
                </div>
              </button>
              {selectedFile && (
                <button
                  onClick={() => setActiveRightTab('details')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeRightTab === 'details' 
                      ? 'bg-indigo-600/20 text-indigo-300' 
                      : 'hover:bg-gray-700/50 text-gray-400'
                  }`}
                >
                  <div className="flex items-center">
                    <FileText className="w-4 h-4 mr-2" />
                    {selectedFile.name}
                  </div>
                </button>
              )}
            </div>

            <div className="flex items-center space-x-2">
              <button className="btn-primary">
                <Save className="w-5 h-5" />
                <span>Save Locally</span>
              </button>
              <button className="btn-secondary">
                <FolderSync className="w-5 h-5" />
                <span>Sync</span>
              </button>
              <button 
                onClick={() => onRemoveProject(project.id)}
                className="btn-danger"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto flex-grow">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : activeRightTab === 'readme' ? (
              readme ? (
                <div className="markdown-body prose prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: readme }} />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
                  <Book className="w-16 h-16 text-gray-600 mb-4" />
                  <p className="text-lg">No README found for this repository</p>
                  <p className="text-sm mt-2">The repository might not have a README file, or it's stored in a different location</p>
                </div>
              )
            ) : selectedFile ? (
              <div className="text-sm">
                <SyntaxHighlighter
                  language={getLanguageFromExtension(getFileExtension(selectedFile.name))}
                  style={atomDark}
                  customStyle={{ background: 'transparent', padding: '1rem' }}
                  showLineNumbers
                >
                  {selectedFile.content}
                </SyntaxHighlighter>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-10 text-gray-400">
                <FileText className="w-16 h-16 text-gray-600 mb-4" />
                <p className="text-lg">No file selected</p>
                <p className="text-sm mt-2">Select a file from the file tree to view its contents</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Project Stats */}
      <div className="glass-card p-4 rounded-xl">
        <h2 className="text-lg font-semibold mb-4">Project Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="stat-card">
            <div className="text-sm text-gray-400">Stars</div>
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-400 mr-2" />
              <span className="text-xl font-bold">{project.stats.stars.toLocaleString()}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="text-sm text-gray-400">Forks</div>
            <div className="flex items-center">
              <GitFork className="w-4 h-4 text-blue-400 mr-2" />
              <span className="text-xl font-bold">{project.stats.forks.toLocaleString()}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="text-sm text-gray-400">Watchers</div>
            <div className="flex items-center">
              <Eye className="w-4 h-4 text-green-400 mr-2" />
              <span className="text-xl font-bold">{project.stats.watchers.toLocaleString()}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="text-sm text-gray-400">Issues</div>
            <div className="flex items-center">
              <Activity className="w-4 h-4 text-red-400 mr-2" />
              <span className="text-xl font-bold">{project.stats.issues.toLocaleString()}</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="text-sm text-gray-400">Last Activity</div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 text-purple-400 mr-2" />
              <span className="text-xl font-bold">{new Date(project.lastActivity).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6">
          <h3 className="text-md font-semibold mb-2">Languages</h3>
          <div className="flex h-4 rounded-full overflow-hidden">
            {project.languages.slice(0, 10).map((lang, index) => (
              <div
                key={index}
                className="h-full"
                style={{
                  width: `${lang.percentage}%`,
                  backgroundColor: getLanguageColor(lang.name)
                }}
                title={`${lang.name}: ${lang.percentage}%`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
            {project.languages.map(lang => (
              <div key={lang.name} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">{lang.name}</span>
                  <span className="text-gray-400">{lang.percentage}%</span>
                </div>
                <div className="progress-bar">
                  <div 
                    className="progress-value"
                    style={{ 
                      width: `${lang.percentage}%`,
                      backgroundColor: getLanguageColor(lang.name)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
} 