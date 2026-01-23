export interface MemoryProvider {
  getUserKnowledge(userId: string): Promise<string>;
  saveActivity(userId: string, activity: unknown): Promise<void>;
}

export const memory: MemoryProvider = {
  async getUserKnowledge(_userId: string): Promise<string> {
    void _userId;
    // TODO: Implement actual retrieval from vector DB or structured profile
    return "None";
  },

  async saveActivity(_userId: string, activity: unknown): Promise<void> {
    void _userId;
    // TODO: Implement persistence (e.g. Mem0 or Postgres)
    console.log("[Memory] Activity saved:", activity);
  },
};
