
export interface FileData {
  id: string;
  name: string;
  type: string;
  content: string; // Base64 or Text
}

export interface GroundingSource {
  title?: string;
  uri?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  type?: 'text' | 'image' | 'analysis' | 'voice';
  imageUrl?: string;
  isReasoning?: boolean;
  groundingSources?: GroundingSource[];
}

export interface Thread {
  id: string;
  title: string;
  history: ChatMessage[];
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  files: FileData[];
  threads: Thread[];
  createdAt: number;
}

export type ReasoningMode = 'Standard' | 'High Reasoning';
