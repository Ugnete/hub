const STORAGE_KEYS = {
  SAVE_LOCATION: 'saveLocation',
  PROJECTS: 'projects',
  CATEGORIES: 'categories',
  GITHUB_TOKEN: 'githubToken'
} as const;

export const getSaveLocation = (): string => {
  return localStorage.getItem(STORAGE_KEYS.SAVE_LOCATION) || '';
};

export const setSaveLocation = (path: string): void => {
  localStorage.setItem(STORAGE_KEYS.SAVE_LOCATION, path);
};

export const getProjects = (): any[] => {
  try {
    const projects = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    return projects ? JSON.parse(projects) : [];
  } catch {
    return [];
  }
};

export const setProjects = (projects: any[]): void => {
  localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
};

export const getCategories = (): any[] => {
  try {
    const categories = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    return categories ? JSON.parse(categories) : [];
  } catch {
    return [];
  }
};

export const setCategories = (categories: any[]): void => {
  localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(categories));
};

export const getGitHubToken = (): string => {
  return localStorage.getItem(STORAGE_KEYS.GITHUB_TOKEN) || '';
};

export const setGitHubToken = (token: string): void => {
  localStorage.setItem(STORAGE_KEYS.GITHUB_TOKEN, token);
};