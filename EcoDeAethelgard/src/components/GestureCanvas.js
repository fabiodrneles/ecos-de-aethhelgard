/**
 * GestureCanvas.js — Componente de captura e reconhecimento de gestos
 *
 * Tela inteira acessível onde o jogador desenha formas com o dedo.
 * Ao soltar, a forma é reconhecida, o resultado é falado via TTS
 * e o dispositivo vibra com feedback háptico.
 *
 * Props:
 *   onShapeRecognized(result) — callback com { shape, confidence, debug }
 *   debug (boolean)           — mostra pontos e resultado na tela (dev only)
 *   recognizerConfig (object) — override dos limiares do shapeRecognizer
 *   language (string)         — idioma do TTS (padrão: 'pt-BR')
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Platform,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Tts from 'react-native-tts';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import { recognizeShape } from '../utils/shapeRecognizer';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const SHAPE_LABELS = {
  circle: 'Círculo',
  triangle: 'Triângulo',
  horizontal_line: 'Linha Horizontal',
  vertical_line: 'Linha Vertical',
  rectangle: 'Retângulo',
  square: 'Quadrado',
  unknown: 'Gesto não reconhecido',
};

const HAPTIC_OPTIONS = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

// Intervalo de pontos entre haptics leves durante o traço
const HAPTIC_POINT_INTERVAL = 12;

// Confiança mínima para aceitar o reconhecimento
const MIN_CONFIDENCE = 0.60;

// ---------------------------------------------------------------------------
// Componente
// ---------------------------------------------------------------------------

export default function GestureCanvas({
  onShapeRecognized,
  debug = false,
  recognizerConfig = {},
  language = 'pt-BR',
}) {
  const [displayPoints, setDisplayPoints] = useState([]);
  const [lastResult, setLastResult] = useState(null);
  const pointsRef = useRef([]);
  const pointCountRef = useRef(0);

  // Configurar TTS uma vez
  useEffect(() => {
    try {
      Tts.setDefaultLanguage(language);
      Tts.setDefaultRate(0.48);
    } catch (_) {
      // TTS pode não estar disponível no simulador
    }
  }, [language]);

  // --- Haptic helpers ---
  const triggerHaptic = useCallback((type) => {
    try {
      ReactNativeHapticFeedback.trigger(type, HAPTIC_OPTIONS);
    } catch (_) {
      // Haptics não disponível neste dispositivo
    }
  }, []);

  // --- TTS helper ---
  const speak = useCallback(
    (text) => {
      try {
        Tts.stop();
        Tts.speak(text, { language });
      } catch (_) {
        // TTS não disponível
      }
    },
    [language],
  );

  // --- Processamento do gesto ---
  const processGesture = useCallback(() => {
    const captured = pointsRef.current;
    const result = recognizeShape(captured, recognizerConfig);

    setLastResult(result);

    const isRecognized =
      result.shape !== 'unknown' && result.confidence >= MIN_CONFIDENCE;

    if (isRecognized) {
      triggerHaptic('notificationSuccess');
      speak(`Identificado: ${SHAPE_LABELS[result.shape]}`);
    } else {
      triggerHaptic('notificationWarning');
      speak(SHAPE_LABELS.unknown);
    }

    if (onShapeRecognized) {
      onShapeRecognized(result);
    }
  }, [onShapeRecognized, recognizerConfig, triggerHaptic, speak]);

  // --- Definição do gesto Pan ---
  const panGesture = Gesture.Pan()
    .minDistance(0)
    .onStart((event) => {
      // Primeiro ponto do traço
      const point = { x: event.x, y: event.y };
      pointsRef.current = [point];
      pointCountRef.current = 1;

      setLastResult(null);
      if (debug) setDisplayPoints([point]);

      triggerHaptic('soft');
    })
    .onUpdate((event) => {
      const point = { x: event.x, y: event.y };
      pointsRef.current.push(point);
      pointCountRef.current += 1;

      // Atualizar pontos visuais para debug
      if (debug) {
        setDisplayPoints([...pointsRef.current]);
      }

      // Haptic leve periódico — jogador sente que pontos estão sendo registrados
      if (pointCountRef.current % HAPTIC_POINT_INTERVAL === 0) {
        triggerHaptic('soft');
      }
    })
    .onEnd(() => {
      processGesture();
    });

  // --- Render ---
  return (
    <GestureDetector gesture={panGesture}>
      <View
        style={styles.canvas}
        accessible={true}
        accessibilityLabel="Área de desenho de gestos. Desenhe formas geométricas com o dedo."
        accessibilityRole="none"
        accessibilityHint="Deslize o dedo para desenhar círculos, triângulos ou linhas"
      >
        {/* Instrução inicial */}
        {!lastResult && displayPoints.length === 0 && (
          <View style={styles.prompt}>
            <Text style={styles.promptText}>
              Desenhe uma forma com o dedo
            </Text>
          </View>
        )}

        {/* Pontos de debug — visualização do traço */}
        {debug &&
          displayPoints.map((p, i) => (
            <View
              key={i}
              style={[
                styles.debugDot,
                {
                  left: p.x - 3,
                  top: p.y - 3,
                },
              ]}
            />
          ))}

        {/* Resultado de debug */}
        {debug && lastResult && (
          <View style={styles.debugPanel}>
            <Text style={styles.debugTitle}>
              {SHAPE_LABELS[lastResult.shape]}
            </Text>
            <Text style={styles.debugConfidence}>
              Confiança: {(lastResult.confidence * 100).toFixed(0)}%
            </Text>
            <Text style={styles.debugDetail}>
              Pontos: {lastResult.debug?.pointCount || 0}
              {'  '}Vértices: {lastResult.debug?.cornerCount ?? '-'}
              {'  '}Circularidade:{' '}
              {lastResult.debug?.circularity?.toFixed(2) ?? '-'}
            </Text>
            <Text style={styles.debugDetail}>
              Fechado: {lastResult.debug?.isClosed ? 'Sim' : 'Não'}
              {'  '}Razão: {lastResult.debug?.reason}
            </Text>
          </View>
        )}
      </View>
    </GestureDetector>
  );
}

// ---------------------------------------------------------------------------
// Estilos
// ---------------------------------------------------------------------------

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } =
  Dimensions.get('window');

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: '#0a0a0f',
  },

  prompt: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },

  promptText: {
    color: '#ffffff30',
    fontSize: 18,
    fontWeight: '300',
  },

  debugDot: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4af0c0',
  },

  debugPanel: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 20,
    right: 20,
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#4af0c040',
  },

  debugTitle: {
    color: '#4af0c0',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 4,
  },

  debugConfidence: {
    color: '#ffffffcc',
    fontSize: 16,
    marginBottom: 8,
  },

  debugDetail: {
    color: '#ffffff80',
    fontSize: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 2,
  },
});