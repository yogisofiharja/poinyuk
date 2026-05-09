import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TeamNames } from '../appTypes';
import { getPointLabel, MatchState } from '../scoring';
import { Button, Card, DecorativeBackdrop } from './ui';
import { ShareCardModal } from './ShareCardModal';

type FinalScoreScreenProps = {
  matchState: MatchState;
  teamNames: TeamNames;
  sharePreviewDataUrl: string | null;
  onShare: () => void;
  onShareFromPreview: () => void;
  onCloseSharePreview: () => void;
  onChangeBackground: (source: 'gallery' | 'camera') => void;
  onBackToSetup: () => void;
  onClearSavedState: () => void;
};

export function FinalScoreScreen(props: FinalScoreScreenProps) {
  const {
    matchState,
    teamNames,
    sharePreviewDataUrl,
    onShare,
    onShareFromPreview,
    onCloseSharePreview,
    onChangeBackground,
    onBackToSetup,
    onClearSavedState,
  } = props;

  const winner = matchState.winner; // 'A' | 'B' | null

  function handleEndSession() {
    if (Platform.OS === 'web') {
      if (!window.confirm('End session? Semua data tersimpan akan dihapus.')) return;
    }
    onClearSavedState();
  }

  return (
    <DecorativeBackdrop>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.container}>
          <Card tone="accent">
            <Text style={styles.title}>Final Score</Text>
          </Card>

          <Card>
            <ScoreRow
              name={teamNames.A}
              games={matchState.games.A}
              isWinner={winner === 'A'}
            />
            <View style={styles.divider} />
            <ScoreRow
              name={teamNames.B}
              games={matchState.games.B}
              isWinner={winner === 'B'}
            />
          </Card>

          <Card>
            <Button label="Share" onPress={onShare} size="lg" />
          </Card>

          <Button label="Match Baru" onPress={onBackToSetup} variant="outline" />

          <Pressable onPress={handleEndSession} style={styles.endSessionBtn}>
            <Text style={styles.endSessionText}>End Session</Text>
          </Pressable>
        </ScrollView>

        <ShareCardModal
          visible={!!sharePreviewDataUrl}
          imageDataUrl={sharePreviewDataUrl}
          onShare={onShareFromPreview}
          onChangeBackground={onChangeBackground}
          onClose={onCloseSharePreview}
        />
      </SafeAreaView>
    </DecorativeBackdrop>
  );
}

function ScoreRow({
  name,
  games,
  isWinner,
}: {
  name: string;
  games: number;
  isWinner: boolean;
}) {
  return (
    <View>
      <View style={[styles.scoreRow, isWinner && styles.scoreRowWinner]}>
        <Text style={[styles.teamName, isWinner && styles.teamNameWinner]}>{name}</Text>
        <Text style={[styles.scoreValue, isWinner && styles.scoreValueWinner]}>{games}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 52,
    borderRadius: 10,
    paddingHorizontal: 6,
  },
  scoreRowWinner: {
    backgroundColor: '#fff7ed',
  },
  teamName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '800',
    color: '#6b7280',
  },
  teamNameWinner: {
    fontSize: 15,
    fontWeight: '900',
    color: '#111827',
  },
  scoreValue: {
    width: 34,
    textAlign: 'center',
    fontSize: 22,
    fontWeight: '900',
    color: '#d1d5db',
  },
  scoreValueWinner: {
    color: '#f97316',
  },
  divider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginHorizontal: 6,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  flexButton: {
    flex: 1,
  },
  endSessionBtn: {
    alignItems: 'center',
    paddingVertical: 14,
    marginTop: 4,
    marginBottom: 8,
  },
  endSessionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textDecorationLine: 'underline',
  },
});
