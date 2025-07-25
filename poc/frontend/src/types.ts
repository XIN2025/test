export interface Message {
  id: string;
  type: "user" | "assistant";
  content: string;
  context?: string[];
}

export interface QueryResponse {
  answer: string;
  context: string[];
}

export interface UploadResponse {
  message: string;
  entities: number;
  relationships: number;
}

export interface ImageResult {
  id: string;
  summary: string;
  base64: string;
}
