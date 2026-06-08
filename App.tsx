import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform, Share } from 'react-native';
import {
  addPoint,
  createInitialState,
  endMatchNow,
  getPointLabel,
  MatchConfig,
  MatchState,
  Player,
  Team,
} from './src/scoring';
import {
  composeShareCardDataUrlWeb,
  downloadDataUrlWeb,
  pickImageDataUrlWeb,
  shareImageWeb,
} from './src/shareCard';
import { LineupResult, PersistedAppState, SetupForm, TeamASide } from './src/appTypes';
import { FinalScoreScreen } from './src/components/FinalScoreScreen';
import { LineupScreen } from './src/components/LineupScreen';
import { MatchSetup } from './src/components/MatchSetup';
import { MatchScreen } from './src/components/MatchScreen';
import {
  clearPersistedStateFromStorage,
  loadPersistedStateFromStorage,
  savePersistedStateToStorage,
  STORAGE_KEY,
} from './src/persistence';
import {
  deleteSession,
  generateSessionCode,
  pushSessionState,
  SessionPayload,
  subscribeToSession,
} from './src/sessionSync';
import { isFirebaseReady } from './src/firebase';

type AppScreen = 'setup' | 'lineup' | 'match' | 'final';

const INITIAL_SETUP: SetupForm = {
  mode: 'single',
  singleDeuceSuddenDeath: true,
  players: [],
};

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('setup');
  const [setup, setSetup] = useState<SetupForm>(INITIAL_SETUP);
  const [teamASide, setTeamASide] = useState<TeamASide>('left');
  const [matchState, setMatchState] = useState<MatchState | null>(null);
  const [history, setHistory] = useState<MatchState[]>([]);
  const [backgroundPhotoDataUrl, setBackgroundPhotoDataUrl] = useState<string | null>(null);
  const [sharePreviewDataUrl, setSharePreviewDataUrl] = useState<string | null>(null);
  const [sharePreviewText, setSharePreviewText] = useState('');
  const [playerPlayCounts, setPlayerPlayCounts] = useState<Record<string, number>>({});
  const [sessionCode, setSessionCode] = useState<string | null>(null);

  // Refs for use inside async callbacks / closures where state would be stale
  const sessionCodeRef = useRef<string | null>(null);
  const lastPushTimeRef = useRef<number>(0);
  const unsubscribeSessionRef = useRef<(() => void) | null>(null);

  // ── Persistence ───────────────────────────────────────────────────────────

  useEffect(() => {
    const restored = loadPersistedState();
    if (!restored) return;

    setSetup(restored.setup);
    setTeamASide(restored.teamASide ?? 'left');
    setMatchState(restored.matchState);
    setHistory(restored.history);
    setBackgroundPhotoDataUrl(restored.backgroundPhotoDataUrl ?? null);
    setPlayerPlayCounts(restored.playerPlayCounts ?? {});

    if (restored.matchState) {
      setScreen(restored.matchState.isEnded ? 'final' : 'match');
    }
  }, []);

  useEffect(() => {
    savePersistedState({ version: 1, setup, teamASide, matchState, history, backgroundPhotoDataUrl, playerPlayCounts });
  }, [setup, teamASide, matchState, history, backgroundPhotoDataUrl, playerPlayCounts]);

  // ── Session join via URL param ─────────────────────────────────────────────

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const params = new URLSearchParams(window.location.search);
    const joinCode = params.get('code');
    if (joinCode) joinExistingSession(joinCode.toUpperCase());
  }, []);

  // ── Session sync helpers ──────────────────────────────────────────────────

  function pushToSession(ms: MatchState | null, hist: MatchState[], side: TeamASide) {
    const code = sessionCodeRef.current;
    if (!code) return;
    const now = Date.now();
    lastPushTimeRef.current = now;
    pushSessionState(code, { matchState: ms, history: hist, teamASide: side, updatedAt: now });
  }

  function joinExistingSession(code: string) {
    if (!isFirebaseReady) return;
    sessionCodeRef.current = code;
    setSessionCode(code);

    const unsub = subscribeToSession(code, (payload: SessionPayload | null) => {
      if (!payload) return;
      // Ignore our own echoes
      if (Math.abs(payload.updatedAt - lastPushTimeRef.current) < 1000) return;

      setMatchState(payload.matchState);
      setHistory(payload.history ?? []);
      setTeamASide(payload.teamASide ?? 'left');
      if (payload.matchState) {
        setScreen(payload.matchState.isEnded ? 'final' : 'match');
      }
    });

    unsubscribeSessionRef.current = unsub;
  }

  function endSession() {
    if (unsubscribeSessionRef.current) {
      unsubscribeSessionRef.current();
      unsubscribeSessionRef.current = null;
    }
    if (sessionCodeRef.current) {
      deleteSession(sessionCodeRef.current);
      sessionCodeRef.current = null;
    }
    setSessionCode(null);
  }

  // ── Derived ───────────────────────────────────────────────────────────────

  const teamNames = useMemo(() => {
    if (!matchState) return { A: 'Tim A', B: 'Tim B' };
    const a = matchState.config.players
      .filter((p) => p.team === 'A')
      .map((p) => p.name)
      .join(' / ');
    const b = matchState.config.players
      .filter((p) => p.team === 'B')
      .map((p) => p.name)
      .join(' / ');
    return { A: a, B: b };
  }, [matchState]);

  // ── Setup screen ──────────────────────────────────────────────────────────

  function handleUpdateSetup(updates: Partial<SetupForm>) {
    setSetup((prev) => ({ ...prev, ...updates }));
  }

  function handleGoToLineup() {
    const requiredPlayers = setup.mode === 'double' ? 4 : 2;
    if (setup.players.length < requiredPlayers) {
      showMessage(`Butuh minimal ${requiredPlayers} pemain untuk mode ${setup.mode}.`);
      return;
    }
    setScreen('lineup');
  }

  function handleJoinSession(code: string) {
    if (!code) return;
    joinExistingSession(code);
  }

  // ── Lineup screen ─────────────────────────────────────────────────────────

  function handleLineupConfirm(lineup: LineupResult) {
    const players = buildPlayers(lineup.teamANames, lineup.teamBNames);
    const firstServerPlayer = players.find((p) => p.name === lineup.firstServerName);
    const firstServerId = firstServerPlayer?.id ?? players[0].id;

    const config: MatchConfig = {
      mode: setup.mode,
      deuceMode: setup.singleDeuceSuddenDeath ? 'singleDeuceSuddenDeath' : 'standard',
      players,
      serviceOrderPlayerIds: buildServiceOrder(players, firstServerId),
    };

    const initialState = createInitialState(config);
    const side = lineup.teamASide;

    // Generate session code if Firebase is available
    if (isFirebaseReady) {
      const code = generateSessionCode();
      sessionCodeRef.current = code;
      setSessionCode(code);

      // Subscribe to session so owner receives updates from umpire
      const unsub = subscribeToSession(code, (payload: SessionPayload | null) => {
        if (!payload) return;
        if (Math.abs(payload.updatedAt - lastPushTimeRef.current) < 1000) return;
        setMatchState(payload.matchState);
        setHistory(payload.history ?? []);
        setTeamASide(payload.teamASide ?? 'left');
        if (payload.matchState) {
          setScreen(payload.matchState.isEnded ? 'final' : 'match');
        }
      });
      unsubscribeSessionRef.current = unsub;

      // Push initial state
      const now = Date.now();
      lastPushTimeRef.current = now;
      pushSessionState(code, { matchState: initialState, history: [], teamASide: side, updatedAt: now });
    }

    setTeamASide(side);
    setMatchState(initialState);
    setHistory([]);
    setBackgroundPhotoDataUrl(null);
    setSharePreviewDataUrl(null);
    setScreen('match');
  }

  // ── Match screen ──────────────────────────────────────────────────────────

  function handleAddPoint(team: Team) {
    if (!matchState || matchState.isEnded) return;
    const next = addPoint(matchState, team);
    const newHistory = [...history, cloneState(matchState)];
    setHistory(newHistory);
    setMatchState(next);
    pushToSession(next, newHistory, teamASide);
    if (next.isEnded) {
      incrementPlayCounts();
      setScreen('final');
    }
  }

  function handleUndo() {
    if (!history.length) return;
    const previous = history[history.length - 1];
    const newHistory = history.slice(0, -1);
    setHistory(newHistory);
    setMatchState(previous);
    pushToSession(previous, newHistory, teamASide);
    if (!previous.isEnded) setScreen('match');
  }

  function handleEndMatch() {
    if (!matchState || matchState.isEnded) return;
    const ended = endMatchNow(matchState);
    const newHistory = [...history, cloneState(matchState)];
    setHistory(newHistory);
    setMatchState(ended);
    pushToSession(ended, newHistory, teamASide);
    incrementPlayCounts();
    setScreen('final');
  }

  function incrementPlayCounts() {
    if (!matchState) return;
    setPlayerPlayCounts((prev) => {
      const updated = { ...prev };
      matchState.config.players.forEach((player) => {
        updated[player.name] = (updated[player.name] ?? 0) + 1;
      });
      return updated;
    });
  }

  // ── Final / share ─────────────────────────────────────────────────────────

  async function handleShare() {
    if (!matchState) return;

    const winnerText =
      matchState.winner === 'A'
        ? `${teamNames.A} menang`
        : matchState.winner === 'B'
          ? `${teamNames.B} menang`
          : '';

    const hasSets = matchState.sets.A > 0 || matchState.sets.B > 0;
    const mainScore = hasSets
      ? `${matchState.sets.A} - ${matchState.sets.B}`
      : `${matchState.games.A} - ${matchState.games.B}`;
    const setBreakdown = hasSets
      ? matchState.completedSets.map(s => `${s.A}–${s.B}`).join('  ·  ')
      : undefined;

    const shareText = [
      `${teamNames.A} vs ${teamNames.B}`,
      hasSets ? `Set: ${matchState.sets.A} - ${matchState.sets.B}` : `Game: ${matchState.games.A} - ${matchState.games.B}`,
      hasSets ? `Game: ${matchState.games.A} - ${matchState.games.B}` : null,
      `Poin: ${getPointLabel(matchState, 'A')} - ${getPointLabel(matchState, 'B')}`,
      winnerText,
    ].filter((line): line is string => Boolean(line?.trim())).join('\n');

    if (Platform.OS === 'web') {
      try {
        setBackgroundPhotoDataUrl(null);
        const cardDataUrl = await composeShareCardDataUrlWeb({
          backgroundDataUrl: undefined,
          title: '',
          matchup: `${teamNames.A} vs ${teamNames.B}`,
          gameScore: mainScore,
          setBreakdown,
        });
        setSharePreviewDataUrl(cardDataUrl);
        setSharePreviewText(shareText);
      } catch (err) {
        console.error('Failed to generate share card', err);
      }
      return;
    }

    try {
      await Share.share({ message: shareText });
    } catch {
      // share cancelled or unavailable, no feedback needed
    }
  }

  async function handleShareFromPreview() {
    if (!sharePreviewDataUrl) return;
    const imageShared = await shareImageWeb(sharePreviewDataUrl, sharePreviewText);
    if (imageShared) {
      setSharePreviewDataUrl(null);
      return;
    }
    downloadDataUrlWeb(sharePreviewDataUrl, 'poinyuk-score.png');
  }

  function closeSharePreview() {
    setSharePreviewDataUrl(null);
  }

  async function handleChangeBackground(source: 'gallery' | 'camera') {
    if (Platform.OS !== 'web') return;
    const dataUrl = await pickImageDataUrlWeb(source);
    if (!dataUrl) return;
    setBackgroundPhotoDataUrl(dataUrl);
    if (!matchState) return;
    const hasSetsChange = matchState.sets.A > 0 || matchState.sets.B > 0;
    try {
      const cardDataUrl = await composeShareCardDataUrlWeb({
        backgroundDataUrl: dataUrl,
        title: '',
        matchup: `${teamNames.A} vs ${teamNames.B}`,
        gameScore: hasSetsChange
          ? `${matchState.sets.A} - ${matchState.sets.B}`
          : `${matchState.games.A} - ${matchState.games.B}`,
        setBreakdown: hasSetsChange
          ? matchState.completedSets.map(s => `${s.A}–${s.B}`).join('  ·  ')
          : undefined,
      });
      setSharePreviewDataUrl(cardDataUrl);
    } catch (err) {
      console.error('Failed to process background photo', err);
    }
  }

  function handleBackToSetup() {
    endSession();
    setMatchState(null);
    setHistory([]);
    setSharePreviewDataUrl(null);
    setScreen('lineup');
  }

  function handleClearSavedState() {
    endSession();
    clearPersistedState();
    setSetup(INITIAL_SETUP);
    setTeamASide('left');
    setMatchState(null);
    setHistory([]);
    setPlayerPlayCounts({});
    setBackgroundPhotoDataUrl(null);
    setSharePreviewDataUrl(null);
    setScreen('setup');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (screen === 'lineup') {
    return (
      <LineupScreen
        players={setup.players}
        mode={setup.mode}
        playerPlayCounts={playerPlayCounts}
        onConfirm={handleLineupConfirm}
        onBack={() => setScreen('setup')}
      />
    );
  }

  if (screen === 'match' && matchState && !matchState.isEnded) {
    return (
      <MatchScreen
        matchState={matchState}
        teamNames={teamNames}
        teamASide={teamASide}
        hasUndo={history.length > 0}
        sessionCode={sessionCode}
        onAddPoint={handleAddPoint}
        onUndo={handleUndo}
        onEndMatch={handleEndMatch}
      />
    );
  }

  if (screen === 'final' && matchState?.isEnded) {
    return (
      <FinalScoreScreen
        matchState={matchState}
        teamNames={teamNames}
        sharePreviewDataUrl={sharePreviewDataUrl}
        onShare={handleShare}
        onShareFromPreview={handleShareFromPreview}
        onCloseSharePreview={closeSharePreview}
        onChangeBackground={handleChangeBackground}
        onBackToSetup={handleBackToSetup}
        onClearSavedState={handleClearSavedState}
      />
    );
  }

  // Default: setup screen
  return (
    <MatchSetup
      setup={setup}
      onUpdateSetup={handleUpdateSetup}
      onStartMatch={handleGoToLineup}
      onClearSavedState={handleClearSavedState}
      onJoinSession={handleJoinSession}
    />
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function buildPlayers(teamANames: string[], teamBNames: string[]): Player[] {
  return [
    ...teamANames.map((name, i) => ({ id: `A${i + 1}`, name, team: 'A' as const })),
    ...teamBNames.map((name, i) => ({ id: `B${i + 1}`, name, team: 'B' as const })),
  ];
}

function buildServiceOrder(players: Player[], firstServerId: string): string[] {
  const teamA = players.filter((p) => p.team === 'A');
  const teamB = players.filter((p) => p.team === 'B');
  const base: string[] = [];
  const maxCount = Math.max(teamA.length, teamB.length);
  for (let i = 0; i < maxCount; i++) {
    if (teamA[i]) base.push(teamA[i].id);
    if (teamB[i]) base.push(teamB[i].id);
  }
  const startIdx = base.indexOf(firstServerId);
  if (startIdx < 0) return base;
  return [...base.slice(startIdx), ...base.slice(0, startIdx)];
}

function cloneState(state: MatchState): MatchState {
  return JSON.parse(JSON.stringify(state)) as MatchState;
}

function showMessage(message: string) {
  if (Platform.OS === 'web') {
    window.alert(message);
    return;
  }
  Alert.alert('PoinYuk', message);
}

function loadPersistedState(): PersistedAppState | null {
  if (Platform.OS !== 'web') return null;
  return loadPersistedStateFromStorage(window.localStorage, STORAGE_KEY);
}

function savePersistedState(state: PersistedAppState) {
  if (Platform.OS !== 'web') return;
  savePersistedStateToStorage(window.localStorage, state, STORAGE_KEY);
}

function clearPersistedState() {
  if (Platform.OS !== 'web') return;
  clearPersistedStateFromStorage(window.localStorage, STORAGE_KEY);
}
