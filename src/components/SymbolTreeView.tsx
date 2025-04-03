import React, { useState, useEffect } from 'react';
import { Code, ChevronRight, ChevronDown, Function, Box, Variable } from 'lucide-react';
import { getSymbolTree } from '../utils/github';

interface SymbolTreeViewProps {
  owner: string;
  repo: string;
  path: string;
  onSelectSymbol?: (symbol: string, type: string) => void;
}

interface SymbolCategory {
  name: string;
  items: string[];
  icon: React.ReactNode;
  expanded: boolean;
  color: string;
}

const SymbolTreeView: React.FC<SymbolTreeViewProps> = ({ owner, repo, path, onSelectSymbol }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [symbolCategories, setSymbolCategories] = useState<SymbolCategory[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSymbols = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const symbols = await getSymbolTree(owner, repo, path);
        
        if (!symbols) {
          setError('Unable to parse symbols for this file');
          setIsLoading(false);
          return;
        }
        
        const categories: SymbolCategory[] = [
          {
            name: 'Classes',
            items: symbols.classes || [],
            icon: <Box size={16} />,
            expanded: true,
            color: 'text-blue-400'
          },
          {
            name: 'Functions',
            items: symbols.functions || [],
            icon: <Function size={16} />,
            expanded: true,
            color: 'text-green-400'
          },
          {
            name: 'Variables',
            items: symbols.variables || [],
            icon: <Variable size={16} />,
            expanded: true,
            color: 'text-yellow-400'
          }
        ];
        
        setSymbolCategories(categories);
      } catch (err) {
        console.error('Error fetching symbol tree:', err);
        setError('Failed to load symbol tree');
      } finally {
        setIsLoading(false);
      }
    };
    
    if (path) {
      fetchSymbols();
    }
  }, [owner, repo, path]);

  const toggleCategory = (index: number) => {
    setSymbolCategories(prev => 
      prev.map((category, i) => 
        i === index 
          ? { ...category, expanded: !category.expanded } 
          : category
      )
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4 h-full">
        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-indigo-500 mr-2"></div>
        <span className="text-sm text-gray-400">Loading symbols...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-gray-400">
        {error}
      </div>
    );
  }

  const hasSymbols = symbolCategories.some(category => category.items.length > 0);

  if (!hasSymbols) {
    return (
      <div className="p-4 text-sm text-gray-400">
        No symbols found in this file
      </div>
    );
  }

  return (
    <div className="p-2 overflow-y-auto">
      <div className="mb-2 flex items-center">
        <Code className="w-4 h-4 mr-2 text-indigo-400" />
        <span className="text-sm font-medium">Symbol Tree</span>
      </div>
      
      <div className="space-y-2">
        {symbolCategories.map((category, index) => (
          category.items.length > 0 && (
            <div key={category.name} className="border border-gray-700/30 rounded-lg overflow-hidden">
              <div 
                className="flex items-center justify-between p-2 bg-gray-800/30 cursor-pointer hover:bg-gray-700/30 transition-colors"
                onClick={() => toggleCategory(index)}
              >
                <div className="flex items-center">
                  {category.expanded 
                    ? <ChevronDown className="w-4 h-4 mr-1 text-gray-400" /> 
                    : <ChevronRight className="w-4 h-4 mr-1 text-gray-400" />
                  }
                  <span className={`mr-2 ${category.color}`}>{category.icon}</span>
                  <span className="text-sm font-medium">{category.name}</span>
                </div>
                <span className="text-xs text-gray-500">{category.items.length}</span>
              </div>
              
              {category.expanded && (
                <div className="bg-gray-800/10 border-t border-gray-700/30">
                  <ul className="py-1">
                    {category.items.map((item, itemIndex) => (
                      <li 
                        key={`${category.name}-${itemIndex}`}
                        className="px-3 py-1.5 text-sm hover:bg-gray-700/30 cursor-pointer transition-colors flex items-center"
                        onClick={() => onSelectSymbol && onSelectSymbol(item, category.name.toLowerCase().slice(0, -1))}
                      >
                        <span className={`mr-2 ${category.color}`}>{category.icon}</span>
                        <span className="text-gray-300">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )
        ))}
      </div>
    </div>
  );
};

export default SymbolTreeView;