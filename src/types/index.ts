export type Vertical =
  | 'real_estate'
  | 'museum'
  | 'gamedev'
  | 'events'
  | 'retail'
  | 'architecture';

export type ExportFormat =
  | 'glb'
  | 'gltf'
  | 'fbx'
  | 'uasset'
  | 'obj'
  | 'svg'
  | 'json'
  | 'mp3'
  | 'webp_360';

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface VerticalConfig {
  name: string;
  description: string;
  tagline: string;
  features: string[];
  exportFormats: ExportFormat[];
  aiPrompt: string;
  postProcessing: string[];
}

export interface ProcessingOutput {
  format: ExportFormat | string;
  path: string;
  url?: string;
  size: number;
  metadata: Record<string, unknown>;
}

export interface ProcessingJob {
  id: string;
  vertical: Vertical;
  imagePath: string;
  config: VerticalConfig;
  status: JobStatus;
  outputs: ProcessingOutput[];
  error?: string;
  createdAt: Date;
  completedAt?: Date;
}

export interface ProcessorResult {
  success: boolean;
  outputs: ProcessingOutput[];
  metadata: Record<string, unknown>;
}

export interface User {
  id: string;
  email: string;
  vertical: Vertical;
  plan: 'free' | 'starter' | 'pro' | 'enterprise';
  createdAt: Date;
}

export interface Project {
  id: string;
  userId: string;
  name: string;
  vertical: Vertical;
  status: JobStatus;
  imageUrl: string;
  outputs: ProcessingOutput[];
  customConfig?: Record<string, unknown>;
  createdAt: Date;
  completedAt?: Date;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
