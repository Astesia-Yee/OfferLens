export interface Interview {
  id?: string;
  company: string;
  position: string;
  round: string;
  date: number; // timestamp
  score?: number | null;
  audioBlob?: Blob | null;
  transcript?: string | null;
  report?: string | null;
  createdAt: number;
}

export interface AppSettings {
  id: string; // usually 'default'
  resumeText: string;
  resumeFile?: Blob | null;
  resumeFileName?: string | null;
  asrApiKey: string;
  llmApiKey: string;
  llmProvider?: 'kimi' | 'deepseek' | 'gemini' | 'claude' | 'qwen' | 'doubao';
  llmModel?: string;
}

export interface DataRepository {
  // Interviews
  getInterviews(): Promise<Interview[]>;
  getInterview(id: string): Promise<Interview | undefined>;
  addInterview(interview: Omit<Interview, 'id' | 'createdAt'>): Promise<string>;
  updateInterview(id: string, data: Partial<Interview>): Promise<void>;
  deleteInterview(id: string): Promise<void>;

  // Settings
  getSettings(): Promise<AppSettings | undefined>;
  saveSettings(settings: Partial<AppSettings>): Promise<void>;
}
