import React, { useState, useEffect } from 'react';
import { 
  Search, BookOpen, Book, FileText, FolderOpen, Bookmark, Star, Clock, Tag, Archive, 
  Globe, Code, Youtube, File, Database, Plus, Trash2, Edit2, Download, RefreshCw,
  Folder, Save, List, Grid, Filter, HardDrive, ChevronRight, ChevronDown, X, PlayCircle
} from 'lucide-react';
import SearchBar from '../components/SearchBar';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { v4 as uuidv4 } from 'uuid';
import EnhancedCategoryDialog from '../components/EnhancedCategoryDialog'; // instead of CategoryDialog

// Mock data types
interface Knowledgebase {
  id: string;
  name: string;
  category: 'website' | 'codebase' | 'youtube' | 'text' | 'document' | 'codefile';
  dateCreated: string;
  dateModified: string;
  description?: string;
  source: string;
  size?: number;
  isFavorite: boolean;
  path: string;
  thumbnail?: string;
  categories?: string[];
}

interface Index {
  id: string;
  name: string;
  description?: string;
  dateCreated: string;
  dateModified: string;
  knowledgebaseIds: string[];
  isExpanded?: boolean;
}

// Add this new interface for Category
interface Category {
  id: string;
  name: string;
  color: string;
}

