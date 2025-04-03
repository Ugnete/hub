import { Octokit } from 'octokit';
import { getGitHubToken, getSaveLocation } from './store';
import { GitHubRepo } from './github';

// Initialize Octokit
let octokit: Octokit;

export const initializeOctokit = () => {
  const token = getGitHubToken();
  octokit = new Octokit({
    auth: token
  });
};

// Initialize on load
initializeOctokit();

export interface CodeSearchResult {
  repo: GitHubRepo;
  file: {
    name: string;
    path: string;
    url: string;
    content?: string;
  };
  matches: {
    line: number;
    content: string;
  }[];
  score: number;
}

export interface LocalProject {
  id: string;
  name: string;
  path: string;
  lastOpened: string;
  favorite: boolean;
  repoUrl?: string;
  description?: string;
  language?: string;
}

// Get all local projects
export const getLocalProjects = (): LocalProject[] => {
  // In a real implementation, this would scan the local filesystem
  // For now, we'll return mock data
  return [
    {
      id: '1',
      name: 'My React Project',
      path: `${getSaveLocation()}/my-react-project`,
      lastOpened: '2023-07-15T14:30:00',
      favorite: true,
      repoUrl: 'https://github.com/user/my-react-project',
      description: 'A React project with TypeScript',
      language: 'TypeScript'
    },
    {
      id: '2',
      name: 'Python Data Analysis',
      path: `${getSaveLocation()}/python-data-analysis`,
      lastOpened: '2023-07-10T09:15:00',
      favorite: false,
      repoUrl: 'https://github.com/user/python-data-analysis',
      description: 'Data analysis scripts using pandas and matplotlib',
      language: 'Python'
    }
  ];
};

// Search code in local projects
export const searchCodeSemantically = async (
  query: string,
  language?: string,
  projectIds?: string[]
): Promise<CodeSearchResult[]> => {
  // In a real implementation, this would use a local code search engine
  // For now, we'll return mock data
  
  // Simulate a delay for the search
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const mockResults: CodeSearchResult[] = [
    {
      repo: {
        id: 123,
        name: 'My React Project',
        full_name: 'user/my-react-project',
        description: 'A React project with TypeScript',
        html_url: 'https://github.com/user/my-react-project',
        stargazers_count: 10,
        forks_count: 2,
        watchers_count: 5,
        open_issues_count: 3,
        language: 'TypeScript',
        owner: {
          avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
          login: 'user'
        },
        created_at: '2023-01-15T00:00:00Z',
        updated_at: '2023-07-15T00:00:00Z',
        topics: ['react', 'typescript', 'web']
      },
      file: {
        name: 'App.tsx',
        path: 'src/App.tsx',
        url: 'https://github.com/user/my-react-project/blob/main/src/App.tsx',
        content: `import React, { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import About from './pages/About';
import Navbar from './components/Navbar';
import './App.css';

function App() {
  const [theme, setTheme] = useState('light');
  
  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };
  
  return (
    <div className={\`app \${theme}\`}>
      <Navbar theme={theme} toggleTheme={toggleTheme} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </div>
  );
}

export default App;`
      },
      matches: [
        {
          line: 2,
          content: "import { Routes, Route } from 'react-router-dom';"
        },
        {
          line: 14,
          content: "  const toggleTheme = () => {"
        }
      ],
      score: 8.5
    },
    {
      repo: {
        id: 456,
        name: 'Python Data Analysis',
        full_name: 'user/python-data-analysis',
        description: 'Data analysis scripts using pandas and matplotlib',
        html_url: 'https://github.com/user/python-data-analysis',
        stargazers_count: 5,
        forks_count: 1,
        watchers_count: 3,
        open_issues_count: 2,
        language: 'Python',
        owner: {
          avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4',
          login: 'user'
        },
        created_at: '2023-02-20T00:00:00Z',
        updated_at: '2023-07-10T00:00:00Z',
        topics: ['python', 'data-science', 'pandas']
      },
      file: {
        name: 'data_processor.py',
        path: 'src/data_processor.py',
        url: 'https://github.com/user/python-data-analysis/blob/main/src/data_processor.py',
        content: `import pandas as pd
import matplotlib.pyplot as plt
import numpy as np
from typing import Dict, List, Optional

def load_data(file_path: str) -> pd.DataFrame:
    """Load data from CSV file."""
    return pd.read_csv(file_path)

def process_data(df: pd.DataFrame, columns: List[str]) -> pd.DataFrame:
    """Process the data by selecting columns and handling missing values."""
    result = df[columns].copy()
    result.fillna(0, inplace=True)
    return result

def analyze_data(df: pd.DataFrame) -> Dict[str, float]:
    """Perform basic statistical analysis on the data."""
    return {
        'mean': df.mean().to_dict(),
        'median': df.median().to_dict(),
        'std': df.std().to_dict()
    }

def visualize_data(df: pd.DataFrame, column: str, title: Optional[str] = None) -> None:
    """Create a visualization of the data."""
    plt.figure(figsize=(10, 6))
    df[column].plot(kind='hist')
    plt.title(title or f'Distribution of {column}')
    plt.xlabel(column)
    plt.ylabel('Frequency')
    plt.show()
`
      },
      matches: [
        {
          line: 1,
          content: "import pandas as pd"
        },
        {
          line: 2,
          content: "import matplotlib.pyplot as plt"
        }
      ],
      score: 7.2
    }
  ];
  
  // Filter by language if specified
  let results = mockResults;
  if (language) {
    results = results.filter(result => result.repo.language.toLowerCase() === language.toLowerCase());
  }
  
  // Filter by project IDs if specified
  if (projectIds && projectIds.length > 0) {
    // In a real implementation, this would filter by actual project IDs
    // For now, we'll just return the mock results
  }
  
  // Filter by query terms
  const queryTerms = query.toLowerCase().split(' ');
  results = results.filter(result => {
    const content = result.file.content?.toLowerCase() || '';
    return queryTerms.some(term => content.includes(term));
  });
  
  return results;
};

