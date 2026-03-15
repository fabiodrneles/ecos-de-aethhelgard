/**
 * templateGlyphRecognizer.js
 *
 * Reconhecedor unistroke por templates inspirado na família de
 * algoritmos open-source "$-recognizers" ($1/$P).
 *
 * Mantém apenas glifos de 1 traço para reduzir ambiguidades:
 * number_0, number_1, number_7, letter_v, letter_l
 */

const DEFAULT_TEMPLATE_CONFIG = {
  resampleCount: 64,
  minScore: 0.72,
  minMargin: 0.10,
};

function distance(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function pathLength(points) {
  let length = 0;
  for (let index = 1; index < points.length; index++) {
    length += distance(points[index - 1], points[index]);
  }
  return length;
}

function smoothPoints(points, windowSize = 3) {
  if (points.length <= windowSize) return points.map((point) => ({ ...point }));

  const half = Math.floor(windowSize / 2);
  const smoothed = [];

  for (let index = 0; index < points.length; index++) {
    let sumX = 0;
    let sumY = 0;
    let count = 0;

    const lo = Math.max(0, index - half);
    const hi = Math.min(points.length - 1, index + half);

    for (let cursor = lo; cursor <= hi; cursor++) {
      sumX += points[cursor].x;
      sumY += points[cursor].y;
      count++;
    }

    smoothed.push({ x: sumX / count, y: sumY / count });
  }

  return smoothed;
}

function normalizePoints(points) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const point of points) {
    if (point.x < minX) minX = point.x;
    if (point.y < minY) minY = point.y;
    if (point.x > maxX) maxX = point.x;
    if (point.y > maxY) maxY = point.y;
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const scale = Math.max(width, height) || 1;

  const normalized = points.map((point) => ({
    x: (point.x - minX) / scale,
    y: (point.y - minY) / scale,
  }));

  const offsetX = (1 - width / scale) / 2;
  const offsetY = (1 - height / scale) / 2;

  return normalized.map((point) => ({
    x: point.x + offsetX,
    y: point.y + offsetY,
  }));
}

function resamplePoints(originalPoints, n) {
  const points = originalPoints.map((point) => ({ ...point }));
  if (points.length < 2) return points;

  const totalLength = pathLength(points);
  if (totalLength === 0) return Array.from({ length: n }, () => ({ ...points[0] }));

  const interval = totalLength / (n - 1);
  const result = [{ ...points[0] }];
  let accumulated = 0;

  for (let index = 1; index < points.length && result.length < n; index++) {
    const segmentLength = distance(points[index - 1], points[index]);
    if (accumulated + segmentLength >= interval) {
      const ratio = (interval - accumulated) / segmentLength;
      const interpolated = {
        x: points[index - 1].x + ratio * (points[index].x - points[index - 1].x),
        y: points[index - 1].y + ratio * (points[index].y - points[index - 1].y),
      };
      result.push(interpolated);
      points.splice(index, 0, interpolated);
      accumulated = 0;
    } else {
      accumulated += segmentLength;
    }
  }

  while (result.length < n) {
    result.push({ ...points[points.length - 1] });
  }

  return result.slice(0, n);
}

function preprocessPoints(points, resampleCount) {
  const smoothed = smoothPoints(points, 3);
  const normalized = normalizePoints(smoothed);
  return resamplePoints(normalized, resampleCount);
}

function sequenceDistance(pointsA, pointsB) {
  let total = 0;
  for (let index = 0; index < pointsA.length; index++) {
    total += distance(pointsA[index], pointsB[index]);
  }
  return total / pointsA.length;
}

function reversePoints(points) {
  return [...points].reverse();
}

function toScore(avgDistance) {
  const maxExpected = Math.sqrt(2);
  return Math.max(0, 1 - avgDistance / maxExpected);
}

function buildPolyline(vertices, count) {
  const polyline = [];
  let total = 0;
  const segments = [];

  for (let index = 1; index < vertices.length; index++) {
    const len = distance(vertices[index - 1], vertices[index]);
    segments.push({ start: vertices[index - 1], end: vertices[index], len });
    total += len;
  }

  if (total === 0) {
    return Array.from({ length: count }, () => ({ ...vertices[0] }));
  }

  for (let index = 0; index < count; index++) {
    const target = (index / (count - 1)) * total;
    let walked = 0;

    for (const segment of segments) {
      if (walked + segment.len >= target) {
        const ratio = (target - walked) / (segment.len || 1);
        polyline.push({
          x: segment.start.x + ratio * (segment.end.x - segment.start.x),
          y: segment.start.y + ratio * (segment.end.y - segment.start.y),
        });
        break;
      }
      walked += segment.len;
    }
  }

  return polyline;
}

function buildCircle(count) {
  const circle = [];
  for (let index = 0; index < count; index++) {
    const t = (index / (count - 1)) * Math.PI * 2;
    circle.push({
      x: 0.5 + 0.35 * Math.cos(t),
      y: 0.5 + 0.35 * Math.sin(t),
    });
  }
  return circle;
}

