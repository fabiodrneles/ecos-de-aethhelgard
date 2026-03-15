/**
 * shapeRecognizer.js — Motor de Reconhecimento de Glifos Alfanuméricos
 *
 * Identifica glifos unistroke a partir de coordenadas (x, y):
 * Número 0, Número 1, Número 7, Letra V e Letra L.
 *
 * Pipeline: suavização → normalização → reamostragem → extração de features → classificação
 *
 * Todos os limiares estão centralizados em DEFAULT_CONFIG para ajuste fino.
 */

import { recognizeUnistrokeGlyph } from './templateGlyphRecognizer';

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
  cornerAngleThreshold: 48,

  // Detecção de vértices — janela de pontos para calcular vetores de direção
  cornerWindowSize: 5,

  // Distância máxima (fração da diagonal do bounding box) entre início e fim
  // para considerar o traço como "fechado"
  closureThreshold: 0.20,

  // Razão de aspecto mínima para classificar como linha (largura/altura ou inverso)
  lineAspectRatioMin: 3.0,

  // Desvio máximo no eixo perpendicular (fração do eixo principal) para linhas
  lineMaxDeviation: 0.20,

  // Distância mínima entre dois vértices detectados (normalizada) para merge
  cornerMergeDistance: 0.09,

  // Altura mínima para a letra V (normalizada)
  letterVMinHeight: 0.22,

  // Separação mínima entre início e fim para a letra V (normalizada)
  letterVMinEndpointSeparation: 0.22,

  // Limiar mínimo para classificar letra L
  letterLMinScore: 0.60,

  // Limiar mínimo para classificar letra T
  letterTMinScore: 0.62,

  // Limiar mínimo para classificar número 7
  number7MinScore: 0.60,

  // Score mínimo para aceitar template
  templateMinScore: 0.72,

  // Margem mínima entre top1 e top2 para evitar ambiguidade
  templateMinMargin: 0.10,
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

/**
 * Detecta padrão de letra V:
 * - Traço aberto
 * - 1 a 3 vértices (normalmente 1 principal)
 * - Vértice principal abaixo dos endpoints
 */
function detectVShape(points, corners, closed, bb, cfg = DEFAULT_CONFIG) {
  if (points.length < 3 || corners.length < 1 || closed) {
    return { isV: false, score: 0 };
  }

  const start = points[0];
  const end = points[points.length - 1];
  const strongestCorner = corners.reduce(
    (best, current) => (current.angle > best.angle ? current : best),
    corners[0],
  );

  const endpointSeparation = Math.abs(start.x - end.x);
  const endpointGapRatio = distance(start, end) / (bb.diagonal || 1);
  const cornerBelowEndpoints =
    strongestCorner.point.y > Math.max(start.y, end.y) + 0.05;
  const oneToThreeCorners = corners.length >= 1 && corners.length <= 3;
  const enoughHeight = bb.height >= cfg.letterVMinHeight;
  const enoughOpening =
    endpointSeparation >= cfg.letterVMinEndpointSeparation &&
    endpointGapRatio > cfg.closureThreshold * 1.25;

  const angleThresholdRad = (cfg.cornerAngleThreshold * Math.PI) / 180;
  const strongTurn = strongestCorner.angle > angleThresholdRad;

  let score = 0;
  if (oneToThreeCorners) score += 0.20;
  if (cornerBelowEndpoints) score += 0.30;
  if (enoughHeight) score += 0.20;
  if (enoughOpening) score += 0.20;
  if (strongTurn) score += 0.10;

  return {
    isV: score >= 0.62,
    score: Math.min(1, score),
    endpointGapRatio,
    endpointSeparation,
  };
}

/**
 * Detecta padrão de letra L (traço aberto em ângulo reto).
 */
function detectLShape(points, corners, closed, bb, cfg = DEFAULT_CONFIG) {
  if (points.length < 3 || corners.length < 1 || closed) {
    return { isL: false, score: 0 };
  }

  const strongestCorner = corners.reduce(
    (best, current) => (current.angle > best.angle ? current : best),
    corners[0],
  );

  const cornerLow = strongestCorner.point.y >= bb.minY + bb.height * 0.55;
  const cornerNearSide =
    strongestCorner.point.x <= bb.minX + bb.width * 0.35 ||
    strongestCorner.point.x >= bb.maxX - bb.width * 0.35;
  const enoughHeight = bb.height >= 0.30;
  const enoughWidth = bb.width >= 0.16;

  const start = points[0];
  const end = points[points.length - 1];
  const endpointGapRatio = distance(start, end) / (bb.diagonal || 1);
  const openEnough = endpointGapRatio > cfg.closureThreshold * 1.15;

  const angleThresholdRad = (cfg.cornerAngleThreshold * Math.PI) / 180;
  const rightLikeTurn =
    strongestCorner.angle >= angleThresholdRad * 0.85 &&
    strongestCorner.angle <= Math.PI * 0.85;

  let score = 0;
  if (cornerLow) score += 0.25;
  if (cornerNearSide) score += 0.20;
  if (enoughHeight) score += 0.20;
  if (enoughWidth) score += 0.15;
  if (openEnough) score += 0.10;
  if (rightLikeTurn) score += 0.10;

  return {
    isL: score >= cfg.letterLMinScore,
    score: Math.min(1, score),
  };
}

