 /**
 * App.js — O Eco de Aethelgard
 *
 * Ponto de entrada da aplicação.
 * Renderiza o GestureCanvas em tela cheia com suporte a acessibilidade.
 *
 * Para ativar o modo debug (visualização dos pontos e métricas),
 * altere DEBUG_MODE para true abaixo.
 */

import React, { useCallback, useState } from 'react';
import {
  StatusBar,
  StyleSheet,
  View,
  Text,
  Platform,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import GestureCanvas from './src/components/GestureCanvas';

// Ativar para ver pontos, métricas e resultado na tela durante desenvolvimento
const DEBUG_MODE = __DEV__;

export default function App() {
  const [history, setHistory] = useState([]);

  const handleShapeRecognized = useCallback((result) => {
    setHistory((prev) => {
      const entry = {
        shape: result.shape,
        confidence: result.confidence,
        timestamp: Date.now(),
      };
      // Manter últimos 10 resultados
      const next = [entry, ...prev];
      return next.slice(0, 10);
    });

    // Aqui você pode integrar com o state machine do jogo (xstate/zustand)
    // Ex: gameEngine.send({ type: `SHAPE_${result.shape.toUpperCase()}` });
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <StatusBar hidden />

      <GestureCanvas
        onShapeRecognized={handleShapeRecognized}
        debug={DEBUG_MODE}
        language="pt-BR"
      />

      {/* Histórico de debug — últimas formas reconhecidas */}
      {DEBUG_MODE && history.length > 0 && (
        <View style={styles.historyPanel}>
          <Text style={styles.historyTitle}>Histórico</Text>
          {history.slice(0, 5).map((entry, i) => (
            <Text key={entry.timestamp} style={styles.historyEntry}>
              {i + 1}. {entry.shape} ({(entry.confidence * 100).toFixed(0)}%)
            </Text>
          ))}
        </View>
      )}
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0a0a0f',
  },

  historyPanel: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 30,
    right: 16,
    backgroundColor: '#1a1a2e',
    borderRadius: 10,
    padding: 12,
    minWidth: 160,
    borderWidth: 1,
    borderColor: '#4af0c030',
  },

  historyTitle: {
    color: '#4af0c0',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },

  historyEntry: {
    color: '#ffffff99',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
});