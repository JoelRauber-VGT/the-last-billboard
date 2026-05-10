/**
 * Layout algorithm for billboard slot dimensions
 * Calculates optimal layout options based on pixel count and image aspect ratio
 */

export interface LayoutOption {
  width: number;
  height: number;
  ratio: number; // width / height
  fitType: 'fit' | 'crop';
  label: string; // e.g., "20 × 10", "2:1 · fit"
}

export interface LayoutSuggestion {
  option: LayoutOption;
  isBestFit?: boolean;
  isSquarish?: boolean;
  isRotated?: boolean;
  isExtreme?: boolean;
}

/**
 * Get all divisor pairs for a given pixel count
 * Returns pairs as [width, height] where width * height = pixelCount
 */
export function getDivisorPairs(pixelCount: number): [number, number][] {
  const pairs: [number, number][] = [];

  for (let i = 1; i <= Math.sqrt(pixelCount); i++) {
    if (pixelCount % i === 0) {
      const j = pixelCount / i;
      // Add both orientations
      pairs.push([j, i]); // wider (landscape)
      if (i !== j) {
        pairs.push([i, j]); // taller (portrait)
      }
    }
  }

  // Sort by ratio descending (widest first)
  return pairs.sort((a, b) => (b[0] / b[1]) - (a[0] / a[1]));
}

/**
 * Calculate aspect ratio from width and height
 */
export function calculateAspectRatio(width: number, height: number): number {
  return width / height;
}

/**
 * Format ratio as string (e.g., "16:9" or "2.3:1")
 */
export function formatRatio(ratio: number): string {
  // Try common ratios first
  const commonRatios: [number, string][] = [
    [16 / 9, '16:9'],
    [4 / 3, '4:3'],
    [3 / 2, '3:2'],
    [21 / 9, '21:9'],
    [1, '1:1'],
    [9 / 16, '9:16'],
    [2 / 3, '2:3'],
  ];

  for (const [value, label] of commonRatios) {
    if (Math.abs(ratio - value) < 0.05) {
      return label;
    }
  }

  // Format as decimal with one decimal place
  if (ratio >= 1) {
    return `${ratio.toFixed(1)}:1`;
  } else {
    return `1:${(1 / ratio).toFixed(1)}`;
  }
}

/**
 * Determine if image will fit or crop in given layout
 * Returns 'fit' if image can be shown in full, 'crop' if parts will be cut off
 */
export function determineFitType(
  imageRatio: number,
  layoutRatio: number,
  tolerance: number = 0.05
): 'fit' | 'crop' {
  // In cover mode, image always fills the container
  // If ratios match closely, the entire image is visible (fit)
  // Otherwise, parts are cropped
  return Math.abs(imageRatio - layoutRatio) < tolerance ? 'fit' : 'crop';
}

/**
 * Calculate difference between two aspect ratios
 * Lower value = closer match
 */
export function ratioDifference(ratio1: number, ratio2: number): number {
  // Use logarithmic scale for better perceptual matching
  return Math.abs(Math.log(ratio1) - Math.log(ratio2));
}

/**
 * Find the layout option that best matches the image aspect ratio
 */
export function findBestFit(
  pairs: [number, number][],
  imageRatio: number
): [number, number] {
  let bestPair = pairs[0];
  let bestDiff = Infinity;

  for (const pair of pairs) {
    const layoutRatio = pair[0] / pair[1];
    const diff = ratioDifference(imageRatio, layoutRatio);

    if (diff < bestDiff) {
      bestDiff = diff;
      bestPair = pair;
    }
  }

  return bestPair;
}

/**
 * Find the most square-ish layout (ratio closest to 1:1)
 */
export function findSquarishOption(
  pairs: [number, number][],
  exclude?: [number, number]
): [number, number] {
  let bestPair = pairs[0];
  let bestDiff = Infinity;

  for (const pair of pairs) {
    // Skip excluded pair
    if (exclude && pair[0] === exclude[0] && pair[1] === exclude[1]) {
      continue;
    }

    const ratio = pair[0] / pair[1];
    const diff = Math.abs(Math.log(ratio)); // log(1) = 0 (perfect square)

    if (diff < bestDiff) {
      bestDiff = diff;
      bestPair = pair;
    }
  }

  return bestPair;
}

/**
 * Find the most extreme layout (highest ratio - banner/skyscraper)
 */
