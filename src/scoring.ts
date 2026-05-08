export type MatchMode = 'single' | 'double';

export type DeuceMode = 'standard' | 'singleDeuceSuddenDeath';

export type Team = 'A' | 'B';

export type Player = {
  id: string;
  name: string;
  team: Team;
};

export type MatchConfig = {
  mode: MatchMode;
  deuceMode: DeuceMode;
  players: Player[];
  serviceOrderPlayerIds?: string[];
};

export type MatchState = {
  config: MatchConfig;
  points: {
    A: number;
    B: number;
  };
  games: {
    A: number;
    B: number;
  };
  deuceCount: number;
  currentServerPlayerId: string;
  isEnded: boolean;
  winner: Team | null;
  endReason: 'manual' | 'none';
};

const POINT_LABELS = ['0', '15', '30', '40'];

export function createInitialState(config: MatchConfig): MatchState {
  const order = getServiceOrder(config);
  const currentServerPlayerId = order[0] ?? config.players[0].id;

  return {
    config,
    points: { A: 0, B: 0 },
    games: { A: 0, B: 0 },
    deuceCount: 0,
    currentServerPlayerId,
    isEnded: false,
    winner: null,
    endReason: 'none',
  };
}

export function getPointLabel(state: MatchState, team: Team): string {
  const ownPoints = state.points[team];
  const otherTeam: Team = team === 'A' ? 'B' : 'A';
  const otherPoints = state.points[otherTeam];

  if (state.config.deuceMode === 'singleDeuceSuddenDeath') {
    if (state.deuceCount >= 2 && ownPoints >= 3 && otherPoints >= 3) {
      return 'SD';
    }
  }

  if (ownPoints >= 3 && otherPoints >= 3) {
    if (ownPoints === otherPoints) {
      return 'D';
    }

    if (ownPoints === otherPoints + 1) {
      return 'AD';
    }

    return '-';
  }

  return POINT_LABELS[Math.min(ownPoints, 3)];
}

export function addPoint(state: MatchState, team: Team): MatchState {
  if (state.isEnded) {
    return state;
  }

  const nextState: MatchState = {
    ...state,
    points: { ...state.points },
    games: { ...state.games },
  };

  const wasDeuce = isDeuce(nextState.points);
  nextState.points[team] += 1;
  const isNowDeuce = isDeuce(nextState.points);

  // Count how many times we have entered a deuce state in this game.
  if (!wasDeuce && isNowDeuce) {
    nextState.deuceCount += 1;
  }

  const pointWinner = getPointWinner(nextState);
  if (!pointWinner) {
    return nextState;
  }

  // A completed game resets point score and rotates the server.
  nextState.games[pointWinner] += 1;
  nextState.points = { A: 0, B: 0 };
  nextState.deuceCount = 0;
  nextState.currentServerPlayerId = getNextServerId(nextState);

  return nextState;
}

export function endMatchNow(state: MatchState): MatchState {
  if (state.isEnded) {
    return state;
  }

  const winner = decideManualWinner(state);

  return {
    ...state,
    isEnded: true,
    winner,
    endReason: 'manual',
  };
}

export function getServerName(state: MatchState): string {
  const server = state.config.players.find((p) => p.id === state.currentServerPlayerId);
  return server ? server.name : '-';
}

function getPointWinner(state: MatchState): Team | null {
  const a = state.points.A;
  const b = state.points.B;

  if (state.config.deuceMode === 'singleDeuceSuddenDeath' && state.deuceCount >= 2) {
    // In this mode, sudden death starts only after deuce happens again.
    if (a !== b) {
      return a > b ? 'A' : 'B';
    }

    return null;
  }

  if (a >= 4 || b >= 4) {
    if (Math.abs(a - b) >= 2) {
      return a > b ? 'A' : 'B';
    }
  }

  return null;
}

function isDeuce(points: { A: number; B: number }): boolean {
  return points.A >= 3 && points.B >= 3 && points.A === points.B;
}

function getNextServerId(state: MatchState): string {
  // Service order is explicitly stored so it can follow tennis doubles rotation.
  const order = getServiceOrder(state.config);
  const currentIndex = order.indexOf(state.currentServerPlayerId);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  const nextIndex = (safeIndex + 1) % order.length;
  return order[nextIndex];
}

function getServiceOrder(config: MatchConfig): string[] {
  if (config.serviceOrderPlayerIds && config.serviceOrderPlayerIds.length > 0) {
    return config.serviceOrderPlayerIds;
  }

  return config.players.map((p) => p.id);
}

function decideManualWinner(state: MatchState): Team | null {
  if (state.games.A > state.games.B) {
    return 'A';
  }

  if (state.games.B > state.games.A) {
    return 'B';
  }

  if (state.points.A > state.points.B) {
    return 'A';
  }

  if (state.points.B > state.points.A) {
    return 'B';
  }

  return null;
}