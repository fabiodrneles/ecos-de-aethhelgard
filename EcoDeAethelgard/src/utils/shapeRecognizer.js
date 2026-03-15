/**
 * shapeRecognizer.js — Motor de Reconhecimento de Formas Geométricas
 *
 * Identifica 6 formas a partir de coordenadas (x, y) capturadas por gesto:
 * Círculo, Triângulo, Linha Horizontal, Linha Vertical, Retângulo, Quadrado.
 *
 * Pipeline: suavização → normalização → reamostragem → extração de features → classificação
 *
 * Todos os limiares estão centralizados em DEFAULT_CONFIG para ajuste fino.
 */

// ---------------------------------------------------------------------------
// Configuração — ajuste estes valores para calibrar o reconhecimento
// ---------------------------------------------------------------------------
const DEFAULT_CONFIG = {
  // Número mínimo de pontos brutos para tentar reconhecer
  minPoints: 8,

  // Moving average — janela de suavização
  smoothWindowSize: 3,

  // Quantidade de pontos após reamostragem (mais = mais preciso, mais lento)
  resampleCount: 64,

  // Circularidade mínima para classificar como círculo (0–1, 1 = perfeito)
  circularityThreshold: 0.70,

  // Detecção de vértices — ângulo mínimo de mudança de direção (graus)
  cornerAngleThreshold: 52,

  // Detecção de vértices — janela de pontos para calcular vetores de direção
  cornerWindowSize: 5,

  // Distância máxima (fração da diagonal do bounding box) entre início e fim
  // para considerar o traço como "fechado"
  closureThreshold: 0.20,

  // Razão de aspecto mínima para classificar como linha (largura/altura ou inverso)
  lineAspectRatioMin: 3.0,

  // Desvio máximo no eixo perpendicular (fração do eixo principal) para linhas
  lineMaxDeviation: 0.20,

  // Faixa de aspect ratio para classificar como quadrado (vs. retângulo)
  squareAspectRatioMin: 0.75,
  squareAspectRatioMax: 1.25,

  // Distância mínima entre dois vértices detectados (normalizada) para merge
  cornerMergeDistance: 0.09,
};

// ---------------------------------------------------------------------------
// Funções utilitárias de geometria
// ---------------------------------------------------------------------------

/**
 * Distância euclidiana entre dois pontos.
 */
function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Centroide (centro de massa) de um conjunto de pontos.
 */
function centroid(points) {
  let sumX = 0;
  let sumY = 0;
  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
  }
  return { x: sumX / points.length, y: sumY / points.length };
}

/**
 * Comprimento total do traço (soma das distâncias consecutivas).
 */
function pathLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += distance(points[i - 1], points[i]);
  }
  return length;
}

/**
 * Ângulo (sem sinal) entre dois vetores 2D, em radianos.
 */
function angleBetweenVectors(v1, v2) {
  const dot = v1.x * v2.x + v1.y * v2.y;
  const cross = v1.x * v2.y - v1.y * v2.x;
  return Math.abs(Math.atan2(cross, dot));
}

// ---------------------------------------------------------------------------
// Pipeline de pré-processamento
// ---------------------------------------------------------------------------

/**
 * Suaviza o traço com média móvel (moving average).
 * Reduz ruído de tremor de mão sem distorcer a forma geral.
 */
function smoothPoints(points, windowSize = DEFAULT_CONFIG.smoothWindowSize) {
  if (points.length <= windowSize) return points.map((p) => ({ ...p }));

  const half = Math.floor(windowSize / 2);
  const smoothed = [];

  for (let i = 0; i < points.length; i++) {
    let sumX = 0;
    let sumY = 0;
    let count = 0;
    const lo = Math.max(0, i - half);
    const hi = Math.min(points.length - 1, i + half);

    for (let j = lo; j <= hi; j++) {
      sumX += points[j].x;
      sumY += points[j].y;
      count++;
    }

    smoothed.push({ x: sumX / count, y: sumY / count });
  }

  return smoothed;
}

/**
 * Normaliza os pontos para um bounding box unitário [0, 1].
 * Usa a maior dimensão como escala para preservar a proporção.
 */
function normalizePoints(points) {
  if (points.length < 2) return points.map((p) => ({ ...p }));

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const scale = Math.max(width, height) || 1;

  return points.map((p) => ({
    x: (p.x - minX) / scale,
    y: (p.y - minY) / scale,
  }));
}

/**
 * Reamostra o traço em N pontos igualmente espaçados ao longo do caminho.
 * Baseado no algoritmo do $1 Recognizer (Wobbrock et al., 2007).
 */
