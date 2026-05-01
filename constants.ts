
// Paste your Google Apps Script URL here to auto-connect the app
export const PRE_CONFIGURED_SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL;

export const CACHE_TTL = 300000; // 5 minutes

// Re-export everything from modules
export * from './constants/definitions';
export * from './constants/headers';
export * from './constants/scripts';
export * from './constants/templates';
