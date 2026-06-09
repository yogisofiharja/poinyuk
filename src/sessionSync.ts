import { off, onValue, ref, remove, set } from 'firebase/database';
import { db } from './firebase';
import { TeamASide } from './appTypes';
import { MatchState } from './scoring';

export type SessionPayload = {
  setup: import('./appTypes').SetupForm;
  matchState: MatchState | null;
  history: MatchState[];
  teamASide: TeamASide;
  playerPlayCounts: Record<string, number>;
  updatedAt: number;
};

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generateSessionCode(): string {
  return Array.from({ length: 5 }, () => CHARS[Math.floor(Math.random() * CHARS.length)]).join('');
}

export async function pushSessionState(code: string, payload: SessionPayload): Promise<void> {
  if (!db) return;
  try {
    await set(ref(db, `sessions/${code}`), payload);
  } catch (err) {
    console.error('Session push failed', err);
  }
}

export async function deleteSession(code: string): Promise<void> {
  if (!db) return;
  try {
    await remove(ref(db, `sessions/${code}`));
  } catch {
    // ignore
  }
}

export function subscribeToSession(
  code: string,
  callback: (payload: SessionPayload | null) => void,
): () => void {
  if (!db) return () => {};
  const sessionRef = ref(db, `sessions/${code}`);
  onValue(sessionRef, (snapshot) => {
    callback((snapshot.val() as SessionPayload | null) ?? null);
  });
  return () => off(sessionRef);
}
