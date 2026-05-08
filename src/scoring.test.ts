import { describe, expect, it } from 'vitest';
import {
  addPoint,
  createInitialState,
  endMatchNow,
  getPointLabel,
  MatchConfig,
  MatchState,
} from './scoring';

function createSingleConfig(deuceMode: MatchConfig['deuceMode']): MatchConfig {
  return {
    mode: 'single',
    deuceMode,
    players: [
      { id: 'A1', name: 'Alice', team: 'A' },
      { id: 'B1', name: 'Bob', team: 'B' },
    ],
    serviceOrderPlayerIds: ['A1', 'B1'],
  };
}

function createDoubleConfig(deuceMode: MatchConfig['deuceMode']): MatchConfig {
  return {
    mode: 'double',
    deuceMode,
    players: [
      { id: 'A1', name: 'A1', team: 'A' },
      { id: 'A2', name: 'A2', team: 'A' },
      { id: 'B1', name: 'B1', team: 'B' },
      { id: 'B2', name: 'B2', team: 'B' },
    ],
    serviceOrderPlayerIds: ['A1', 'B1', 'A2', 'B2'],
  };
}

function applyPoints(state: MatchState, sequence: Array<'A' | 'B'>): MatchState {
  return sequence.reduce((current, team) => addPoint(current, team), state);
}

describe('scoring engine', () => {
  it('finishes a standard game with two-point lead', () => {
    let state = createInitialState(createSingleConfig('standard'));

    state = applyPoints(state, ['A', 'A', 'A', 'A']);

    expect(state.games.A).toBe(1);
    expect(state.games.B).toBe(0);
    expect(state.points).toEqual({ A: 0, B: 0 });
  });

  it('shows deuce and advantage labels in standard mode', () => {
    let state = createInitialState(createSingleConfig('standard'));
    state = applyPoints(state, ['A', 'A', 'A', 'B', 'B', 'B']);

    expect(getPointLabel(state, 'A')).toBe('D');
    expect(getPointLabel(state, 'B')).toBe('D');

    state = addPoint(state, 'A');

    expect(getPointLabel(state, 'A')).toBe('AD');
    expect(getPointLabel(state, 'B')).toBe('-');
  });

  it('uses sudden death only after deuce happens again in single-deuce mode', () => {
    let state = createInitialState(createSingleConfig('singleDeuceSuddenDeath'));
    state = applyPoints(state, ['A', 'A', 'A', 'B', 'B', 'B']);

    // First deuce is still normal deuce/advantage flow.
    expect(getPointLabel(state, 'A')).toBe('D');
    expect(getPointLabel(state, 'B')).toBe('D');

    state = addPoint(state, 'A');
    expect(getPointLabel(state, 'A')).toBe('AD');

    // Deuce happens again, now the next point is sudden death.
    state = addPoint(state, 'B');
    expect(getPointLabel(state, 'A')).toBe('SD');
    expect(getPointLabel(state, 'B')).toBe('SD');

    state = addPoint(state, 'B');

    expect(state.games.B).toBe(1);
    expect(state.points).toEqual({ A: 0, B: 0 });
  });

  it('rotates server each completed game in doubles order', () => {
    let state = createInitialState(createDoubleConfig('standard'));

    expect(state.currentServerPlayerId).toBe('A1');

    state = applyPoints(state, ['A', 'A', 'A', 'A']);
    expect(state.currentServerPlayerId).toBe('B1');

    state = applyPoints(state, ['A', 'A', 'A', 'A']);
    expect(state.currentServerPlayerId).toBe('A2');

    state = applyPoints(state, ['A', 'A', 'A', 'A']);
    expect(state.currentServerPlayerId).toBe('B2');
  });

  it('starts from selected first server when order is rotated', () => {
    const config: MatchConfig = {
      mode: 'double',
      deuceMode: 'standard',
      players: [
        { id: 'A1', name: 'A1', team: 'A' },
        { id: 'A2', name: 'A2', team: 'A' },
        { id: 'B1', name: 'B1', team: 'B' },
        { id: 'B2', name: 'B2', team: 'B' },
      ],
      serviceOrderPlayerIds: ['B1', 'A2', 'B2', 'A1'],
    };

    const state = createInitialState(config);
    expect(state.currentServerPlayerId).toBe('B1');
  });

  it('ends match and decides winner from current score', () => {
    let state = createInitialState(createSingleConfig('standard'));
    state = applyPoints(state, ['A', 'A', 'A', 'A']);
    state = addPoint(state, 'B');

    state = endMatchNow(state);

    expect(state.isEnded).toBe(true);
    expect(state.winner).toBe('A');
    expect(state.endReason).toBe('manual');
  });

  it('ends match as draw if everything is tied', () => {
    const state = endMatchNow(createInitialState(createSingleConfig('standard')));

    expect(state.winner).toBeNull();
    expect(state.isEnded).toBe(true);
  });
});