export function findExtremeOption(
  pairs: [number, number][],
  exclude?: [number, number][]
): [number, number] {
  let extremePair = pairs[0];
  let maxRatio = 0;

  for (const pair of pairs) {
    // Skip excluded pairs
    if (exclude?.some(ex => ex[0] === pair[0] && ex[1] === pair[1])) {
      continue;
    }

    const ratio = Math.max(pair[0] / pair[1], pair[1] / pair[0]);

    if (ratio > maxRatio) {
      maxRatio = ratio;
      extremePair = pair;
    }
  }

  return extremePair;
}

/**
 * Create a layout option object from dimensions and image ratio
 */
export function createLayoutOption(
  width: number,
  height: number,
  imageRatio: number
): LayoutOption {
  const ratio = width / height;
  const fitType = determineFitType(imageRatio, ratio);
  const ratioLabel = formatRatio(ratio);

  return {
    width,
    height,
    ratio,
    fitType,
    label: `${width} × ${height}`,
  };
}

/**
 * Get top 4 layout suggestions for a given pixel count and image dimensions
 * Algorithm:
 * 1. Best fit - closest to image aspect ratio
 * 2. Squarish - closest to 1:1 ratio
 * 3. Rotated - 90° rotation of best fit (if different)
 * 4. Extreme - highest ratio (banner/skyscraper style)
 *
 * Returns fewer than 4 if not enough unique options exist
 */
export function getTopLayoutOptions(
  pixelCount: number,
  imageWidth: number,
  imageHeight: number
): LayoutSuggestion[] {
  const imageRatio = calculateAspectRatio(imageWidth, imageHeight);
  const pairs = getDivisorPairs(pixelCount);

  if (pairs.length === 0) {
    throw new Error(`No valid layout options for ${pixelCount} pixels`);
  }

  const suggestions: LayoutSuggestion[] = [];
  const usedPairs: [number, number][] = [];

  // 1. Best fit
  const bestFitPair = findBestFit(pairs, imageRatio);
  suggestions.push({
    option: createLayoutOption(bestFitPair[0], bestFitPair[1], imageRatio),
    isBestFit: true,
  });
  usedPairs.push(bestFitPair);

  // 2. Squarish option (if different from best fit)
  const squarishPair = findSquarishOption(pairs, bestFitPair);
  if (!usedPairs.some(p => p[0] === squarishPair[0] && p[1] === squarishPair[1])) {
    suggestions.push({
      option: createLayoutOption(squarishPair[0], squarishPair[1], imageRatio),
      isSquarish: true,
    });
    usedPairs.push(squarishPair);
  }

  // 3. Rotated version of best fit (if different and not already used)
  const rotatedPair: [number, number] = [bestFitPair[1], bestFitPair[0]];
  if (
    rotatedPair[0] !== rotatedPair[1] && // skip if square
    pairs.some(p => p[0] === rotatedPair[0] && p[1] === rotatedPair[1]) &&
    !usedPairs.some(p => p[0] === rotatedPair[0] && p[1] === rotatedPair[1])
  ) {
    suggestions.push({
      option: createLayoutOption(rotatedPair[0], rotatedPair[1], imageRatio),
      isRotated: true,
    });
    usedPairs.push(rotatedPair);
  }

  // 4. Extreme option (if we still have room)
  if (suggestions.length < 4) {
    const extremePair = findExtremeOption(pairs, usedPairs);
    if (!usedPairs.some(p => p[0] === extremePair[0] && p[1] === extremePair[1])) {
      suggestions.push({
        option: createLayoutOption(extremePair[0], extremePair[1], imageRatio),
        isExtreme: true,
      });
      usedPairs.push(extremePair);
    }
  }

  // Fill remaining slots with next best options (if any)
  while (suggestions.length < 4 && usedPairs.length < pairs.length) {
    const unusedPair = pairs.find(
      p => !usedPairs.some(used => used[0] === p[0] && used[1] === p[1])
    );

    if (!unusedPair) break;

    suggestions.push({
      option: createLayoutOption(unusedPair[0], unusedPair[1], imageRatio),
    });
    usedPairs.push(unusedPair);
  }

  return suggestions;
}

/**
 * Calculate dimensions for a given pixel count and desired aspect ratio
 * Used for preview rendering at a target scale
 */
export function calculateDimensionsFromRatio(
  pixelCount: number,
  ratio: number
): { width: number; height: number } {
  const height = Math.sqrt(pixelCount / ratio);
  const width = pixelCount / height;
  return { width: Math.round(width), height: Math.round(height) };
}

/**
 * Validate that layout dimensions match pixel count
 */
export function validateLayout(
  width: number,
  height: number,
  expectedPixelCount: number
): boolean {
  return width * height === expectedPixelCount;
}
