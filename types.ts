
export interface AnalysisResult {
  id: string;
  productName: string;
  sustainabilityScore: number;
  redFlags: string[];
  positives: string[];
  recommendation: string;
  summary: string;
  timestamp: number;
  mediaType?: string;
  mediaUrl?: string; // We'll store thumbnails or refs if needed, though for local storage we might just keep metadata
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  RESULT = 'RESULT',
  ERROR = 'ERROR'
}

export enum Tab {
  SCANNER = 'SCANNER',
  HISTORY = 'HISTORY'
}
