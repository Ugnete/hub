import React, { useState, useEffect } from 'react';
import { Key, Check, AlertCircle, Github, Settings, Bell, Clock, Download, ToggleLeft, ToggleRight, Users, Star } from 'lucide-react';
import { getGitHubToken, setGitHubToken } from '../utils/store';
import { validateGitHubToken, initializeOctokit, getUserProfile, GitHubUser } from '../utils/github';

interface SettingsOption {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
}

export default function GitHubSettings() {
  const [token, setToken] = useState(getGitHubToken());
  const [isValidating, setIsValidating] = useState(false);
  const [validationStatus, setValidationStatus] = useState<'success' | 'error' | null>(null);
  const [showToken, setShowToken] = useState(false);
  const [userProfile, setUserProfile] = useState<GitHubUser | null>(null);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [activeTab, setActiveTab] = useState<'token' | 'preferences' | 'notifications'>('token');
  
  const [settings, setSettings] = useState<SettingsOption[]>([
    {
      id: 'auto_sync',
      label: 'Auto-sync repositories',
      description: 'Automatically sync starred repositories',
      enabled: true
    },
    {
      id: 'show_related',
      label: 'Show related repositories',
      description: 'Display similar repositories in project view',
      enabled: true
    },
    {
      id: 'show_symbols',
      label: 'Show symbol tree',
      description: 'Display code symbols in file view',
      enabled: true
    },
    {
      id: 'dark_mode',
      label: 'Dark mode for READMEs',
      description: 'Apply dark theme to README content',
      enabled: true
    },
    {
      id: 'notifications',
      label: 'Repository notifications',
      description: 'Get notified about updates to tracked repositories',
      enabled: false
    }
  ]);

  useEffect(() => {
    if (token) {
      fetchUserProfile();
    }
  }, [token]);

  const fetchUserProfile = async () => {
    if (!token) return;
    
    setIsLoadingProfile(true);
    try {
      const isValid = await validateGitHubToken(token);
      if (isValid) {
        const user = await getUserProfile('octocat');
        setUserProfile(user);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setIsLoadingProfile(false);
    }
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setToken(e.target.value);
    setValidationStatus(null);
  };

  const handleSaveToken = async () => {
    setIsValidating(true);
    setValidationStatus(null);

    const isValid = await validateGitHubToken(token);
    
    if (isValid) {
      setGitHubToken(token);
      initializeOctokit();
      setValidationStatus('success');
      fetchUserProfile();
    } else {
      setValidationStatus('error');
    }
    
    setIsValidating(false);
  };

  const toggleSetting = (id: string) => {
    setSettings(prev => 
      prev.map(setting => 
        setting.id === id 
          ? { ...setting, enabled: !setting.enabled } 
          : setting
      )
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-4 border-b border-gray-700/30">
        <button
          onClick={() => setActiveTab('token')}
          className={`pb-2 px-4 transition-colors flex items-center space-x-2 ${
            activeTab === 'token'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Key className="w-4 h-4" />
          <span>API Token</span>
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`pb-2 px-4 transition-colors flex items-center space-x-2 ${
            activeTab === 'preferences'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Preferences</span>
        </button>
        <button
          onClick={() => setActiveTab('notifications')}
          className={`pb-2 px-4 transition-colors flex items-center space-x-2 ${
            activeTab === 'notifications'
              ? 'text-purple-400 border-b-2 border-purple-400'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Notifications</span>
        </button>
      </div>

      {token && userProfile && (
        <div className="glass-card p-4 rounded-xl">
          <div className="flex items-center space-x-4">
            <img 
              src={userProfile.avatar_url} 
              alt="GitHub Avatar" 
              className="w-12 h-12 rounded-full"
            />
            <div>
              <h3 className="font-medium text-lg">{userProfile.name || userProfile.login}</h3>
              <div className="text-sm text-gray-400">@{userProfile.login}</div>
              <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500">
                <div className="flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>{userProfile.followers} followers</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Star className="w-3.5 h-3.5 text-yellow-400" />
                  <span>{userProfile.public_repos} repos</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'token' && (
        <div className="glass-card p-8 rounded-xl">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Key className="w-6 h-6 text-purple-400" />
            GitHub API Token
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1">
                Personal Access Token
              </label>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={handleTokenChange}
                  placeholder="ghp_..."
                  className="search-input pr-24"
                />
                <button
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-gray-400 hover:text-white px-2 py-1 rounded"
                >
                  {showToken ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-sm text-gray-400 mt-2">
                Create a token with 'repo' scope at{' '}
                <a
                  href="https://github.com/settings/tokens"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-purple-300"
                >
                  GitHub Settings
                </a>
              </p>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {validationStatus === 'success' && (
                  <span className="flex items-center gap-1 text-green-400">
                    <Check className="w-4 h-4" />
                    Token validated successfully
                  </span>
                )}
                {validationStatus === 'error' && (
                  <span className="flex items-center gap-1 text-red-400">
                    <AlertCircle className="w-4 h-4" />
                    Invalid token
                  </span>
                )}
              </div>
              
              <button
                onClick={handleSaveToken}
                disabled={isValidating || !token}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                ) : (
                  <>
                    <Key className="w-5 h-5" />
                    Save Token
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'preferences' && (
        <div className="glass-card p-8 rounded-xl">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-400" />
            GitHub Preferences
          </h2>
          
          <div className="space-y-6">
            {settings.filter(s => s.id !== 'notifications').map(setting => (
              <div key={setting.id} className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">{setting.label}</h3>
                  <p className="text-sm text-gray-400">{setting.description}</p>
                </div>
                <button 
                  onClick={() => toggleSetting(setting.id)}
                  className="text-gray-300 hover:text-purple-400 transition-colors"
                >
                  {setting.enabled ? (
                    <ToggleRight className="w-10 h-10 text-purple-400" />
                  ) : (
                    <ToggleLeft className="w-10 h-10" />
                  )}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'notifications' && (
        <div className="glass-card p-8 rounded-xl">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Bell className="w-6 h-6 text-purple-400" />
            Notification Settings
          </h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Repository notifications</h3>
                <p className="text-sm text-gray-400">Get notified about updates to tracked repositories</p>
              </div>
              <button 
                onClick={() => toggleSetting('notifications')}
                className="text-gray-300 hover:text-purple-400 transition-colors"
              >
                {settings.find(s => s.id === 'notifications')?.enabled ? (
                  <ToggleRight className="w-10 h-10 text-purple-400" />
                ) : (
                  <ToggleLeft className="w-10 h-10" />
                )}
              </button>
            </div>
            
            <div className="space-y-4 border-t border-gray-700/30 pt-4">
              <h3 className="font-medium">Notification Frequency</h3>
              
              <div className="space-y-2">
                {['Real-time', 'Daily digest', 'Weekly summary'].map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <input 
                      type="radio" 
                      id={`freq-${index}`} 
                      name="frequency" 
                      defaultChecked={index === 1}
                      className="text-purple-500 focus:ring-purple-500 h-4 w-4 bg-gray-700 border-gray-600"
                    />
                    <label htmlFor={`freq-${index}`} className="text-sm">{option}</label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="space-y-4 border-t border-gray-700/30 pt-4">
              <h3 className="font-medium">Notification Types</h3>
              
              <div className="space-y-2">
                {[
                  { label: 'New releases', icon: <Download className="w-4 h-4 text-green-400" /> },
                  { label: 'Star count milestones', icon: <Star className="w-4 h-4 text-yellow-400" /> },
                  { label: 'Repository updates', icon: <Clock className="w-4 h-4 text-blue-400" /> }
                ].map((option, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {option.icon}
                      <span className="text-sm">{option.label}</span>
                    </div>
                    <input 
                      type="checkbox" 
                      id={`type-${index}`} 
                      defaultChecked={index !== 2}
                      className="h-4 w-4 rounded bg-gray-700 border-gray-600 text-purple-500 focus:ring-purple-500"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}