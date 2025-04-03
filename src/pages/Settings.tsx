import React from 'react';
import { 
  FolderOpen, 
  Tag,
} from 'lucide-react';
import GitHubSettings from '../components/GitHubSettings';
import { getSaveLocation, setSaveLocation, getCategories } from '../utils/store';

export default function Settings() {
  const [saveLocation, setSaveLocationState] = React.useState(getSaveLocation());
  const [globalCategories] = React.useState(getCategories() || []);

  const handleSaveLocationChange = (path: string) => {
    setSaveLocation(path);
    setSaveLocationState(path);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
        Settings
      </h1>
      
      {/* GitHub Settings */}
      <GitHubSettings />
      
      {/* Save Location */}
      <div className="glass-card p-8 rounded-xl">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <FolderOpen className="w-6 h-6 text-purple-400" />
          Project Save Location
        </h2>
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <input
              type="text"
              value={saveLocation}
              onChange={(e) => handleSaveLocationChange(e.target.value)}
              placeholder="Enter save location path..."
              className="search-input flex-1"
            />
            <button 
              className="btn-secondary"
              onClick={() => {
                // Here you would typically open a folder picker
                // For now, we'll just use the text input
              }}
            >
              Browse
            </button>
          </div>
          <p className="text-sm text-gray-400">
            This is where your project files will be saved locally.
          </p>
        </div>
      </div>

      {/* Global Categories */}
      <div className="glass-card p-8 rounded-xl">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Tag className="w-6 h-6 text-purple-400" />
          Global Categories
        </h2>
        <div className="space-y-3">
          {globalCategories.map((category) => (
            <div 
              key={category.id}
              className="flex items-center justify-between glass-card px-4 py-3 rounded-lg hover:bg-gray-800/40 transition-all duration-300"
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: category.color }}
                />
                <span className="font-medium">{category.name}</span>
              </div>
              <span className="text-sm text-gray-400">
                {/* Count can be added when we have access to projects */}
                categories
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 