export default function KnowledgebasePage() {
  // States for knowledgebases
  const [knowledgebases, setKnowledgebases] = useState<Knowledgebase[]>([
    {
      id: '1',
      name: 'React Documentation',
      category: 'website',
      dateCreated: '2023-06-15',
      dateModified: '2023-07-20',
      description: 'Official React documentation website',
      source: 'https://react.dev',
      size: 15.4,
      isFavorite: true,
      path: '/knowledgebases/React_Documentation_website.jsonl',
      thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/React-icon.svg/1200px-React-icon.svg.png'
    },
    {
      id: '2',
      name: 'TypeScript Handbook',
      category: 'document',
      dateCreated: '2023-05-10',
      dateModified: '2023-07-18',
      description: 'TypeScript programming language handbook',
      source: 'https://www.typescriptlang.org/docs/',
      size: 8.2,
      isFavorite: false,
      path: '/knowledgebases/TypeScript_Handbook_document.jsonl'
    },
    {
      id: '3',
      name: 'NextJS Tutorial',
      category: 'youtube',
      dateCreated: '2023-04-05',
      dateModified: '2023-04-05',
      description: 'Complete NextJS tutorial by Vercel',
      source: 'https://www.youtube.com/watch?v=__mSgDEOyv8',
      size: 450,
      isFavorite: true,
      path: '/knowledgebases/NextJS_Tutorial_youtube.jsonl',
      thumbnail: 'https://i.ytimg.com/vi/__mSgDEOyv8/maxresdefault.jpg'
    },
    {
      id: '4',
      name: 'OpenManus Project',
      category: 'codebase',
      dateCreated: '2023-07-01',
      dateModified: '2023-08-15',
      description: 'OpenManus GitHub repository code',
      source: 'https://github.com/mannaandpoem/openmanus',
      size: 64.3,
      isFavorite: true,
      path: '/knowledgebases/OpenManus_codebase.jsonl'
    }
  ]);

  // States for indexes
  const [indexes, setIndexes] = useState<Index[]>([
    {
      id: '1',
      name: 'Frontend Development',
      description: 'Resources for frontend development',
      dateCreated: '2023-06-20',
      dateModified: '2023-08-10',
      knowledgebaseIds: ['1', '2', '3'],
      isExpanded: false
    },
    {
      id: '2',
      name: 'AI Projects',
      description: 'AI-related projects and documentation',
      dateCreated: '2023-07-05',
      dateModified: '2023-08-12',
      knowledgebaseIds: ['4'],
      isExpanded: false
    }
  ]);

  // UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'knowledgebases' | 'indexes'>('knowledgebases');
  const [displayMode, setDisplayMode] = useState<'grid' | 'list'>('grid');
  
  // Dialog states
  const [isAddKnowledgebaseDialogOpen, setIsAddKnowledgebaseDialogOpen] = useState(false);
  const [isAddIndexDialogOpen, setIsAddIndexDialogOpen] = useState(false);
  const [isDeleteConfirmDialogOpen, setIsDeleteConfirmDialogOpen] = useState(false);
  const [selectedItemForDeletion, setSelectedItemForDeletion] = useState<{id: string, type: 'knowledgebase' | 'index'} | null>(null);
  const [isWebFetcherDialogOpen, setIsWebFetcherDialogOpen] = useState(false);
  const [isIndexEditDialogOpen, setIsIndexEditDialogOpen] = useState(false);
  const [selectedIndexForEdit, setSelectedIndexForEdit] = useState<Index | null>(null);

  // Form states
  const [newKnowledgebaseCategory, setNewKnowledgebaseCategory] = useState<Knowledgebase['category']>('website');
  const [newKnowledgebaseName, setNewKnowledgebaseName] = useState('');
  const [newKnowledgebaseDescription, setNewKnowledgebaseDescription] = useState('');
  const [newKnowledgebaseSource, setNewKnowledgebaseSource] = useState('');
  
  const [newIndexName, setNewIndexName] = useState('');
  const [newIndexDescription, setNewIndexDescription] = useState('');
  const [newIndexKnowledgebases, setNewIndexKnowledgebases] = useState<string[]>([]);
  
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [isFetchingWebsite, setIsFetchingWebsite] = useState(false);
  const [websiteFetchProgress, setWebsiteFetchProgress] = useState(0);
  const [websiteFetchStatus, setWebsiteFetchStatus] = useState<'idle' | 'fetching' | 'complete' | 'error'>('idle');
  const [fetchedUrlsCount, setFetchedUrlsCount] = useState(0);
  const [totalUrlsCount, setTotalUrlsCount] = useState(0);

  // New states for file selection
  const [textContent, setTextContent] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<{name: string, size: number, path: string}[]>([]);
  const [selectedFolderPath, setSelectedFolderPath] = useState('');

  // Filtering logic
  const categories = [
    { id: 'all', name: 'All Items', icon: <HardDrive className="w-4 h-4 mr-1" /> },
    { id: 'website', name: 'Websites', icon: <Globe className="w-4 h-4 mr-1" /> },
    { id: 'codebase', name: 'Codebases', icon: <Code className="w-4 h-4 mr-1" /> },
    { id: 'youtube', name: 'YouTube Videos', icon: <Youtube className="w-4 h-4 mr-1" /> },
    { id: 'text', name: 'Text Files', icon: <FileText className="w-4 h-4 mr-1" /> },
    { id: 'document', name: 'Documents', icon: <Book className="w-4 h-4 mr-1" /> },
    { id: 'codefile', name: 'Code Files', icon: <File className="w-4 h-4 mr-1" /> },
    { id: 'favorites', name: 'Favorites', icon: <Star className="w-4 h-4 mr-1" /> }
  ];

  const filteredKnowledgebases = knowledgebases.filter(kb => {
    // Search query filter
    const matchesSearch = searchQuery === '' || 
      kb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (kb.description && kb.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      kb.source.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Category filter
    const matchesCategory = 
      !activeCategory || 
      activeCategory === 'all' || 
      (activeCategory === 'favorites' && kb.isFavorite) ||
      kb.category === activeCategory;
    
    return matchesSearch && matchesCategory;
  });

  // Helpers
  const getCategoryIcon = (category: Knowledgebase['category']) => {
    switch (category) {
      case 'website': return <Globe className="w-5 h-5 text-blue-400" />;
      case 'codebase': return <Code className="w-5 h-5 text-green-400" />;
      case 'youtube': return <Youtube className="w-5 h-5 text-red-400" />;
      case 'text': return <FileText className="w-5 h-5 text-gray-400" />;
      case 'document': return <Book className="w-5 h-5 text-amber-400" />;
      case 'codefile': return <File className="w-5 h-5 text-purple-400" />;
      default: return <BookOpen className="w-5 h-5 text-indigo-400" />;
    }
  };

  const formatSize = (size?: number) => {
    if (!size) return 'Unknown';
    if (size < 1024) return `${size.toFixed(1)} KB`;
    return `${(size / 1024).toFixed(1)} MB`;
  };

  // Handlers
  const toggleIndexExpansion = (indexId: string) => {
    setIndexes(prev => prev.map(index => 
      index.id === indexId ? { ...index, isExpanded: !index.isExpanded } : index
    ));
  };

  const toggleFavorite = (knowledgebaseId: string) => {
    setKnowledgebases(prev => prev.map(kb => 
      kb.id === knowledgebaseId ? { ...kb, isFavorite: !kb.isFavorite } : kb
    ));
  };

  const handleDeleteConfirm = () => {
    if (!selectedItemForDeletion) return;
    
    if (selectedItemForDeletion.type === 'knowledgebase') {
      setKnowledgebases(prev => prev.filter(kb => kb.id !== selectedItemForDeletion.id));
      
      // Remove from any indexes
      setIndexes(prev => prev.map(index => ({
        ...index,
        knowledgebaseIds: index.knowledgebaseIds.filter(id => id !== selectedItemForDeletion.id)
      })));
    } else {
      setIndexes(prev => prev.filter(index => index.id !== selectedItemForDeletion.id));
    }
    
    setIsDeleteConfirmDialogOpen(false);
    setSelectedItemForDeletion(null);
  };

  const simulateFileSelection = (forCategory: 'document' | 'codefile') => {
    // In a real application, this would use the browser's File API
    // Here we'll simulate a file picker dialog result
    
    const mockFiles = [
      { name: 'document1.pdf', size: 1.2, path: '/path/to/document1.pdf' },
      { name: 'notes.docx', size: 0.8, path: '/path/to/notes.docx' },
      { name: 'report.txt', size: 0.3, path: '/path/to/report.txt' },
      { name: 'code.js', size: 0.1, path: '/path/to/code.js' },
      { name: 'styles.css', size: 0.2, path: '/path/to/styles.css' },
    ];
    
    const filteredFiles = forCategory === 'document' 
      ? mockFiles.filter(f => f.name.endsWith('.pdf') || f.name.endsWith('.docx') || f.name.endsWith('.txt'))
      : mockFiles.filter(f => f.name.endsWith('.js') || f.name.endsWith('.css') || f.name.endsWith('.py'));
    
    setSelectedFiles(filteredFiles);
    setSelectedFolderPath('/path/to/selected/folder');
  };

  const clearFileSelection = () => {
    setSelectedFiles([]);
    setSelectedFolderPath('');
  };

  const handleAddKnowledgebase = () => {
    const newKnowledgebase: Knowledgebase = {
      id: uuidv4(),
      name: newKnowledgebaseName,
      category: newKnowledgebaseCategory,
      dateCreated: new Date().toISOString().split('T')[0],
      dateModified: new Date().toISOString().split('T')[0],
      description: newKnowledgebaseDescription,
      source: newKnowledgebaseSource,
      isFavorite: false,
      path: `/knowledgebases/${newKnowledgebaseName.replace(/\s+/g, '_')}_${newKnowledgebaseCategory}.jsonl`,
      size: 
        newKnowledgebaseCategory === 'text' 
          ? (textContent.length / 1024) // Approximate size in KB
          : selectedFiles.length > 0 
            ? selectedFiles.reduce((sum, file) => sum + file.size, 0)
            : undefined
    };
    
    // For text category, save the actual text content
    if (newKnowledgebaseCategory === 'text') {
      // In a real app, you'd probably store this in a backend
      console.log('Saving text content:', textContent);
      // You could add a content field to the Knowledgebase type
      // or store it separately indexed by knowledgebase ID
    }
    
    // For document and codefile, you'd handle the files
    if ((newKnowledgebaseCategory === 'document' || newKnowledgebaseCategory === 'codefile') && selectedFiles.length > 0) {
      // In a real app, you'd upload these files to a server or process them
      console.log('Selected files:', selectedFiles);
      console.log('Selected folder:', selectedFolderPath);
    }
    
    setKnowledgebases(prev => [...prev, newKnowledgebase]);
    setIsAddKnowledgebaseDialogOpen(false);
    
    // Reset form
    setNewKnowledgebaseName('');
    setNewKnowledgebaseDescription('');
    setNewKnowledgebaseSource('');
    setNewKnowledgebaseCategory('website');
    setTextContent('');
    clearFileSelection();
  };

  const handleAddIndex = () => {
    const newIndex: Index = {
      id: uuidv4(),
      name: newIndexName,
      description: newIndexDescription,
      dateCreated: new Date().toISOString().split('T')[0],
      dateModified: new Date().toISOString().split('T')[0],
      knowledgebaseIds: newIndexKnowledgebases,
      isExpanded: false
    };
    
    setIndexes(prev => [...prev, newIndex]);
    setIsAddIndexDialogOpen(false);
    
    // Reset form
    setNewIndexName('');
    setNewIndexDescription('');
    setNewIndexKnowledgebases([]);
  };

  const handleEditIndex = () => {
    if (!selectedIndexForEdit) return;
    
    setNewIndexName(selectedIndexForEdit.name);
    setNewIndexDescription(selectedIndexForEdit.description || '');
    setNewIndexKnowledgebases(selectedIndexForEdit.knowledgebaseIds);
    setIsIndexEditDialogOpen(true);
  };

  const handleStartIndexEdit = (index: Index) => {
    setSelectedIndexForEdit(index);
    setNewIndexName(index.name);
    setNewIndexDescription(index.description || '');
    setNewIndexKnowledgebases([...index.knowledgebaseIds]);
    setIsIndexEditDialogOpen(true);
  };

  const simulateFetchWebsite = () => {
    setIsFetchingWebsite(true);
    setWebsiteFetchStatus('fetching');
    setWebsiteFetchProgress(0);
    setFetchedUrlsCount(0);
    setTotalUrlsCount(Math.floor(Math.random() * 20) + 10); // Random number between 10-30
    
    // Simulate website crawling with progress updates
    const timer = setInterval(() => {
      setWebsiteFetchProgress(prev => {
        const newProgress = prev + Math.random() * 10;
        if (newProgress >= 100) {
          clearInterval(timer);
          setIsFetchingWebsite(false);
          setWebsiteFetchStatus('complete');
          return 100;
        }
        
        setFetchedUrlsCount(prev => Math.min(
          Math.floor((newProgress / 100) * totalUrlsCount), 
          totalUrlsCount
        ));
        
        return newProgress;
      });
    }, 500);
  };

  const handleSaveWebsiteKnowledgebase = () => {
    // Create a new knowledgebase entry from the fetched website
    const domainName = websiteUrl.replace(/^https?:\/\//, '').replace(/\/$/, '').split('/')[0];
    
    const newKnowledgebase: Knowledgebase = {
      id: uuidv4(),
      name: domainName,
      category: 'website',
      dateCreated: new Date().toISOString().split('T')[0],
      dateModified: new Date().toISOString().split('T')[0],
      description: `Website data from ${domainName}`,
      source: websiteUrl,
      size: (Math.random() * 30) + 5, // Random size between 5-35MB
      isFavorite: false,
      path: `/knowledgebases/${domainName.replace(/\./g, '_')}_website.jsonl`
    };
    
    setKnowledgebases(prev => [...prev, newKnowledgebase]);
    setIsWebFetcherDialogOpen(false);
    setWebsiteUrl('');
    setWebsiteFetchStatus('idle');
  };

  // Function to toggle inclusion of a knowledgebase in an index
  const toggleIndexKnowledgebase = (knowledgebaseId: string) => {
    if (newIndexKnowledgebases.includes(knowledgebaseId)) {
      setNewIndexKnowledgebases(prev => prev.filter(id => id !== knowledgebaseId));
    } else {
      setNewIndexKnowledgebases(prev => [...prev, knowledgebaseId]);
    }
  };

  // Handler for website fetching
  const handleFetchWebsite = () => {
    if (!websiteUrl || websiteFetchStatus === 'fetching') return;
    
    setWebsiteFetchStatus('fetching');
    setWebsiteFetchProgress(0);
    setFetchedUrlsCount(0);
    
    // Simulate crawling progress
    const estimatedPageCount = Math.floor(Math.random() * 15) + 5; // Random between 5-20
    setTotalUrlsCount(estimatedPageCount);
    
    let progress = 0;
    let urlCount = 0;
    
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        setWebsiteFetchStatus('complete');
      }
      
      urlCount = Math.floor((progress / 100) * estimatedPageCount);
      
      setWebsiteFetchProgress(progress);
      setFetchedUrlsCount(urlCount);
    }, 500);
    
    // For demo purposes, you could replace this with actual API call to backend Python service
    // Example:
    // const fetchWebsite = async () => {
    //   try {
    //     const response = await fetch('/api/crawl', {
    //       method: 'POST',
    //       headers: { 'Content-Type': 'application/json' },
    //       body: JSON.stringify({ url: websiteUrl })
    //     });
    //     const data = await response.json();
    //     if (data.success) {
    //       setWebsiteFetchStatus('complete');
    //       setFetchedUrlsCount(data.pagesCount);
    //     } else {
    //       setWebsiteFetchStatus('error');
    //     }
    //   } catch (error) {
    //     console.error('Error fetching website:', error);
    //     setWebsiteFetchStatus('error');
    //   }
    // };
    // fetchWebsite();
  };

  // Function to update an index
  const handleUpdateIndex = () => {
    if (!selectedIndexForEdit) return;
    
    setIndexes(prev => prev.map(index => 
      index.id === selectedIndexForEdit.id 
        ? {
            ...index,
            name: newIndexName,
            description: newIndexDescription,
            knowledgebaseIds: newIndexKnowledgebases,
            dateModified: new Date().toISOString()
          }
        : index
    ));
    
    setIsIndexEditDialogOpen(false);
    setSelectedIndexForEdit(null);
  };

  // Function to handle deletion confirmation
  const handleConfirmDelete = () => {
    if (!selectedItemForDeletion) return;
    
    if (selectedItemForDeletion.type === 'knowledgebase') {
      setKnowledgebases(prev => prev.filter(kb => kb.id !== selectedItemForDeletion.id));
      
      // Also update any indexes that contain this knowledgebase
      setIndexes(prev => prev.map(index => ({
        ...index,
        knowledgebaseIds: index.knowledgebaseIds.filter(kbId => kbId !== selectedItemForDeletion.id)
      })));
    } else {
      setIndexes(prev => prev.filter(index => index.id !== selectedItemForDeletion.id));
    }
    
    setIsDeleteConfirmDialogOpen(false);
    setSelectedItemForDeletion(null);
  };

  // Render components
  const KnowledgebaseCard = ({ knowledgebase }: { knowledgebase: Knowledgebase }) => (
    <div className="glass-card p-5 rounded-xl hover:bg-gray-800/40 transition-all cursor-pointer group">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center space-x-3">
          {getCategoryIcon(knowledgebase.category)}
          <h3 className="font-semibold text-lg text-white">{knowledgebase.name}</h3>
        </div>
        <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            className="p-1.5 rounded-lg hover:bg-gray-700/70 transition-colors text-gray-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              openKnowledgebase(knowledgebase.id);
            }}
          >
            <BookOpen className="w-4 h-4" />
          </button>
          <button 
            className="p-1.5 rounded-lg hover:bg-gray-700/70 transition-colors text-gray-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              openCategoryDialog(knowledgebase.id);
            }}
          >
            <Tag className="w-4 h-4" />
          </button>
          <button 
            className="p-1.5 rounded-lg hover:bg-gray-700/70 transition-colors text-gray-400 hover:text-white"
            onClick={(e) => {
              e.stopPropagation();
              promptRenameKnowledgebase(knowledgebase.id);
            }}
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            className="p-1.5 rounded-lg hover:bg-red-900/30 transition-colors text-gray-400 hover:text-red-400"
            onClick={(e) => {
              e.stopPropagation();
              promptDeleteItem(knowledgebase.id, 'knowledgebase');
            }}
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {knowledgebase.description && (
        <p className="text-gray-300 mb-3 line-clamp-2">{knowledgebase.description}</p>
      )}
      
      <div className="flex items-center text-xs text-gray-400 mb-3">
        <Globe className="w-3.5 h-3.5 mr-1.5" />
        <span className="truncate">{knowledgebase.source}</span>
      </div>
      
      <div className="flex justify-between text-xs text-gray-500">
        <div>Added: {knowledgebase.dateCreated}</div>
        <div>{formatSize(knowledgebase.size)}</div>
      </div>
      
      {knowledgebase.thumbnail && (
        <div className="mt-3 rounded-md overflow-hidden">
          <img 
            src={knowledgebase.thumbnail} 
            alt={knowledgebase.name} 
            className="w-full h-24 object-cover"
          />
        </div>
      )}
      
      {knowledgebase.categories && knowledgebase.categories.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {knowledgebase.categories.map(categoryId => {
            const category = globalCategories.find(c => c.id === categoryId);
            if (!category) return null;
            return (
              <span 
                key={categoryId}
                className="px-2 py-0.5 text-xs rounded-full" 
                style={{ 
                  backgroundColor: `${category.color}20`, 
                  color: category.color,
                  border: `1px solid ${category.color}40`
                }}
              >
                {category.name}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );

  const KnowledgebaseListItem = ({ knowledgebase }: { knowledgebase: Knowledgebase }) => (
    <div className="glass-card p-4 rounded-xl hover:bg-gray-800/40 transition-all cursor-pointer flex items-center group">
      <div className="mr-4">
        {getCategoryIcon(knowledgebase.category)}
      </div>
      
      <div className="flex-1 min-width-0">
        <h3 className="font-semibold text-white">{knowledgebase.name}</h3>
        {knowledgebase.description && (
          <p className="text-gray-400 text-sm truncate">{knowledgebase.description}</p>
        )}
        <div className="flex items-center text-xs text-gray-500 mt-1">
          <span className="mr-3">{knowledgebase.dateModified}</span>
          <span>{formatSize(knowledgebase.size)}</span>
        </div>
      </div>
      
      <div className="flex space-x-2 ml-4">
        <button 
          onClick={(e) => {
            e.stopPropagation(); 
            toggleFavorite(knowledgebase.id);
          }}
          className="p-1.5 rounded-lg hover:bg-gray-700/50 transition-colors"
        >
          <Star className={`w-4 h-4 ${knowledgebase.isFavorite ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400'}`} />
        </button>
        <button 
          onClick={(e) => {
            e.stopPropagation();
            setSelectedItemForDeletion({ id: knowledgebase.id, type: 'knowledgebase' });
            setIsDeleteConfirmDialogOpen(true);
          }}
          className="p-1.5 rounded-lg hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
        >
          <Trash2 className="w-4 h-4 text-red-400" />
        </button>
      </div>
    </div>
  );

  // Add a new component for IndexCard
  function IndexCard({ index, knowledgebases }: { index: Index, knowledgebases: Knowledgebase[] }) {
    const indexKnowledgebases = knowledgebases.filter(kb => 
      index.knowledgebaseIds.includes(kb.id)
    );
    
    // Get counts by category
    const categoryCounts = indexKnowledgebases.reduce((acc, kb) => {
      acc[kb.category] = (acc[kb.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    // Get array of categories present in this index
    const categories = Object.keys(categoryCounts) as Array<Knowledgebase['category']>;
    
    return (
      <div className="glass-card p-5 rounded-xl hover:bg-gray-800/40 transition-all duration-300 group">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <Database className="w-6 h-6 text-purple-400 mr-2" />
            <h3 className="text-lg font-semibold">{index.name}</h3>
          </div>
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              className="p-1.5 rounded-lg hover:bg-gray-700/70 transition-colors text-gray-400 hover:text-white"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedIndexForEdit(index);
                handleEditIndex();
              }}
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              className="p-1.5 rounded-lg hover:bg-red-900/30 transition-colors text-gray-400 hover:text-red-400"
              onClick={(e) => {
                e.stopPropagation();
                promptDeleteItem(index.id, 'index');
              }}
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        {index.description && (
          <p className="text-sm text-gray-400 mb-3 line-clamp-2">{index.description}</p>
        )}
        
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map(category => (
            <div 
              key={category}
              className="px-2 py-1 text-xs rounded-full bg-gray-700/70 flex items-center"
            >
              {getCategoryIcon(category)}
              <span className="ml-1">{categoryCounts[category]}</span>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-3 gap-2 mt-4">
          {indexKnowledgebases.slice(0, 3).map(kb => (
            <div 
              key={kb.id}
              className="h-12 rounded-md overflow-hidden bg-gray-700/50 flex items-center p-2"
              title={kb.name}
            >
              {getCategoryIcon(kb.category)}
              <span className="ml-2 text-xs truncate">{kb.name}</span>
            </div>
          ))}
          {indexKnowledgebases.length > 3 && (
            <div className="h-12 rounded-md overflow-hidden bg-gray-700/50 flex items-center justify-center">
              <span className="text-xs text-gray-400">+{indexKnowledgebases.length - 3} more</span>
            </div>
          )}
        </div>
        
        <div className="flex justify-between mt-4 text-xs text-gray-500">
          <span>Created: {new Date(index.dateCreated).toLocaleDateString()}</span>
          <span>{indexKnowledgebases.length} items</span>
        </div>
      </div>
    );
  }

  // Add these new state variables to the component
  const [isAddCategoryDropdownOpen, setIsAddCategoryDropdownOpen] = useState(false);
  const [isKnowledgebaseSelectorOpen, setIsKnowledgebaseSelectorOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Knowledgebase['category'] | null>(null);
  const [knowledgebaseSearchQuery, setKnowledgebaseSearchQuery] = useState('');
  const [tempSelectedKnowledgebases, setTempSelectedKnowledgebases] = useState<string[]>([]);

  // Add these helper functions
  const promptDeleteItem = (id: string, type: 'knowledgebase' | 'index') => {
    setSelectedItemForDeletion({ id, type });
    setIsDeleteConfirmDialogOpen(true);
  };

  const openKnowledgebase = (id: string) => {
    const knowledgebase = knowledgebases.find(kb => kb.id === id);
    if (!knowledgebase) return;
    
    // In a real application, this would navigate to a detail view
    // For now, just show a message
    alert(`Opening knowledgebase: ${knowledgebase.name}`);
  };

  const openKnowledgebaseSelector = (category: Knowledgebase['category']) => {
    setSelectedCategory(category);
    setKnowledgebaseSearchQuery('');
    setTempSelectedKnowledgebases([...newIndexKnowledgebases]); // Start with current selections
    setIsKnowledgebaseSelectorOpen(true);
  };

  const confirmKnowledgebaseSelection = () => {
    setNewIndexKnowledgebases(tempSelectedKnowledgebases);
    setIsKnowledgebaseSelectorOpen(false);
  };

  const toggleTempKnowledgebase = (knowledgebaseId: string) => {
    if (tempSelectedKnowledgebases.includes(knowledgebaseId)) {
      setTempSelectedKnowledgebases(prev => prev.filter(id => id !== knowledgebaseId));
    } else {
      setTempSelectedKnowledgebases(prev => [...prev, knowledgebaseId]);
    }
  };

  const cancelKnowledgebaseSelection = () => {
    setIsKnowledgebaseSelectorOpen(false);
  };

  // Add state for categories
  const [globalCategories, setGlobalCategories] = useState<Category[]>([
    { id: '1', name: 'Frontend', color: '#3B82F6' },
    { id: '2', name: 'Backend', color: '#10B981' },
    { id: '3', name: 'AI', color: '#8B5CF6' },
    { id: '4', name: 'Documentation', color: '#F59E0B' }
  ]);

  // Add states for category management
  const [isCategoryDialogOpen, setIsCategoryDialogOpen] = useState(false);
  const [selectedKnowledgebaseForCategory, setSelectedKnowledgebaseForCategory] = useState<string | null>(null);

  // Add new handlers for category management
  const openCategoryDialog = (knowledgebaseId: string) => {
    setSelectedKnowledgebaseForCategory(knowledgebaseId);
    setIsCategoryDialogOpen(true);
  };

  const handleAddCategory = (category: Category) => {
    // Add to global categories if not already there
    if (!globalCategories.find(c => c.id === category.id)) {
      setGlobalCategories(prev => [...prev, category]);
    }
    
    // Add to the selected knowledgebase
    if (selectedKnowledgebaseForCategory) {
      setKnowledgebases(prev => prev.map(kb => {
        if (kb.id === selectedKnowledgebaseForCategory) {
          return {
            ...kb,
            categories: [...(kb.categories || []), category.id]
          };
        }
        return kb;
      }));
    }
  };

  const handleRemoveCategory = (categoryId: string) => {
    // Remove from the selected knowledgebase
    if (selectedKnowledgebaseForCategory) {
      setKnowledgebases(prev => prev.map(kb => {
        if (kb.id === selectedKnowledgebaseForCategory) {
          return {
            ...kb,
            categories: (kb.categories || []).filter(id => id !== categoryId)
          };
        }
        return kb;
      }));
    }
  };

  // Add the missing function
  const promptRenameKnowledgebase = (id: string) => {
    const knowledgebase = knowledgebases.find(kb => kb.id === id);
    if (!knowledgebase) return;
    
    const newName = prompt("Enter new name:", knowledgebase.name);
    if (!newName || newName === knowledgebase.name) return;
    
    setKnowledgebases(prev => prev.map(kb => 
      kb.id === id ? { ...kb, name: newName, dateModified: new Date().toISOString().split('T')[0] } : kb
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Knowledgebase
        </h1>
        <div className="flex items-center space-x-4">
          <div className="flex rounded-lg bg-gray-800/30 p-1 border border-gray-700/30">
            <button
              onClick={() => setViewMode('knowledgebases')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === 'knowledgebases' 
                  ? 'bg-indigo-600/30 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-4 h-4 inline mr-1" />
              Knowledgebases
            </button>
            <button
              onClick={() => setViewMode('indexes')}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                viewMode === 'indexes' 
                  ? 'bg-indigo-600/30 text-white' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <Database className="w-4 h-4 inline mr-1" />
              Indexes
            </button>
          </div>
          {viewMode === 'knowledgebases' ? (
            <button
              onClick={() => setIsAddKnowledgebaseDialogOpen(true)}
              className="btn-primary"
            >
              <Plus className="w-5 h-5" />
              <span>Add Knowledgebase</span>
            </button>
          ) : (
            <button
              onClick={() => setIsAddIndexDialogOpen(true)}
              className="btn-primary"
            >
              <Plus className="w-5 h-5" />
              <span>New Index</span>
            </button>
          )}
        </div>
      </div>

      {/* Storage stats banner */}
      <div className="glass-card p-4 rounded-xl">
        <h3 className="text-sm font-medium mb-3">Storage</h3>
        <div className="space-y-2">
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Knowledgebase</span>
              <span>13.4 GB / 100 GB</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-2 bg-purple-500 rounded-full"
                style={{ width: '13.4%' }}
              />
            </div>
          </div>
          <div>
            <div className="flex justify-between text-xs mb-1">
              <span>Indexes</span>
              <span>4.7 GB / 20 GB</span>
            </div>
            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-2 bg-green-500 rounded-full"
                style={{ width: '23.5%' }}
              />
            </div>
          </div>
        </div>
        <button className="mt-3 w-full btn-secondary text-xs py-1">
          Manage Storage
        </button>
      </div>

      {/* Horizontal category buttons */}
      <div className="flex flex-wrap gap-2">
        {categories.map((category) => (
          <button
            key={category.id}
            className={`px-3 py-2 rounded-lg text-sm flex items-center space-x-1.5 ${
              activeCategory === category.id 
                ? 'bg-gray-700 text-white' 
                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-700/60 hover:text-gray-300'
            }`}
            onClick={() => setActiveCategory(activeCategory === category.id ? null : category.id)}
          >
            {category.icon}
            <span>{category.name}</span>
            {category.id !== 'all' && category.id !== 'favorites' && (
              <span className="px-1.5 py-0.5 text-xs rounded-full bg-gray-700/50 ml-1">
                {knowledgebases.filter(kb => 
                  category.id === 'all' ? true : 
                  category.id === 'favorites' ? kb.isFavorite : 
                  kb.category === category.id
                ).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex justify-between">
        <SearchBar
          placeholder="Search knowledgebases..."
          value={searchQuery}
          onChange={setSearchQuery}
        />
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setDisplayMode('grid')}
            className={`p-2 rounded-lg hover:bg-gray-700/50 ${
              displayMode === 'grid' ? 'text-indigo-400' : 'text-gray-400'
            }`}
            title="Grid View"
          >
            <Grid className="w-5 h-5" />
          </button>
          <button
            onClick={() => setDisplayMode('list')}
            className={`p-2 rounded-lg hover:bg-gray-700/50 ${
              displayMode === 'list' ? 'text-indigo-400' : 'text-gray-400'
            }`}
            title="List View"
          >
            <List className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {viewMode === 'knowledgebases' ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {activeCategory === null 
                  ? 'All Knowledgebases' 
                  : categories.find(c => c.id === activeCategory)?.name || 'Knowledgebases'}
              </h2>
              <span className="text-sm text-gray-400">
                {filteredKnowledgebases.length} {filteredKnowledgebases.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            {filteredKnowledgebases.length > 0 ? (
              displayMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredKnowledgebases.map(kb => (
                    <KnowledgebaseCard key={kb.id} knowledgebase={kb} />
                  ))}
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredKnowledgebases.map(kb => (
                    <KnowledgebaseListItem key={kb.id} knowledgebase={kb} />
                  ))}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Search className="w-16 h-16 mb-4 text-gray-600" />
                <p className="text-lg">No knowledgebases found</p>
                <p className="text-sm mt-2">Try adjusting your search or select a different category</p>
                <button 
                  onClick={() => setIsAddKnowledgebaseDialogOpen(true)}
                  className="mt-6 btn-primary"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add Knowledgebase</span>
                </button>
              </div>
            )}
          </>
        ) : (
          // Indexes view content
          <>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Indexes</h2>
              <span className="text-sm text-gray-400">
                {indexes.length} {indexes.length === 1 ? 'index' : 'indexes'}
              </span>
            </div>

            {indexes.length > 0 ? (
              displayMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {indexes.map(index => (
                    <IndexCard key={index.id} index={index} knowledgebases={knowledgebases} />
                  ))}
                </div>
              ) : (
                <div className="space-y-1">
                  {indexes.map(index => (
                    <div key={index.id} className="glass-card rounded-lg overflow-hidden">
                      <div 
                        className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-700/30 transition-colors"
                        onClick={() => toggleIndexExpansion(index.id)}
                      >
                        <div className="flex items-center space-x-2">
                          <Database className="w-5 h-5 text-purple-400" />
                          <h3 className="text-lg font-semibold">{index.name}</h3>
                          {index.isExpanded ? (
                            <ChevronDown className="w-4 h-4 text-gray-400" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          )}
                        </div>
                        
                        <div className="flex space-x-2 text-sm text-gray-400">
                          <span>{knowledgebases.filter(kb => index.knowledgebaseIds.includes(kb.id)).length} items</span>
                          
                          <div className="flex space-x-1">
                            <button 
                              className="p-1 rounded-lg hover:bg-gray-700/70 transition-colors text-gray-400 hover:text-white"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedIndexForEdit(index);
                                handleEditIndex();
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              className="p-1 rounded-lg hover:bg-red-900/30 transition-colors text-gray-400 hover:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                promptDeleteItem(index.id, 'index');
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {index.isExpanded && (
                        <div className="px-4 py-3 border-t border-gray-700/30 bg-gray-800/20">
                          {index.description && (
                            <p className="text-sm text-gray-400 mb-3">{index.description}</p>
                          )}
                          
                          <div className="space-y-2">
                            {knowledgebases.filter(kb => index.knowledgebaseIds.includes(kb.id)).map(kb => (
                              <div 
                                key={kb.id}
                                className="flex items-center p-2 rounded-lg hover:bg-gray-700/30 transition-colors"
                              >
                                <div className="mr-3">
                                  {getCategoryIcon(kb.category)}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <h4 className="text-sm font-medium">{kb.name}</h4>
                                  {kb.description && (
                                    <p className="text-xs text-gray-400 truncate">{kb.description}</p>
                                  )}
                                </div>
                                <div className="flex items-center space-x-1">
                                  <button 
                                    className="p-1 rounded-lg hover:bg-gray-700/70 transition-colors text-gray-400 hover:text-white"
                                    onClick={() => openKnowledgebase(kb.id)}
                                  >
                                    <BookOpen className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Database className="w-16 h-16 mb-4 text-gray-600" />
                <p className="text-lg">No indexes found</p>
                <p className="text-sm mt-2">Indexes help you organize your knowledgebases by topic</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Add Knowledgebase Dialog */}
      <Transition appear show={isAddKnowledgebaseDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsAddKnowledgebaseDialogOpen(false)}>
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-xl p-6 text-left align-middle shadow-xl transition-all border border-gray-700/50">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-white">
                    Add New Knowledgebase
                  </Dialog.Title>
                  
                  <div className="mt-4 space-y-4">
                    {/* Category selector */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Category
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          className={`flex flex-col items-center p-3 rounded-lg border ${
                            newKnowledgebaseCategory === 'website' 
                              ? 'border-blue-500/50 bg-blue-500/10 text-blue-400' 
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                          onClick={() => setNewKnowledgebaseCategory('website')}
                        >
                          <Globe className="w-6 h-6 mb-2" />
                          <span className="text-xs">Website</span>
                        </button>
                        
                        <button
                          type="button"
                          className={`flex flex-col items-center p-3 rounded-lg border ${
                            newKnowledgebaseCategory === 'codebase' 
                              ? 'border-green-500/50 bg-green-500/10 text-green-400' 
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                          onClick={() => setNewKnowledgebaseCategory('codebase')}
                        >
                          <Code className="w-6 h-6 mb-2" />
                          <span className="text-xs">Codebase</span>
                        </button>
                        
                        <button
                          type="button"
                          className={`flex flex-col items-center p-3 rounded-lg border ${
                            newKnowledgebaseCategory === 'youtube' 
                              ? 'border-red-500/50 bg-red-500/10 text-red-400' 
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                          onClick={() => setNewKnowledgebaseCategory('youtube')}
                        >
                          <Youtube className="w-6 h-6 mb-2" />
                          <span className="text-xs">YouTube</span>
                        </button>
                        
                        <button
                          type="button"
                          className={`flex flex-col items-center p-3 rounded-lg border ${
                            newKnowledgebaseCategory === 'text' 
                              ? 'border-gray-400/50 bg-gray-400/10 text-gray-300' 
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                          onClick={() => setNewKnowledgebaseCategory('text')}
                        >
                          <FileText className="w-6 h-6 mb-2" />
                          <span className="text-xs">Text</span>
                        </button>
                        
                        <button
                          type="button"
                          className={`flex flex-col items-center p-3 rounded-lg border ${
                            newKnowledgebaseCategory === 'document' 
                              ? 'border-amber-500/50 bg-amber-500/10 text-amber-400' 
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                          onClick={() => setNewKnowledgebaseCategory('document')}
                        >
                          <Book className="w-6 h-6 mb-2" />
                          <span className="text-xs">Document</span>
                        </button>
                        
                        <button
                          type="button"
                          className={`flex flex-col items-center p-3 rounded-lg border ${
                            newKnowledgebaseCategory === 'codefile' 
                              ? 'border-purple-500/50 bg-purple-500/10 text-purple-400' 
                              : 'border-gray-700 hover:border-gray-600'
                          }`}
                          onClick={() => setNewKnowledgebaseCategory('codefile')}
                        >
                          <File className="w-6 h-6 mb-2" />
                          <span className="text-xs">Code File</span>
                        </button>
                      </div>
                    </div>
                    
                    {/* Form fields */}
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Name
                      </label>
                      <input
                        type="text"
                        className="search-input w-full"
                        value={newKnowledgebaseName}
                        onChange={(e) => setNewKnowledgebaseName(e.target.value)}
                        placeholder="Enter knowledgebase name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Description (optional)
                      </label>
                      <textarea
                        className="search-input w-full"
                        value={newKnowledgebaseDescription}
                        onChange={(e) => setNewKnowledgebaseDescription(e.target.value)}
                        placeholder="Enter brief description"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        {newKnowledgebaseCategory === 'website' && 
                          <span>Website URL</span>}
                        {newKnowledgebaseCategory === 'codebase' && 
                          <span>GitHub URL</span>}
                        {newKnowledgebaseCategory === 'youtube' && 
                          <span>YouTube URL</span>}
                        {newKnowledgebaseCategory === 'text' && 
                          <span>Content Name</span>}
                        {newKnowledgebaseCategory === 'document' && 
                          <span>Document Name</span>}
                        {newKnowledgebaseCategory === 'codefile' && 
                          <span>Code File Name</span>}
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          className="search-input w-full"
                          value={newKnowledgebaseSource}
                          onChange={(e) => setNewKnowledgebaseSource(e.target.value)}
                          placeholder={
                            newKnowledgebaseCategory === 'website' ? 'https://example.com' :
                            newKnowledgebaseCategory === 'codebase' ? 'https://github.com/user/repo' :
                            newKnowledgebaseCategory === 'youtube' ? 'https://youtube.com/watch?v=id' :
                            newKnowledgebaseCategory === 'text' ? 'My Notes' :
                            newKnowledgebaseCategory === 'document' ? 'My Documents' :
                            'My Code Files'
                          }
                        />
                        {newKnowledgebaseCategory === 'website' && (
                          <button 
                            className="btn-primary whitespace-nowrap"
                            onClick={() => {
                              setWebsiteUrl(newKnowledgebaseSource);
                              setIsWebFetcherDialogOpen(true);
                              setIsAddKnowledgebaseDialogOpen(false);
                            }}
                          >
                            <Download className="w-5 h-5" />
                            <span>Fetch</span>
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Text content input for 'text' category */}
                    {newKnowledgebaseCategory === 'text' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          Text Content
                        </label>
                        <textarea
                          className="search-input w-full"
                          value={textContent}
                          onChange={(e) => setTextContent(e.target.value)}
                          placeholder="Enter your text content here..."
                          rows={8}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {textContent ? `${(textContent.length / 1024).toFixed(2)} KB` : '0 KB'} • {textContent.split(/\s+/).length} words
                        </p>
                      </div>
                    )}
                    
                    {/* File selection for 'document' and 'codefile' categories */}
                    {(newKnowledgebaseCategory === 'document' || newKnowledgebaseCategory === 'codefile') && (
                      <div>
                        <label className="block text-sm font-medium text-gray-400 mb-2">
                          {newKnowledgebaseCategory === 'document' ? 'Select Documents' : 'Select Code Files'}
                        </label>
                        
                        {selectedFiles.length === 0 ? (
                          <div className="border-2 border-dashed border-gray-700 rounded-lg p-8 text-center">
                            <div className="flex flex-col items-center">
                              <Folder className="w-12 h-12 text-gray-600 mb-3" />
                              <p className="text-gray-400 mb-4">
                                {newKnowledgebaseCategory === 'document'
                                  ? 'Drop document files here or select files/folder'
                                  : 'Drop code files here or select files/folder'
                                }
                              </p>
                              <div className="flex space-x-4">
                                <button 
                                  className="btn-secondary"
                                  onClick={() => simulateFileSelection(newKnowledgebaseCategory)}
                                >
                                  <Folder className="w-5 h-5" />
                                  <span>Select Files</span>
                                </button>
                                <button 
                                  className="btn-secondary"
                                  onClick={() => simulateFileSelection(newKnowledgebaseCategory)}
                                >
                                  <FolderOpen className="w-5 h-5" />
                                  <span>Select Folder</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="border border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-sm font-medium text-gray-300">
                                {selectedFolderPath}
                              </span>
                              <button 
                                className="text-gray-400 hover:text-white"
                                onClick={clearFileSelection}
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                            
                            <div className="max-h-48 overflow-y-auto">
                              {selectedFiles.map((file, index) => (
                                <div 
                                  key={index}
                                  className="flex items-center justify-between py-2 border-b border-gray-700/50 last:border-0"
                                >
                                  <div className="flex items-center">
                                    {newKnowledgebaseCategory === 'document' ? (
                                      <FileText className="w-5 h-5 text-amber-400 mr-3" />
                                    ) : (
                                      <Code className="w-5 h-5 text-purple-400 mr-3" />
                                    )}
                                    <span className="text-sm">{file.name}</span>
                                  </div>
                                  <span className="text-xs text-gray-400">{file.size.toFixed(1)} MB</span>
                                </div>
                              ))}
                            </div>
                            
                            <div className="flex justify-between mt-3 text-xs text-gray-400">
                              <span>{selectedFiles.length} {selectedFiles.length === 1 ? 'file' : 'files'}</span>
                              <span>Total: {selectedFiles.reduce((sum, file) => sum + file.size, 0).toFixed(1)} MB</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-end pt-4 space-x-2">
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => setIsAddKnowledgebaseDialogOpen(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn-primary"
                      onClick={handleAddKnowledgebase}
                      disabled={!newKnowledgebaseName || !newKnowledgebaseSource}
                    >
                      Add Knowledgebase
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Web Fetcher Dialog */}
      <Transition appear show={isWebFetcherDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsWebFetcherDialogOpen(false)}>
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
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-xl p-6 text-left align-middle shadow-xl transition-all border border-gray-700/50">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-white">
                    Website Crawler
                  </Dialog.Title>
                  
                  <div className="mt-4">
                    <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Website URL
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          className="search-input w-full"
                          value={websiteUrl}
                          onChange={(e) => setWebsiteUrl(e.target.value)}
                          placeholder="https://example.com"
                          disabled={websiteFetchStatus === 'fetching'}
                        />
                        <button 
                          className={`btn-primary whitespace-nowrap ${websiteFetchStatus === 'fetching' ? 'opacity-50 cursor-not-allowed' : ''}`}
                          onClick={handleFetchWebsite}
                          disabled={websiteFetchStatus === 'fetching' || !websiteUrl}
                        >
                          {websiteFetchStatus === 'fetching' ? 
                            <RefreshCw className="w-5 h-5 animate-spin" /> : 
                            <Download className="w-5 h-5" />
                          }
                          <span>{websiteFetchStatus === 'fetching' ? 'Fetching...' : 'Fetch'}</span>
                        </button>
                      </div>
                      
                      {websiteFetchStatus === 'error' && (
                        <p className="text-red-400 text-sm mt-2">
                          Error fetching website. Please check the URL and try again.
                        </p>
                      )}
                    </div>
                    
                    {websiteFetchStatus === 'fetching' && (
                      <div className="mb-6">
                        <div className="flex justify-between text-sm mb-2">
                          <span>Crawling website pages...</span>
                          <span className="text-gray-400">{fetchedUrlsCount}/{totalUrlsCount} pages</span>
                        </div>
                        <div className="h-2 bg-gray-700 rounded-full">
                          <div 
                            className="h-2 bg-indigo-500 rounded-full transition-all duration-300" 
                            style={{ width: `${websiteFetchProgress}%` }}
                          />
                        </div>
                        <p className="text-xs text-gray-400 mt-2">
                          The crawler is extracting all pages from the website. This may take a few minutes depending on the size of the website.
                        </p>
                      </div>
                    )}
                    
                    {websiteFetchStatus === 'complete' && (
                      <div className="mb-6 space-y-4">
                        <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                          <h4 className="font-medium text-green-400 flex items-center">
                            <Check className="w-5 h-5 mr-2" />
                            Crawling Complete
                          </h4>
                          <p className="text-sm mt-1 text-gray-300">
                            Successfully crawled {fetchedUrlsCount} pages from {websiteUrl}
                          </p>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Crawled Content Summary</h4>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300">Total pages</span>
                              <span className="font-medium">{fetchedUrlsCount}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300">HTML data size</span>
                              <span className="font-medium">12.7 MB</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300">Extracted text size</span>
                              <span className="font-medium">3.2 MB</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-300">Code snippets extracted</span>
                              <span className="font-medium">24</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Knowledgebase Details</h4>
                          <div className="space-y-3">
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Name</label>
                              <input
                                type="text"
                                className="search-input w-full"
                                value={newKnowledgebaseName || new URL(websiteUrl).hostname.replace('www.', '')}
                                onChange={(e) => setNewKnowledgebaseName(e.target.value)}
                              />
                            </div>
                            <div>
                              <label className="block text-sm text-gray-400 mb-1">Description</label>
                              <textarea
                                className="search-input w-full"
                                value={newKnowledgebaseDescription}
                                onChange={(e) => setNewKnowledgebaseDescription(e.target.value)}
                                rows={2}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex justify-end pt-4 space-x-2">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                          setIsWebFetcherDialogOpen(false);
                          setWebsiteFetchStatus('idle');
                          setWebsiteFetchProgress(0);
                        }}
                      >
                        Cancel
                      </button>
                      
                      {websiteFetchStatus === 'complete' && (
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={() => {
                            handleAddKnowledgebase();
                            setIsWebFetcherDialogOpen(false);
                            setWebsiteFetchStatus('idle');
                          }}
                        >
                          <Save className="w-5 h-5" />
                          <span>Save Knowledgebase</span>
                        </button>
                      )}
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Add Index Dialog */}
      <Transition appear show={isAddIndexDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsAddIndexDialogOpen(false)}>
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
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-xl p-6 text-left align-middle shadow-xl transition-all border border-gray-700/50">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-white">
                    Create New Index
                  </Dialog.Title>
                  
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Index Name
                      </label>
                      <input
                        type="text"
                        className="search-input w-full"
                        value={newIndexName}
                        onChange={(e) => setNewIndexName(e.target.value)}
                        placeholder="Enter index name"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Description (optional)
                      </label>
                      <textarea
                        className="search-input w-full"
                        value={newIndexDescription}
                        onChange={(e) => setNewIndexDescription(e.target.value)}
                        placeholder="Enter brief description"
                        rows={3}
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <label className="block text-sm font-medium text-gray-400">
                          Knowledgebases ({newIndexKnowledgebases.length})
                        </label>
                        <div className="dropdown relative">
                          <button
                            type="button"
                            className="btn-secondary text-sm"
                            onClick={() => setIsAddCategoryDropdownOpen(!isAddCategoryDropdownOpen)}
                          >
                            <Plus className="w-4 h-4" />
                            <span>Add Knowledgebase</span>
                          </button>
                          
                          {isAddCategoryDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-gray-800/95 backdrop-blur-sm border border-gray-700/50 z-10">
                              <div className="py-1" role="menu" aria-orientation="vertical">
                                {categories.filter(c => c.id !== 'all' && c.id !== 'favorites').map(category => (
                                  <button
                                    key={category.id}
                                    className="flex w-full items-center px-4 py-2 text-sm text-gray-300 hover:bg-gray-700/50"
                                    onClick={() => {
                                      openKnowledgebaseSelector(category.id as Knowledgebase['category']);
                                      setIsAddCategoryDropdownOpen(false);
                                    }}
                                  >
                                    {category.icon}
                                    <span className="ml-3">{category.name}</span>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {newIndexKnowledgebases.length > 0 ? (
                        <div className="border border-gray-700 rounded-lg p-4 max-h-60 overflow-y-auto">
                          {newIndexKnowledgebases.map(kbId => {
                            const kb = knowledgebases.find(k => k.id === kbId);
                            if (!kb) return null;
                            
                            return (
                              <div 
                                key={kb.id}
                                className="flex items-center justify-between py-2 px-2 border-b border-gray-700/30 last:border-0 hover:bg-gray-700/30 rounded-lg transition-colors"
                              >
                                <div className="flex items-center">
                                  {getCategoryIcon(kb.category)}
                                  <span className="ml-2 text-sm">{kb.name}</span>
                                </div>
                                <button
                                  className="text-gray-400 hover:text-gray-200"
                                  onClick={() => {
                                    setNewIndexKnowledgebases(prev => prev.filter(id => id !== kb.id));
                                  }}
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="border border-dashed border-gray-700 rounded-lg p-8 text-center">
                          <p className="text-gray-400">No knowledgebases added yet</p>
                          <p className="text-sm text-gray-500 mt-1">Click "Add Knowledgebase" to get started</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-end pt-4 space-x-2">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setIsAddIndexDialogOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={handleAddIndex}
                        disabled={!newIndexName || newIndexKnowledgebases.length === 0}
                      >
                        Create Index
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Edit Index Dialog */}
      <Transition appear show={isIndexEditDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsIndexEditDialogOpen(false)}>
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
                <Dialog.Panel className="w-full max-w-lg transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-xl p-6 text-left align-middle shadow-xl transition-all border border-gray-700/50">
                  {selectedIndexForEdit && (
                    <>
                      <Dialog.Title as="h3" className="text-lg font-semibold text-white">
                        Edit Index
                      </Dialog.Title>
                      
                      <div className="mt-4 space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Index Name
                          </label>
                          <input
                            type="text"
                            className="search-input w-full"
                            value={newIndexName}
                            onChange={(e) => setNewIndexName(e.target.value)}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Description
                          </label>
                          <textarea
                            className="search-input w-full"
                            value={newIndexDescription}
                            onChange={(e) => setNewIndexDescription(e.target.value)}
                            rows={3}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-medium text-gray-400 mb-2">
                            Select Knowledgebases
                          </label>
                          <div className="max-h-60 overflow-y-auto p-2 border border-gray-700 rounded-lg">
                            {knowledgebases.length > 0 ? (
                              <div className="space-y-2">
                                {knowledgebases.map(kb => (
                                  <div 
                                    key={kb.id}
                                    className="flex items-center p-2 hover:bg-gray-700/30 rounded-lg"
                                  >
                                    <input
                                      type="checkbox"
                                      id={`edit-kb-${kb.id}`}
                                      checked={newIndexKnowledgebases.includes(kb.id)}
                                      onChange={() => toggleIndexKnowledgebase(kb.id)}
                                      className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                                    />
                                    <label 
                                      htmlFor={`edit-kb-${kb.id}`}
                                      className="ml-3 block"
                                    >
                                      <div className="flex items-center">
                                        {getCategoryIcon(kb.category)}
                                        <span className="ml-2 font-medium">{kb.name}</span>
                                      </div>
                                    </label>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="py-8 text-center text-gray-400">
                                <p>No knowledgebases available</p>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex justify-end pt-4 space-x-2">
                          <button
                            type="button"
                            className="btn-secondary"
                            onClick={() => setIsIndexEditDialogOpen(false)}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            className="btn-primary"
                            onClick={handleUpdateIndex}
                            disabled={!newIndexName || newIndexKnowledgebases.length === 0}
                          >
                            Update Index
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Delete Confirmation Dialog */}
      <Transition appear show={isDeleteConfirmDialogOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setIsDeleteConfirmDialogOpen(false)}>
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
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-xl p-6 text-left align-middle shadow-xl transition-all border border-gray-700/50">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-white">
                    Confirm Deletion
                  </Dialog.Title>
                  
                  <div className="mt-4">
                    <p className="text-gray-300">
                      {selectedItemForDeletion?.type === 'knowledgebase' ? (
                        <>Are you sure you want to delete this knowledgebase? This action cannot be undone.</>
                      ) : (
                        <>Are you sure you want to delete this index? The knowledgebases associated with this index will not be deleted.</>
                      )}
                    </p>
                    
                    <div className="flex justify-end pt-6 space-x-2">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => setIsDeleteConfirmDialogOpen(false)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={handleConfirmDelete}
                      >
                        <Trash2 className="w-5 h-5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Knowledgebase Selector Dialog */}
      <Transition appear show={isKnowledgebaseSelectorOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={cancelKnowledgebaseSelection}>
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
                <Dialog.Panel className="w-full max-w-xl transform overflow-hidden rounded-2xl bg-gray-800/50 backdrop-blur-xl p-6 text-left align-middle shadow-xl transition-all border border-gray-700/50">
                  <Dialog.Title as="h3" className="text-lg font-semibold text-white flex items-center">
                    {selectedCategory && getCategoryIcon(selectedCategory)}
                    <span className="ml-2">
                      Select {selectedCategory ? categories.find(c => c.id === selectedCategory)?.name : 'Knowledgebases'}
                    </span>
                  </Dialog.Title>
                  
                  <div className="mt-4">
                    <SearchBar
                      placeholder="Search knowledgebases..."
                      value={knowledgebaseSearchQuery}
                      onChange={setKnowledgebaseSearchQuery}
                      className="mb-4"
                    />
                    
                    <div className="border border-gray-700 rounded-lg p-2 max-h-80 overflow-y-auto">
                      {knowledgebases
                        .filter(kb => 
                          (!selectedCategory || kb.category === selectedCategory) &&
                          (knowledgebaseSearchQuery === '' || 
                           kb.name.toLowerCase().includes(knowledgebaseSearchQuery.toLowerCase()) ||
                           (kb.description && kb.description.toLowerCase().includes(knowledgebaseSearchQuery.toLowerCase())))
                        )
                        .map(kb => (
                          <div 
                            key={kb.id}
                            className="flex items-center py-2 px-3 hover:bg-gray-700/30 rounded-lg transition-colors"
                          >
                            <input
                              type="checkbox"
                              id={`select-kb-${kb.id}`}
                              checked={tempSelectedKnowledgebases.includes(kb.id)}
                              onChange={() => toggleTempKnowledgebase(kb.id)}
                              className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                            />
                            <label 
                              htmlFor={`select-kb-${kb.id}`}
                              className="ml-3 flex-1 cursor-pointer"
                            >
                              <div className="flex items-center">
                                {getCategoryIcon(kb.category)}
                                <span className="ml-2 font-medium">{kb.name}</span>
                              </div>
                              {kb.description && (
                                <p className="text-xs text-gray-400 mt-1">{kb.description}</p>
                              )}
                            </label>
                          </div>
                        ))}
                      
                      {knowledgebases
                        .filter(kb => 
                          (!selectedCategory || kb.category === selectedCategory) &&
                          (knowledgebaseSearchQuery === '' || 
                           kb.name.toLowerCase().includes(knowledgebaseSearchQuery.toLowerCase()) ||
                           (kb.description && kb.description.toLowerCase().includes(knowledgebaseSearchQuery.toLowerCase())))
                        ).length === 0 && (
                        <div className="py-8 text-center text-gray-400">
                          <p>No matching knowledgebases found</p>
                          <p className="text-sm mt-1">Try adjusting your search query</p>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex justify-between mt-4">
                      <span className="text-sm text-gray-400">
                        {tempSelectedKnowledgebases.filter(id => 
                          knowledgebases.find(kb => kb.id === id && (!selectedCategory || kb.category === selectedCategory))
                        ).length} selected
                      </span>
                      
                      <div className="flex space-x-2">
                        <button
                          type="button"
                          className="btn-secondary"
                          onClick={cancelKnowledgebaseSelection}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn-primary"
                          onClick={confirmKnowledgebaseSelection}
                        >
                          Confirm Selection
                        </button>
                      </div>
                    </div>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>

      {/* Add CategoryDialog to the component */}
      {selectedKnowledgebaseForCategory && (
        <EnhancedCategoryDialog
          isOpen={isCategoryDialogOpen}
          onClose={() => setIsCategoryDialogOpen(false)}
          categories={
            (knowledgebases.find(kb => kb.id === selectedKnowledgebaseForCategory)?.categories || [])
              .map(categoryId => globalCategories.find(cat => cat.id === categoryId))
              .filter(Boolean) as Category[]
          }
          globalCategories={globalCategories}
          onAddCategory={handleAddCategory}
          onRemoveCategory={handleRemoveCategory}
        />
      )}
    </div>
  );
}

// Helper components for Check icon
function Check(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}