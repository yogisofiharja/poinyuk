import Ionicons from '@expo/vector-icons/Ionicons';
import { StatusBar } from 'expo-status-bar';
import { useRef, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SetupForm } from '../appTypes';
import { Button, Card, DecorativeBackdrop, palette, Pill } from './ui';

type MatchSetupProps = {
  setup: SetupForm;
  onUpdateSetup: (updates: Partial<SetupForm>) => void;
  onStartMatch: () => void;
  onClearSavedState: () => void;
  onJoinSession: (code: string) => void;
};

export function MatchSetup({ setup, onUpdateSetup, onStartMatch, onClearSavedState, onJoinSession }: MatchSetupProps) {
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<TextInput>(null);
  const [joinCode, setJoinCode] = useState('');
  const [showJoin, setShowJoin] = useState(false);

  const requiredPlayers = setup.mode === 'double' ? 4 : 2;
  const canStart = setup.players.length >= requiredPlayers;
  const playerCountColor =
    setup.players.length >= requiredPlayers ? '#0f766e' : setup.players.length > 0 ? '#b45309' : '#9ca3af';

  function addPlayer() {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    if (setup.players.map((name) => name.toLowerCase()).includes(trimmed.toLowerCase())) {
      setInputValue('');
      inputRef.current?.focus();
      return;
    }
    onUpdateSetup({ players: [...setup.players, trimmed] });
    setInputValue('');
    inputRef.current?.focus();
  }

  function removePlayer(name: string) {
    onUpdateSetup({ players: setup.players.filter((player) => player !== name) });
  }

  return (
    <DecorativeBackdrop>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="dark" />
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <Card tone="accent" style={styles.heroCard}>
            <Text style={styles.appTitle}>PoinYuk</Text>
          </Card>

          <Card>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Daftar Pemain</Text>
              <Text style={[styles.playerCount, { color: playerCountColor }]}>
                {setup.players.length} pemain
              </Text>
            </View>

            <View style={styles.inputRow}>
              <TextInput
                ref={inputRef}
                autoFocus
                style={styles.textInput}
                value={inputValue}
                onChangeText={setInputValue}
                onSubmitEditing={addPlayer}
                placeholder="Nama pemain..."
                placeholderTextColor="#9ca3af"
                returnKeyType="done"
                blurOnSubmit={false}
              />
              <Pressable
                style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
                onPress={addPlayer}
              >
                <Ionicons name="add" size={22} color="#ffffff" />
              </Pressable>
            </View>

            {setup.players.length > 0 && (
              <View style={styles.playerChipList}>
                {setup.players.map((name) => (
                  <View key={name} style={styles.playerChip}>
                    <Text style={styles.chipName}>{name}</Text>
                    <Pressable onPress={() => removePlayer(name)} style={styles.chipRemove} hitSlop={8}>
                      <Ionicons name="close-circle" size={18} color="#94a3b8" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </Card>

          <Card>
            <Text style={styles.sectionTitle}>Jenis Pertandingan</Text>
            <View style={styles.pillRow}>
              <Pill
                label="Single  (1 vs 1)"
                active={setup.mode === 'single'}
                onPress={() => onUpdateSetup({ mode: 'single' })}
              />
              <Pill
                label="Double  (2 vs 2)"
                active={setup.mode === 'double'}
                onPress={() => onUpdateSetup({ mode: 'double' })}
              />
            </View>
            {setup.players.length > 0 && setup.players.length < requiredPlayers && (
              <Text style={styles.warningText}>
                Butuh minimal {requiredPlayers} pemain untuk mode {setup.mode}. Baru ada {setup.players.length}.
              </Text>
            )}
          </Card>

          <Card tone="muted">
            <View style={styles.switchRow}>
              <View style={styles.switchInfo}>
                <Text style={styles.switchTitle}>Single Deuce + Sudden Death</Text>
                <Text style={styles.switchDesc}>Deuce kedua langsung menjadi sudden death.</Text>
              </View>
              <Switch
                value={setup.singleDeuceSuddenDeath}
                onValueChange={(value) => onUpdateSetup({ singleDeuceSuddenDeath: value })}
                trackColor={{ false: '#cbd5e1', true: '#7dd3fc' }}
                thumbColor={setup.singleDeuceSuddenDeath ? '#2563eb' : '#f8fafc'}
              />
            </View>
          </Card>

          <Button label="Pilih Pemain & Mulai Match" onPress={onStartMatch} size="lg" disabled={!canStart} />
          <Button label="Sesi Baru" onPress={onClearSavedState} variant="outline" />

          <Pressable onPress={() => setShowJoin(v => !v)} style={styles.joinToggle}>
            <Text style={styles.joinToggleText}>Punya kode sesi? Gabung sebagai wasit</Text>
          </Pressable>

          {showJoin && (
            <Card>
              <Text style={styles.sectionTitle}>Gabung Sesi</Text>
              <View style={styles.inputRow}>
                <TextInput
                  style={[styles.textInput, styles.codeInput]}
                  value={joinCode}
                  onChangeText={(v) => setJoinCode(v.toUpperCase())}
                  placeholder="Masukkan kode sesi..."
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="characters"
                  maxLength={5}
                />
                <Pressable
                  style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
                  onPress={() => { if (joinCode.length === 5) onJoinSession(joinCode); }}
                >
                  <Ionicons name="enter-outline" size={22} color="#ffffff" />
                </Pressable>
              </View>
            </Card>
          )}
        </ScrollView>
      </SafeAreaView>
    </DecorativeBackdrop>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 32,
    gap: 14,
  },
  heroCard: { paddingVertical: 16, gap: 8 },
  appEyebrow: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#b45309',
    textTransform: 'uppercase',
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#111827',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 21,
    color: '#4b5563',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#111827',
  },
  playerCount: {
    fontSize: 13,
    fontWeight: '800',
  },
  sectionSubtitle: {
    fontSize: 13,
    color: palette.mutedForeground,
    marginTop: 1,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  textInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#d1d5db',
    borderRadius: 12,
    minHeight: 46,
    backgroundColor: '#ffffff',
    color: '#1f2937',
    paddingHorizontal: 14,
    fontSize: 15,
    fontWeight: '600',
  },
  addButton: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#f97316',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: { opacity: 0.8 },
  playerChipList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  playerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  chipIndex: {
    fontSize: 11,
    fontWeight: '900',
    color: '#64748b',
    width: 14,
    textAlign: 'center',
  },
  chipName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1f2937',
  },
  chipRemove: {
    marginLeft: 2,
  },
  emptyHint: {
    fontSize: 13,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
    flexWrap: 'wrap',
  },
  warningText: {
    fontSize: 12,
    color: '#b45309',
    fontWeight: '700',
    marginTop: 2,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 54,
    gap: 12,
  },
  switchInfo: { flex: 1, gap: 3 },
  switchTitle: {
    fontWeight: '900',
    fontSize: 14,
    color: '#111827',
  },
  switchDesc: {
    fontSize: 12,
    color: palette.mutedForeground,
  },
  joinToggle: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  joinToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#94a3b8',
    textDecorationLine: 'underline',
  },
  codeInput: {
    letterSpacing: 4,
    fontWeight: '900',
    fontSize: 18,
    textTransform: 'uppercase',
  },
});
