import Dexie, { Table } from 'dexie';
import { Interview, AppSettings, DataRepository } from '../types';

export class InterviewDatabase extends Dexie {
  interviews!: Table<Interview, string>;
  settings!: Table<AppSettings, string>;

  constructor() {
    super('InterviewAssistantDB');
    this.version(1).stores({
      interviews: 'id, company, position, round, date, createdAt',
      settings: 'id'
    });
  }
}

const db = new InterviewDatabase();

export class LocalDBService implements DataRepository {
  async getInterviews(): Promise<Interview[]> {
    return await db.interviews.orderBy('date').reverse().toArray();
  }

  async getInterview(id: string): Promise<Interview | undefined> {
    return await db.interviews.get(id);
  }

  async addInterview(interview: Omit<Interview, 'id' | 'createdAt'>): Promise<string> {
    const id = crypto.randomUUID();
    const newInterview: Interview = {
      ...interview,
      id,
      createdAt: Date.now()
    };
    await db.interviews.add(newInterview);
    return id;
  }

  async updateInterview(id: string, data: Partial<Interview>): Promise<void> {
    const existing = await db.interviews.get(id);
    if (existing) {
      // If we are explicitly setting fields to null, we want to remove them or keep them as null
      const updated = { ...existing, ...data };
      if (data.audioBlob === null) delete updated.audioBlob;
      if (data.transcript === null) delete updated.transcript;
      if (data.report === null) delete updated.report;
      if (data.score === null) delete updated.score;
      
      await db.interviews.put(updated);
    }
  }

  async deleteInterview(id: string): Promise<void> {
    await db.interviews.delete(id);
  }

  async getSettings(): Promise<AppSettings | undefined> {
    return await db.settings.get('default');
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<void> {
    const existing = await this.getSettings();
    if (existing) {
      await db.settings.update('default', settings);
    } else {
      const newSettings: AppSettings = {
        id: 'default',
        resumeText: settings.resumeText || '',
        resumeFile: settings.resumeFile || null,
        resumeFileName: settings.resumeFileName || null,
        asrApiKey: settings.asrApiKey || '',
        llmApiKey: settings.llmApiKey || ''
      };
      await db.settings.add(newSettings);
    }
  }
}

export const repository: DataRepository = new LocalDBService();
