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
    networking?: boolean; // New capability
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

export interface AppConfig {
  baseUrl: string;
  apiKey: string;
  // Search configuration
  searchProvider?: 'tavily' | 'bing';
  tavilyKey?: string;
  bingKey?: string;
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
