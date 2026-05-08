import { StatusBar } from 'expo-status-bar';
import { Image, Platform, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import { TeamNames } from '../appTypes';
import { getPointLabel, MatchState } from '../scoring';
import { Button, Card, DecorativeBackdrop } from './ui';

type FinalScoreScreenProps = {
  matchState: MatchState;
  teamNames: TeamNames;
  sharePreviewDataUrl: string | null;
  onShare: () => void;
  onShareFromPreview: () => void;
  onDownloadPreview: () => void;
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
    onDownloadPreview,
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
            <Button label="Share Hasil Match" onPress={onShare} size="lg" />
          </Card>

          {sharePreviewDataUrl && (
            <Card>
              <Text style={styles.previewTitle}>Preview Share Card</Text>
              <Image source={{ uri: sharePreviewDataUrl }} style={styles.previewImage} />
              <Text style={styles.changeLabel}>Ganti background:</Text>
              <View style={styles.actionRow}>
                <Button label="🖼  Galeri" onPress={() => onChangeBackground('gallery')} variant="secondary" style={styles.flexButton} />
                <Button label="📷  Kamera" onPress={() => onChangeBackground('camera')} variant="secondary" style={styles.flexButton} />
              </View>
              <View style={styles.actionRow}>
                <Button label="Share Sekarang" onPress={onShareFromPreview} style={styles.flexButton} />
                <Button label="Download" onPress={onDownloadPreview} variant="outline" style={styles.flexButton} />
              </View>
              <Button label="Tutup Preview" onPress={onCloseSharePreview} variant="ghost" />
            </Card>
          )}

          <Button label="Match Baru" onPress={onBackToSetup} variant="outline" />

          <Pressable onPress={handleEndSession} style={styles.endSessionBtn}>
            <Text style={styles.endSessionText}>End Session</Text>
          </Pressable>
        </ScrollView>
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
  previewTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1f2937',
  },
  changeLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748b',
    marginTop: 4,
  },
  previewImage: {
    width: '100%',
    aspectRatio: 9 / 16,
    borderRadius: 10,
    backgroundColor: '#e2e8f0',
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
