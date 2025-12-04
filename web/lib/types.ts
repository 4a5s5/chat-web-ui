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
    imageGeneration?: boolean;
  };
}

export interface ImageGenerationConfig {
  size?: string;              // 如 "2048x2048", "1024x1024"
  num_inference_steps?: number; // 推理步数
  negative_prompt?: string;   // 负面提示词
  width?: number;             // 自定义宽度
  height?: number;            // 自定义高度
  seed?: number;              // 随机种子
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