/**
 * Detecta padrão de número 7 (barra superior + diagonal descendente).
 */
function detect7Shape(points, corners, closed, bb, cfg = DEFAULT_CONFIG) {
  if (points.length < 3 || corners.length < 1 || closed) {
    return { is7: false, score: 0 };
  }

  const strongestCorner = corners.reduce(
    (best, current) => (current.angle > best.angle ? current : best),
    corners[0],
  );

  const cornerHigh = strongestCorner.point.y <= bb.minY + bb.height * 0.40;
  const cornerNearSide =
    strongestCorner.point.x <= bb.minX + bb.width * 0.35 ||
    strongestCorner.point.x >= bb.maxX - bb.width * 0.35;
  const enoughWidth = bb.width >= 0.28;
  const enoughHeight = bb.height >= 0.20;

  const start = points[0];
  const end = points[points.length - 1];
  const endpointDrop = Math.abs(end.y - start.y);
  const hasDescendingLeg = endpointDrop >= bb.height * 0.35;

  const angleThresholdRad = (cfg.cornerAngleThreshold * Math.PI) / 180;
  const sharpTurn = strongestCorner.angle >= angleThresholdRad * 0.9;

  let score = 0;
  if (cornerHigh) score += 0.25;
  if (cornerNearSide) score += 0.15;
  if (enoughWidth) score += 0.20;
  if (enoughHeight) score += 0.20;
  if (hasDescendingLeg) score += 0.10;
  if (sharpTurn) score += 0.10;

  return {
    is7: score >= cfg.number7MinScore,
    score: Math.min(1, score),
  };
}

/**
 * Detecta padrão de letra T (barra superior + haste central).
 */
function detectTShape(points, corners, closed, bb, cfg = DEFAULT_CONFIG) {
  if (points.length < 5 || closed) {
    return { isT: false, score: 0 };
  }

  const topLimit = bb.minY + bb.height * 0.30;
  const centerX = bb.minX + bb.width * 0.50;
  const centerTolerance = bb.width * 0.22;

  const topBandRatio =
    points.filter((p) => p.y <= topLimit).length / points.length;
  const centerBandRatio =
    points.filter((p) => Math.abs(p.x - centerX) <= centerTolerance).length /
    points.length;

  const enoughWidth = bb.width >= 0.28;
  const enoughHeight = bb.height >= 0.28;
  const hasTopCorner = corners.some(
    (corner) => corner.point.y <= bb.minY + bb.height * 0.40,
  );

  let score = 0;
  if (topBandRatio >= 0.22) score += 0.30;
  if (centerBandRatio >= 0.22) score += 0.30;
  if (enoughWidth) score += 0.15;
  if (enoughHeight) score += 0.15;
  if (hasTopCorner) score += 0.10;

  return {
    isT: score >= cfg.letterTMinScore,
    score: Math.min(1, score),
  };
}

// ---------------------------------------------------------------------------
// Classificador principal
// ---------------------------------------------------------------------------

/**
 * Reconhece o glifo desenhado a partir de um array de pontos brutos {x, y}.
 *
 * @param {Array<{x: number, y: number}>} rawPoints - Pontos capturados pelo gesto
 * @param {object} [config] - Configuração (merge com DEFAULT_CONFIG)
 * @returns {{ shape: string, confidence: number, debug: object }}
 */
function recognizeShape(rawPoints, config = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (!rawPoints || rawPoints.length < cfg.minPoints) {
    return {
      shape: 'unknown',
      confidence: 0,
      debug: { reason: 'too_few_points', count: rawPoints?.length || 0 },
    };
  }

  const templateResult = recognizeUnistrokeGlyph(rawPoints, {
    resampleCount: cfg.resampleCount,
    minScore: cfg.templateMinScore,
    minMargin: cfg.templateMinMargin,
  });

  const smoothed = smoothPoints(rawPoints, cfg.smoothWindowSize);
  const normalized = normalizePoints(smoothed);
  const resampled = resamplePoints(normalized, cfg.resampleCount);
  const bb = boundingBox(resampled);
  const corners = detectCorners(
    resampled,
    cfg.cornerWindowSize,
    cfg.cornerAngleThreshold,
    cfg.cornerMergeDistance,
  );

  return {
    shape: templateResult.shape,
    confidence: templateResult.confidence,
    debug: {
      pointCount: rawPoints.length,
      cornerCount: corners.length,
      isClosed: isClosed(resampled, cfg.closureThreshold),
      boundingBox: { w: bb.width, h: bb.height },
      ...templateResult.debug,
    },
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
  detectVShape,
  detectLShape,
  detect7Shape,
  detectTShape,
  isClosed,
  distance,
  centroid,
  pathLength,
  angleBetweenVectors,
  // Configuração padrão para referência
  DEFAULT_CONFIG,
};