function makeTemplateSet(resampleCount) {
  const base = [
    {
      shape: 'number_0',
      variants: [buildCircle(resampleCount)],
    },
    {
      shape: 'number_1',
      variants: [
        buildPolyline(
          [
            { x: 0.5, y: 0.08 },
            { x: 0.5, y: 0.92 },
          ],
          resampleCount,
        ),
      ],
    },
    {
      shape: 'letter_v',
      variants: [
        buildPolyline(
          [
            { x: 0.14, y: 0.18 },
            { x: 0.50, y: 0.90 },
            { x: 0.86, y: 0.18 },
          ],
          resampleCount,
        ),
        buildPolyline(
          [
            { x: 0.86, y: 0.18 },
            { x: 0.50, y: 0.90 },
            { x: 0.14, y: 0.18 },
          ],
          resampleCount,
        ),
      ],
    },
    {
      shape: 'letter_l',
      variants: [
        buildPolyline(
          [
            { x: 0.20, y: 0.10 },
            { x: 0.20, y: 0.90 },
            { x: 0.82, y: 0.90 },
          ],
          resampleCount,
        ),
        buildPolyline(
          [
            { x: 0.80, y: 0.10 },
            { x: 0.80, y: 0.90 },
            { x: 0.18, y: 0.90 },
          ],
          resampleCount,
        ),
      ],
    },
    {
      shape: 'number_7',
      variants: [
        buildPolyline(
          [
            { x: 0.12, y: 0.16 },
            { x: 0.88, y: 0.16 },
            { x: 0.34, y: 0.92 },
          ],
          resampleCount,
        ),
        buildPolyline(
          [
            { x: 0.88, y: 0.16 },
            { x: 0.12, y: 0.16 },
            { x: 0.66, y: 0.92 },
          ],
          resampleCount,
        ),
      ],
    },
  ];

  return base.flatMap((entry) =>
    entry.variants.map((variant) => ({ shape: entry.shape, points: variant })),
  );
}

function extractDisambiguationFeatures(points) {
  let horizontalTopSegments = 0;
  let topSegments = 0;
  let diagonalDownSegments = 0;
  let movingSegments = 0;

  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];
    const isTopBand = previous.y <= 0.34 && current.y <= 0.34;
    if (isTopBand) {
      topSegments++;
      const dx = Math.abs(current.x - previous.x);
      const dy = Math.abs(current.y - previous.y);
      if (dx > dy * 2.2) {
        horizontalTopSegments++;
      }
    }

    const dx = Math.abs(current.x - previous.x);
    const dy = current.y - previous.y;
    if (dx > 0.005 || Math.abs(dy) > 0.005) {
      movingSegments++;
      if (dy > 0.01 && Math.abs(dy) >= dx * 0.7) {
        diagonalDownSegments++;
      }
    }
  }

  let maxY = -Infinity;
  let maxYIndex = 0;
  for (let index = 0; index < points.length; index++) {
    if (points[index].y > maxY) {
      maxY = points[index].y;
      maxYIndex = index;
    }
  }

  const lowestX = points[maxYIndex].x;
  const start = points[0];
  const end = points[points.length - 1];
  const endpointMeanY = (points[0].y + points[points.length - 1].y) / 2;
  const centerWeight = 1 - Math.min(1, Math.abs(lowestX - 0.5) / 0.5);
  const centerBottomness = Math.max(0, maxY - endpointMeanY) * centerWeight;
  const endpointHorizontalDelta = Math.abs(end.x - start.x);
  const endpointVerticalDelta = Math.abs(end.y - start.y);
  const endpointDistance = distance(start, end);
  const bottomCenterDeviation = Math.abs(lowestX - 0.5);

  return {
    topHorizontalRatio:
      topSegments > 0 ? horizontalTopSegments / topSegments : 0,
    diagonalDownRatio:
      movingSegments > 0 ? diagonalDownSegments / movingSegments : 0,
    centerBottomness,
    endpointHorizontalDelta,
    endpointVerticalDelta,
    endpointDistance,
    bottomCenterDeviation,
  };
}

