export type TraceMessage = {
  role: string;
  content: unknown;
};

type TraceRound = {
  id: string;
  learningId: string;
  conversationId: string;
  clientMessageId: string;
  startedAt: string;
  finishedAt?: string;
  requestMessages: TraceMessage[];
  responseMessages?: TraceMessage[];
  inputParts: unknown[];
  error?: string;
};

type TraceStore = {
  rounds: TraceRound[];
  addRound: (round: TraceRound) => void;
  updateRound: (id: string, updates: Partial<TraceRound>) => void;
  getRounds: () => TraceRound[];
};

const MAX_ROUNDS = 50;

const isDev = process.env.NODE_ENV !== "production";

const safeClone = <T>(value: T): T => {
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return value;
  }
};

const createTraceStore = (): TraceStore => {
  const rounds: TraceRound[] = [];

  return {
    rounds,
    addRound: (round) => {
      rounds.unshift(round);
      if (rounds.length > MAX_ROUNDS) {
        rounds.length = MAX_ROUNDS;
      }
    },
    updateRound: (id, updates) => {
      const index = rounds.findIndex((item) => item.id === id);
      if (index === -1) return;
      rounds[index] = { ...rounds[index], ...updates };
    },
    getRounds: () => rounds,
  };
};

type GlobalWithTraceStore = typeof globalThis & {
  __learnTraceStore?: TraceStore;
};

const getStore = (): TraceStore | null => {
  if (!isDev) return null;
  const globalWithStore = globalThis as GlobalWithTraceStore;
  if (!globalWithStore.__learnTraceStore) {
    globalWithStore.__learnTraceStore = createTraceStore();
  }
  return globalWithStore.__learnTraceStore;
};

export const recordLearnTraceStart = (params: {
  learningId: string;
  conversationId: string;
  clientMessageId: string;
  inputParts: unknown[];
  requestMessages: TraceMessage[];
}): string | null => {
  const store = getStore();
  if (!store) return null;

  const id = crypto.randomUUID();
  store.addRound({
    id,
    learningId: params.learningId,
    conversationId: params.conversationId,
    clientMessageId: params.clientMessageId,
    startedAt: new Date().toISOString(),
    requestMessages: safeClone(params.requestMessages),
    inputParts: safeClone(params.inputParts),
  });
  return id;
};

export const recordLearnTraceFinish = (
  roundId: string | null,
  responseMessages: TraceMessage[]
) => {
  if (!roundId) return;
  const store = getStore();
  if (!store) return;

  store.updateRound(roundId, {
    finishedAt: new Date().toISOString(),
    responseMessages: safeClone(responseMessages),
  });
};

export const recordLearnTraceError = (
  roundId: string | null,
  error: string
) => {
  if (!roundId) return;
  const store = getStore();
  if (!store) return;

  store.updateRound(roundId, {
    finishedAt: new Date().toISOString(),
    error,
  });
};

export const getLearnTraceRounds = (): TraceRound[] => {
  const store = getStore();
  if (!store) return [];
  return store.getRounds();
};
