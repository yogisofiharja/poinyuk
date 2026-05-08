import { MatchMode, MatchState } from './scoring';

export type TeamASide = 'left' | 'right';

export type SetupForm = {
  mode: MatchMode;
  singleDeuceSuddenDeath: boolean;
  players: string[];
};

export type LineupResult = {
  teamANames: string[];
  teamBNames: string[];
  firstServerName: string;
  teamASide: TeamASide;
};

export type TeamNames = {
  A: string;
  B: string;
};

export type PersistedAppState = {
  version: 1;
  setup: SetupForm;
  teamASide: TeamASide;
  matchState: MatchState | null;
  history: MatchState[];
  backgroundPhotoDataUrl: string | null;
  playerPlayCounts: Record<string, number>;
};