// Add a local project
export const addLocalProject = (project: Omit<LocalProject, 'id'>): LocalProject => {
  // In a real implementation, this would add the project to local storage or a database
  // For now, we'll just return the project with a mock ID
  const newProject: LocalProject = {
    ...project,
    id: Date.now().toString()
  };
  
  return newProject;
};

// Remove a local project
export const removeLocalProject = (id: string): boolean => {
  // In a real implementation, this would remove the project from local storage or a database
  // For now, we'll just return true
  return true;
};

// Update a local project
export const updateLocalProject = (id: string, updates: Partial<LocalProject>): LocalProject | null => {
  // In a real implementation, this would update the project in local storage or a database
  // For now, we'll just return a mock project
  return {
    id,
    name: updates.name || 'Updated Project',
    path: updates.path || `${getSaveLocation()}/updated-project`,
    lastOpened: new Date().toISOString(),
    favorite: updates.favorite !== undefined ? updates.favorite : false,
    repoUrl: updates.repoUrl,
    description: updates.description,
    language: updates.language
  };
};

// Get project details
export const getProjectDetails = (id: string): LocalProject | null => {
  // In a real implementation, this would get the project from local storage or a database
  // For now, we'll just return a mock project
  const projects = getLocalProjects();
  return projects.find(project => project.id === id) || null;
};

// Get project files
export const getProjectFiles = (projectPath: string): string[] => {
  // In a real implementation, this would scan the project directory
  // For now, we'll just return mock files
  return [
    'src/App.tsx',
    'src/index.tsx',
    'src/components/Header.tsx',
    'src/components/Footer.tsx',
    'src/pages/Home.tsx',
    'src/pages/About.tsx',
    'public/index.html',
    'package.json',
    'tsconfig.json'
  ];
};

// Get file content
export const getFileContent = (filePath: string): string => {
  // In a real implementation, this would read the file from disk
  // For now, we'll just return mock content
  return `// Mock content for ${filePath}
// This would be the actual file content in a real implementation
`;
};