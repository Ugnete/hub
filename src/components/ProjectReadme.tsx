import React, { useState, useEffect } from 'react';
import { File, Folder, ChevronRight, ChevronDown, ArrowLeft, ExternalLink, Code, FileText, BookOpen, GitBranch, Hash, Box, Layers } from 'lucide-react';
import { getReadme, getRepoContents, getSymbolTree, SymbolTreeItem } from '../utils/github';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface ProjectReadmeProps {
  owner: string;
  repo: string;
  onBack: () => void;
}

interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'dir';
  children?: FileTreeItem[];
  expanded?: boolean;
}

const ProjectReadme: React.FC<ProjectReadmeProps> = ({ owner, repo, onBack }) => {
  const [readme, setReadme] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [symbolTree, setSymbolTree] = useState<SymbolTreeItem[]>([]);
  const [selectedFile, setSelectedFile] = useState<{ path: string; content: string; name: string } | null>(null);
  const [activeView, setActiveView] = useState<'readme' | 'file'>('readme');
  const [activeTreeView, setActiveTreeView] = useState<'files' | 'symbols'>('files');

  useEffect(() => {
    const fetchReadme = async () => {
      setIsLoading(true);
      try {
        const readmeContent = await getReadme(owner, repo);
        setReadme(readmeContent);
        
        // Fetch root directory contents
        const rootContents = await getRepoContents(owner, repo, '');
        setFileTree(rootContents.map(item => ({
          name: item.name,
          path: item.path,
          type: item.type,
          expanded: false,
          children: item.type === 'dir' ? [] : undefined
        })));

        // Fetch symbol tree (mock implementation)
        const symbols = await getSymbolTree(owner, repo);
        setSymbolTree(symbols);
      } catch (error) {
        console.error('Error fetching readme:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReadme();
  }, [owner, repo]);

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
        const contents = await getRepoContents(owner, repo, currentLevel[itemIndex].path);
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
        const fileContent = await getRepoContents(owner, repo, item.path, true);
        setSelectedFile({
          path: item.path,
          content: fileContent,
          name: item.name
        });
        setActiveView('file');
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
                : <File className="w-4 h-4 mr-2 text-gray-400" />
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
          <li key={`${item.path}-${item.line}-${index}`} className="select-none">
            <div 
              className="flex items-center py-1.5 px-2 rounded-md hover:bg-gray-700/50 cursor-pointer transition-colors duration-150"
              onClick={() => {
                // In a real implementation, this would navigate to the file and line
                console.log(`Navigate to ${item.path}:${item.line}`);
              }}
            >
              {item.children && item.children.length > 0 && (
                <ChevronRight className="w-4 h-4 mr-1 text-gray-400" />
              )}
              {getSymbolIcon(item.kind)}
              <span className="text-sm truncate ml-2">{item.name}</span>
              <span className="text-xs text-gray-500 ml-auto">{getSymbolKindLabel(item.kind)}</span>
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

  const getSymbolIcon = (kind: string) => {
    switch (kind) {
      case 'class':
        return <Box className="w-4 h-4 text-purple-400" />;
      case 'function':
        return <Code className="w-4 h-4 text-green-400" />;
      case 'variable':
        return <Hash className="w-4 h-4 text-blue-400" />;
      case 'interface':
        return <Layers className="w-4 h-4 text-yellow-400" />;
      case 'enum':
        return <GitBranch className="w-4 h-4 text-red-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getSymbolKindLabel = (kind: string): string => {
    return kind.charAt(0).toUpperCase() + kind.slice(1);
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

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={onBack}
          className="btn-secondary"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Project</span>
        </button>
        <div className="flex items-center space-x-3">
          <a 
            href={`https://github.com/${owner}/${repo}`} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 transition-colors"
          >
            <span>View on GitHub</span>
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-6 h-[calc(100vh-12rem)]">
        {/* File/Symbol Tree */}
        <div className="glass-card rounded-xl p-4 overflow-hidden flex flex-col col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold flex items-center">
              <Code className="w-5 h-5 mr-2 text-indigo-400" />
              Repository Explorer
            </h3>
            <div className="flex space-x-2">
              <button 
                className={`p-1.5 rounded-md transition-colors ${
                  activeTreeView === 'files' 
                    ? 'bg-indigo-600/20 text-indigo-300' 
                    : 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTreeView('files')}
                title="File Tree"
              >
                <Folder className="w-4 h-4" />
              </button>
              <button 
                className={`p-1.5 rounded-md transition-colors ${
                  activeTreeView === 'symbols' 
                    ? 'bg-indigo-600/20 text-indigo-300' 
                    : 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                }`}
                onClick={() => setActiveTreeView('symbols')}
                title="Symbol Tree"
              >
                <Code className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="overflow-y-auto flex-grow border border-gray-700/30 rounded-lg bg-gray-800/20 p-2">
            {activeTreeView === 'files' ? (
              fileTree.length > 0 ? (
                renderFileTree(fileTree)
              ) : (
                <div className="text-gray-400 text-sm flex items-center justify-center h-full">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500 mr-2"></div>
                  Loading file structure...
                </div>
              )
            ) : (
              symbolTree.length > 0 ? (
                renderSymbolTree(symbolTree)
              ) : (
                <div className="text-gray-400 text-sm flex items-center justify-center h-full">
                  <div className="flex flex-col items-center">
                    <Code className="w-8 h-8 text-gray-500 mb-2" />
                    <p>No symbol information available</p>
                    <p className="text-xs mt-2">Select a file to view its symbols</p>
                  </div>
                </div>
              )
            )}
          </div>
        </div>

        {/* Content Area */}
        <div className="glass-card rounded-xl p-4 col-span-4 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <div className="flex space-x-4">
              <button
                onClick={() => setActiveView('readme')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  activeView === 'readme' 
                    ? 'bg-indigo-600/20 text-indigo-300' 
                    : 'hover:bg-gray-700/50 text-gray-400'
                }`}
              >
                <div className="flex items-center">
                  <BookOpen className="w-4 h-4 mr-2" />
                  README
                </div>
              </button>
              {selectedFile && (
                <button
                  onClick={() => setActiveView('file')}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    activeView === 'file' 
                      ? 'bg-indigo-600/20 text-indigo-300' 
                      : 'hover:bg-gray-700/50 text-gray-400'
                  }`}
                >
                  <div className="flex items-center">
                    <File className="w-4 h-4 mr-2" />
                    {selectedFile.name}
                  </div>
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto flex-grow">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
              </div>
            ) : activeView === 'readme' ? (
              readme ? (
                <div className="markdown-body prose prose-invert max-w-none">
                  <div dangerouslySetInnerHTML={{ __html: readme }} />
                </div>
              ) : (
                <div className="text-gray-400 flex items-center justify-center h-full">
                  No README found for this repository
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
              <div className="text-gray-400 flex items-center justify-center h-full">
                Select a file from the file tree to view its contents
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectReadme;