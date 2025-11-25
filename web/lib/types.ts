export interface Model {
  id: string;
  object: 'model';
  created: number;
  owned_by: string;
  // Custom fields for our UI
  name?: string; // Display name
  group?: string;
  capabilities?: {
    vision?: boolean;
    reasoning?: boolean;
    networking?: boolean;
  };
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  // For vision inputs
  images?: string[]; // base64 data strings
}

export type SearchProvider = 'tavily' | 'bing_api' | 'bing_free' | 'google_free' | 'baidu_free' | 'searxng';

export interface AppConfig {
  baseUrl: string;
  apiKey: string;
  // Search configuration
  searchProvider?: SearchProvider;
  tavilyKey?: string;
  bingKey?: string; // Azure Bing Key
  searxngUrl?: string; // Custom Searxng URL
}

export interface ApiProfile {
  id: string;
  name: string;
  baseUrl: string;
  apiKey: string;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  modelId: string;
  updatedAt: number;
}
