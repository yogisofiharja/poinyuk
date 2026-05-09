import { useEffect, useMemo, useState } from 'react';
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

    setTeamASide(lineup.teamASide);
    setMatchState(createInitialState(config));
    setHistory([]);
    setBackgroundPhotoDataUrl(null);
    setSharePreviewDataUrl(null);
    setScreen('match');
  }

  // ── Match screen ──────────────────────────────────────────────────────────

  function handleAddPoint(team: Team) {
    if (!matchState || matchState.isEnded) return;
    const next = addPoint(matchState, team);
    setHistory((prev) => [...prev, cloneState(matchState)]);
    setMatchState(next);
    if (next.isEnded) {
      incrementPlayCounts();
      setScreen('final');
    }
  }

  function handleUndo() {
    if (!history.length) return;
    const previous = history[history.length - 1];
    setHistory((prev) => prev.slice(0, -1));
    setMatchState(previous);
    if (!previous.isEnded) setScreen('match');
  }

  function handleEndMatch() {
    if (!matchState || matchState.isEnded) return;
    const ended = endMatchNow(matchState);
    setHistory((prev) => [...prev, cloneState(matchState)]);
    setMatchState(ended);
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

    const shareText = [
      `${teamNames.A} vs ${teamNames.B}`,
      `Game: ${matchState.games.A} - ${matchState.games.B}`,
      `Poin: ${getPointLabel(matchState, 'A')} - ${getPointLabel(matchState, 'B')}`,
      winnerText,
    ].filter(line => line.trim()).join('\n');

    if (Platform.OS === 'web') {
      try {
        // Always reset to default background whenever Share is tapped.
        setBackgroundPhotoDataUrl(null);
        const cardDataUrl = await composeShareCardDataUrlWeb({
          backgroundDataUrl: undefined,
          title: '',
          matchup: `${teamNames.A} vs ${teamNames.B}`,
          gameScore: `${matchState.games.A} - ${matchState.games.B}`,
        });
        setSharePreviewDataUrl(cardDataUrl);
        setSharePreviewText(shareText);
      } catch {
        showMessage('Gagal membuat score card. Coba lagi.');
      }
      return;
    }

    try {
      await Share.share({ message: shareText });
    } catch {
      showMessage('Share dibatalkan.');
    }
  }

  async function handleShareFromPreview() {
    if (!sharePreviewDataUrl) return;
    const imageShared = await shareImageWeb(sharePreviewDataUrl, sharePreviewText);
    if (imageShared) {
      // Close the modal after successful share
      setSharePreviewDataUrl(null);
      return;
    }
    // Fallback: download image if share API is not available
    downloadDataUrlWeb(sharePreviewDataUrl, 'poinyuk-score.png');
    showMessage('Image downloaded.');
  }

  function closeSharePreview() {
    setSharePreviewDataUrl(null);
  }

  async function handleChangeBackground(source: 'gallery' | 'camera') {
    if (Platform.OS !== 'web') return;
    const dataUrl = await pickImageDataUrlWeb(source);
    if (!dataUrl) return;
    setBackgroundPhotoDataUrl(dataUrl);
    // Re-generate the preview with the new background immediately.
    if (!matchState) return;
    const winnerText =
      matchState.winner === 'A'
        ? `${teamNames.A} menang`
        : matchState.winner === 'B'
          ? `${teamNames.B} menang`
          : '';
    try {
      const cardDataUrl = await composeShareCardDataUrlWeb({
        backgroundDataUrl: dataUrl,
        title: '',
        matchup: `${teamNames.A} vs ${teamNames.B}`,
        gameScore: `${matchState.games.A} - ${matchState.games.B}`,
      });
      setSharePreviewDataUrl(cardDataUrl);
    } catch {
      showMessage('Gagal memproses foto. Coba pilih foto lain.');
    }
  }

  function handleBackToSetup() {
    setMatchState(null);
    setHistory([]);
    setSharePreviewDataUrl(null);
    setScreen('lineup');
  }

  function handleClearSavedState() {
    clearPersistedState();
    setSetup(INITIAL_SETUP);
    setTeamASide('left');
    setMatchState(null);
    setHistory([]);
    setPlayerPlayCounts({});
    setBackgroundPhotoDataUrl(null);
    setSharePreviewDataUrl(null);
    setScreen('setup');
    showMessage('New session started.');
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (screen === 'lineup') {
    return (
      <LineupScreen
        players={setup.players}
        mode={setup.mode}
        initialTeamASide={teamASide}
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