function resamplePoints(
  originalPoints,
  n = DEFAULT_CONFIG.resampleCount,
) {
  // Cópia profunda para não mutar o original
  const pts = originalPoints.map((p) => ({ ...p }));

  if (pts.length < 2) return pts;

  const totalLen = pathLength(pts);
  if (totalLen === 0) return Array(n).fill({ ...pts[0] });

  const interval = totalLen / (n - 1);
  const result = [{ ...pts[0] }];
  let D = 0;

  for (let i = 1; i < pts.length && result.length < n; i++) {
    const d = distance(pts[i - 1], pts[i]);

    if (D + d >= interval) {
      const ratio = (interval - D) / d;
      const q = {
        x: pts[i - 1].x + ratio * (pts[i].x - pts[i - 1].x),
        y: pts[i - 1].y + ratio * (pts[i].y - pts[i - 1].y),
      };
      result.push(q);
      // Inserir ponto interpolado para continuar a reamostragem a partir dele
      pts.splice(i, 0, q);
      D = 0;
    } else {
      D += d;
    }
  }

  // Preencher se faltarem pontos (arredondamento)
  const last = pts[pts.length - 1];
  while (result.length < n) {
    result.push({ ...last });
  }

  return result.slice(0, n);
}

// ---------------------------------------------------------------------------
// Extração de features
// ---------------------------------------------------------------------------

/**
 * Bounding box de um conjunto de pontos.
 */
function boundingBox(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const diagonal = Math.sqrt(width ** 2 + height ** 2);

  return { minX, minY, maxX, maxY, width, height, diagonal };
}

/**
 * Métrica de circularidade (0–1).
 * Mede quão equidistantes os pontos estão do centroide.
 * 1.0 = círculo perfeito.
 */
function circularity(points) {
  const c = centroid(points);
  const distances = points.map((p) => distance(p, c));
  const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;

  if (avgDist === 0) return 0;

  const variance =
    distances.reduce((sum, d) => sum + (d - avgDist) ** 2, 0) /
    distances.length;
  const stdDev = Math.sqrt(variance);

  // Coeficiente de variação — quanto menor, mais circular
  const cv = stdDev / avgDist;

  return Math.max(0, Math.min(1, 1 - cv * 2.5));
}

/**
 * Verifica se o traço é "fechado" (ponto final próximo do ponto inicial).
 */
function isClosed(
  points,
  threshold = DEFAULT_CONFIG.closureThreshold,
) {
  if (points.length < 2) return false;

  const bb = boundingBox(points);
  const maxDist = bb.diagonal * threshold;

  return distance(points[0], points[points.length - 1]) < maxDist;
}

/**
 * Detecta vértices (corners) por mudança de direção.
 * Usa uma janela de pontos para calcular vetores de entrada e saída,
 * e marca onde o ângulo entre eles excede o limiar.
 */
function detectCorners(
  points,
  windowSize = DEFAULT_CONFIG.cornerWindowSize,
  angleThresholdDeg = DEFAULT_CONFIG.cornerAngleThreshold,
  mergeDistance = DEFAULT_CONFIG.cornerMergeDistance,
) {
  if (points.length < windowSize * 2 + 1) return [];

  const thresholdRad = (angleThresholdDeg * Math.PI) / 180;
  const raw = [];

  for (let i = windowSize; i < points.length - windowSize; i++) {
    const before = points[i - windowSize];
    const curr = points[i];
    const after = points[i + windowSize];

    const v1 = { x: curr.x - before.x, y: curr.y - before.y };
    const v2 = { x: after.x - curr.x, y: after.y - curr.y };

    const angle = angleBetweenVectors(v1, v2);

    if (angle > thresholdRad) {
      raw.push({ index: i, point: { ...curr }, angle });
    }
  }

  // Merge de vértices próximos — mantém o de maior ângulo
  const merged = [];
  for (const corner of raw) {
    const existing = merged.find(
      (c) => distance(c.point, corner.point) < mergeDistance,
    );
    if (existing) {
      if (corner.angle > existing.angle) {
        merged[merged.indexOf(existing)] = corner;
      }
    } else {
      merged.push(corner);
    }
  }

  return merged;
}

// ---------------------------------------------------------------------------
// Classificador principal
// ---------------------------------------------------------------------------

/**
 * Reconhece a forma desenhada a partir de um array de pontos brutos {x, y}.
 *
 * @param {Array<{x: number, y: number}>} rawPoints - Pontos capturados pelo gesto
 * @param {object} [config] - Configuração (merge com DEFAULT_CONFIG)
 * @returns {{ shape: string, confidence: number, debug: object }}
 */