function applyDisambiguationScores(scoreByShape, features) {
  const adjusted = { ...scoreByShape };

  if (adjusted.number_7 !== undefined) {
    adjusted.number_7 += Math.max(-0.12, Math.min(0.12, (features.topHorizontalRatio - 0.12) * 0.7));
    adjusted.number_7 += Math.max(-0.10, Math.min(0.10, (features.diagonalDownRatio - 0.20) * 0.6));
    adjusted.number_7 += Math.max(-0.08, Math.min(0.08, (features.endpointVerticalDelta - 0.20) * 0.5));
    adjusted.number_7 -= Math.max(0, (0.18 - features.bottomCenterDeviation) * 0.25);
  }

  if (adjusted.letter_v !== undefined) {
    adjusted.letter_v += Math.max(-0.12, Math.min(0.12, (features.centerBottomness - 0.10) * 0.8));
    adjusted.letter_v += Math.max(-0.10, Math.min(0.10, (features.endpointHorizontalDelta - 0.22) * 0.6));
    adjusted.letter_v -= Math.max(0, (features.topHorizontalRatio - 0.28) * 0.35);
    adjusted.letter_v -= Math.max(0, (features.bottomCenterDeviation - 0.22) * 0.25);
  }

  if (adjusted.number_0 !== undefined) {
    adjusted.number_0 += Math.max(-0.12, Math.min(0.12, (0.24 - features.endpointDistance) * 0.8));
  }

  if (adjusted.number_1 !== undefined) {
    adjusted.number_1 += Math.max(-0.12, Math.min(0.12, (features.endpointVerticalDelta - 0.38) * 0.6));
    adjusted.number_1 -= Math.max(0, (features.endpointHorizontalDelta - 0.16) * 0.4);
  }

  return adjusted;
}

function validateTopShape(best, features) {
  if (best.shape === 'number_7') {
    const valid =
      features.topHorizontalRatio >= 0.10 &&
      features.diagonalDownRatio >= 0.18 &&
      features.endpointVerticalDelta >= 0.18;
    return {
      valid,
      reason: valid ? 'validated_7' : 'rejected_7_missing_signature',
    };
  }

  if (best.shape === 'letter_v') {
    const valid =
      features.centerBottomness >= 0.10 &&
      features.endpointHorizontalDelta >= 0.22 &&
      features.topHorizontalRatio <= 0.32;
    return {
      valid,
      reason: valid ? 'validated_v' : 'rejected_v_missing_signature',
    };
  }

  if (best.shape === 'number_0') {
    const valid = features.endpointDistance <= 0.30;
    return {
      valid,
      reason: valid ? 'validated_0' : 'rejected_0_open_loop',
    };
  }

  if (best.shape === 'number_1') {
    const valid =
      features.endpointVerticalDelta >= 0.34 &&
      features.endpointHorizontalDelta <= 0.20;
    return {
      valid,
      reason: valid ? 'validated_1' : 'rejected_1_non_vertical',
    };
  }

  return { valid: true, reason: 'validated_generic' };
}

function rankScores(scoreByShape) {
  return Object.entries(scoreByShape)
    .map(([shape, score]) => ({ shape, score: Math.max(0, Math.min(1, score)) }))
    .sort((left, right) => right.score - left.score);
}

function matchTemplate(points, templatePoints) {
  const forward = sequenceDistance(points, templatePoints);
  const backward = sequenceDistance(points, reversePoints(templatePoints));
  return Math.min(forward, backward);
}

function bestScoreByShape(processedPoints, templates) {
  const scoreByShape = {};

  for (const template of templates) {
    const avgDistance = matchTemplate(processedPoints, template.points);
    const score = toScore(avgDistance);
    const previous = scoreByShape[template.shape];
    scoreByShape[template.shape] =
      previous === undefined ? score : Math.max(previous, score);
  }

  return scoreByShape;
}

function recognizeUnistrokeGlyph(rawPoints, config = {}) {
  const cfg = { ...DEFAULT_TEMPLATE_CONFIG, ...config };

  if (!rawPoints || rawPoints.length < 4) {
    return {
      shape: 'unknown',
      confidence: 0,
      debug: { reason: 'too_few_points_for_template' },
    };
  }

  const processed = preprocessPoints(rawPoints, cfg.resampleCount);
  const templates = makeTemplateSet(cfg.resampleCount);
  const rawScores = bestScoreByShape(processed, templates);
  const features = extractDisambiguationFeatures(processed);
  const adjustedScores = applyDisambiguationScores(rawScores, features);
  const ranking = rankScores(adjustedScores);

  const best = ranking[0] || { shape: 'unknown', score: 0 };
  const second = ranking[1] || { shape: 'unknown', score: 0 };
  const margin = best.score - second.score;

  if (best.score < cfg.minScore) {
    return {
      shape: 'unknown',
      confidence: best.score,
      debug: {
        reason: 'template_score_too_low',
        best,
        second,
        margin,
        features,
      },
    };
  }

  if (margin < cfg.minMargin) {
    return {
      shape: 'unknown',
      confidence: best.score,
      debug: {
        reason: 'template_ambiguous_top2',
        best,
        second,
        margin,
        features,
      },
    };
  }

  const validation = validateTopShape(best, features);
  if (!validation.valid) {
    return {
      shape: 'unknown',
      confidence: best.score,
      debug: {
        reason: validation.reason,
        best,
        second,
        margin,
        features,
      },
    };
  }

  return {
    shape: best.shape,
    confidence: Math.max(0.5, best.score),
    debug: {
      reason: 'template_match',
      validation: validation.reason,
      best,
      second,
      margin,
      features,
    },
  };
}

export {
  recognizeUnistrokeGlyph,
  preprocessPoints,
  makeTemplateSet,
  extractDisambiguationFeatures,
};