function recognizeShape(rawPoints, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Rejeitar traços muito curtos
  if (!rawPoints || rawPoints.length < cfg.minPoints) {
    return {
      shape: 'unknown',
      confidence: 0,
      debug: { reason: 'too_few_points', count: rawPoints?.length || 0 },
    };
  }

  // --- Pipeline de pré-processamento ---
  const smoothed = smoothPoints(rawPoints, cfg.smoothWindowSize);
  const normalized = normalizePoints(smoothed);
  const resampled = resamplePoints(normalized, cfg.resampleCount);

  // --- Extração de features ---
  const bb = boundingBox(resampled);
  const circ = circularity(resampled);
  const corners = detectCorners(
    resampled,
    cfg.cornerWindowSize,
    cfg.cornerAngleThreshold,
    cfg.cornerMergeDistance,
  );
  const closed = isClosed(resampled, cfg.closureThreshold);
  const aspectRatio = bb.width / (bb.height || 0.001);
  const inverseAspect = bb.height / (bb.width || 0.001);

  const debugInfo = {
    pointCount: rawPoints.length,
    circularity: circ,
    cornerCount: corners.length,
    isClosed: closed,
    aspectRatio,
    boundingBox: { w: bb.width, h: bb.height },
  };

  // --- Classificação (ordem importa) ---

  // 1. LINHA HORIZONTAL — bounding box largo e achatado
  if (
    bb.height < cfg.lineMaxDeviation &&
    aspectRatio >= cfg.lineAspectRatioMin
  ) {
    const confidence = Math.min(1, 1 - bb.height / (bb.width || 1));
    return {
      shape: 'horizontal_line',
      confidence,
      debug: { ...debugInfo, reason: 'low_height_high_aspect' },
    };
  }

  // 2. LINHA VERTICAL — bounding box alto e estreito
  if (
    bb.width < cfg.lineMaxDeviation &&
    inverseAspect >= cfg.lineAspectRatioMin
  ) {
    const confidence = Math.min(1, 1 - bb.width / (bb.height || 1));
    return {
      shape: 'vertical_line',
      confidence,
      debug: { ...debugInfo, reason: 'low_width_high_inverse_aspect' },
    };
  }

  // 3. CÍRCULO — alta circularidade + traço fechado
  if (circ >= cfg.circularityThreshold && closed) {
    return {
      shape: 'circle',
      confidence: circ,
      debug: { ...debugInfo, reason: 'high_circularity_closed' },
    };
  }

  // 4. TRIÂNGULO — 3 vértices + traço fechado
  if (corners.length === 3 && closed) {
    const avgAngle =
      corners.reduce((s, c) => s + c.angle, 0) / corners.length;
    const confidence = Math.min(1, 0.6 + avgAngle / Math.PI * 0.4);
    return {
      shape: 'triangle',
      confidence,
      debug: { ...debugInfo, reason: '3_corners_closed' },
    };
  }

  // 5. QUADRADO — 4 vértices + fechado + aspect ratio ~1:1
  if (corners.length === 4 && closed) {
    if (
      aspectRatio >= cfg.squareAspectRatioMin &&
      aspectRatio <= cfg.squareAspectRatioMax
    ) {
      return {
        shape: 'square',
        confidence: 0.85,
        debug: { ...debugInfo, reason: '4_corners_closed_square_ratio' },
      };
    }

    // 6. RETÂNGULO — 4 vértices + fechado + aspect ratio ≠ 1:1
    return {
      shape: 'rectangle',
      confidence: 0.80,
      debug: { ...debugInfo, reason: '4_corners_closed_rect_ratio' },
    };
  }

  // --- Fallback com limiares relaxados ---

  // Círculo imperfeito (não completamente fechado ou circularidade menor)
  if (circ >= cfg.circularityThreshold * 0.75 && corners.length <= 1) {
    return {
      shape: 'circle',
      confidence: circ * 0.8,
      debug: { ...debugInfo, reason: 'relaxed_circle' },
    };
  }

  // Triângulo imperfeito (traço não completamente fechado)
  if (corners.length === 3) {
    return {
      shape: 'triangle',
      confidence: 0.45,
      debug: { ...debugInfo, reason: 'relaxed_triangle_open_low_confidence' },
    };
  }

  // Quadrado/retângulo imperfeito
  if (corners.length === 4) {
    const shape =
      aspectRatio >= cfg.squareAspectRatioMin &&
      aspectRatio <= cfg.squareAspectRatioMax
        ? 'square'
        : 'rectangle';
    return {
      shape,
      confidence: 0.50,
      debug: { ...debugInfo, reason: 'relaxed_polygon_open' },
    };
  }

  // Não reconhecido
  return {
    shape: 'unknown',
    confidence: 0,
    debug: { ...debugInfo, reason: 'no_match' },
  };
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export {
  recognizeShape,
  // Utilitários exportados para testes e uso externo
  smoothPoints,
  normalizePoints,
  resamplePoints,
  boundingBox,
  circularity,
  detectCorners,
  isClosed,
  distance,
  centroid,
  pathLength,
  angleBetweenVectors,
  // Configuração padrão para referência
  DEFAULT_CONFIG,
};