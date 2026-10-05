/**
 * Pure image operations on RGBA pixel buffers (same layout as ImageData),
 * so they can be unit-tested without a browser.
 */
import type { PreprocessOptions, PreprocessReport } from './types'

/**
 * Upper bound for the preprocessed canvas, in pixels. Large canvases can crash
 * Safari on iPhone. TODO(vérifier) the actual limit on recent iPhones.
 */
export const MAX_PIXELS = 12_000_000
/** Below this width, a screenshot is upscaled ×2 in 'auto' mode (decision H6). */
export const SMALL_IMAGE_WIDTH = 1000

export function chooseScale(width: number, height: number, mode: PreprocessOptions['scale']): number {
  const wanted = mode === 'auto' ? (width < SMALL_IMAGE_WIDTH ? 2 : 1) : mode
  const pixels = width * height * wanted * wanted
  if (pixels <= MAX_PIXELS) return wanted
  // Too big even after choosing the scale: shrink just enough.
  return Math.floor(Math.sqrt(MAX_PIXELS / (width * height)) * 100) / 100
}

/** Converts to grey in place (R = G = B = luminance) and returns a 256-bin histogram. */
export function toGrayscale(data: Uint8ClampedArray): Uint32Array {
  const histogram = new Uint32Array(256)
  for (let i = 0; i < data.length; i += 4) {
    const luminance = ((data[i]! * 299 + data[i + 1]! * 587 + data[i + 2]! * 114) / 1000) | 0
    data[i] = data[i + 1] = data[i + 2] = luminance
    histogram[luminance]!++
  }
  return histogram
}

export function meanFromHistogram(histogram: Uint32Array): number {
  let total = 0
  let sum = 0
  histogram.forEach((count, level) => {
    total += count
    sum += count * level
  })
  return total === 0 ? 255 : sum / total
}

/** A dark-mode screenshot has a dark background, so a low mean grey level. */
export function isDarkBackground(histogram: Uint32Array): boolean {
  return meanFromHistogram(histogram) < 110
}

export function invertGray(data: Uint8ClampedArray, histogram: Uint32Array): void {
  for (let i = 0; i < data.length; i += 4) data[i] = data[i + 1] = data[i + 2] = 255 - data[i]!
  histogram.reverse()
}

/** Level below which `fraction` of the pixels lie. */
export function percentile(histogram: Uint32Array, fraction: number): number {
  const total = histogram.reduce((a, b) => a + b, 0)
  let seen = 0
  for (let level = 0; level < 256; level++) {
    seen += histogram[level]!
    if (seen >= total * fraction) return level
  }
  return 255
}

/** Linear stretch between the 1st and 99th percentiles. */
export function stretchContrast(data: Uint8ClampedArray, histogram: Uint32Array): void {
  const low = percentile(histogram, 0.01)
  const high = percentile(histogram, 0.99)
  if (high - low < 10) return
  const factor = 255 / (high - low)
  for (let i = 0; i < data.length; i += 4) {
    const value = Math.min(255, Math.max(0, (data[i]! - low) * factor)) | 0
    data[i] = data[i + 1] = data[i + 2] = value
  }
}

/** Otsu's method: the threshold that best separates two grey-level classes. */
export function otsuThreshold(histogram: Uint32Array): number {
  const total = histogram.reduce((a, b) => a + b, 0)
  let sumAll = 0
  for (let level = 0; level < 256; level++) sumAll += level * histogram[level]!
  let sumBackground = 0
  let weightBackground = 0
  let best = 0
  let bestVariance = -1
  for (let level = 0; level < 256; level++) {
    weightBackground += histogram[level]!
    if (weightBackground === 0) continue
    const weightForeground = total - weightBackground
    if (weightForeground === 0) break
    sumBackground += level * histogram[level]!
    const meanBackground = sumBackground / weightBackground
    const meanForeground = (sumAll - sumBackground) / weightForeground
    const variance = weightBackground * weightForeground * (meanBackground - meanForeground) ** 2
    if (variance > bestVariance) {
      bestVariance = variance
      best = level
    }
  }
  return best
}

export function binarize(data: Uint8ClampedArray, threshold: number): void {
  for (let i = 0; i < data.length; i += 4) {
    const value = data[i]! > threshold ? 255 : 0
    data[i] = data[i + 1] = data[i + 2] = value
  }
}

function histogramOf(data: Uint8ClampedArray): Uint32Array {
  const histogram = new Uint32Array(256)
  for (let i = 0; i < data.length; i += 4) histogram[data[i]!]!++
  return histogram
}

/**
 * Full pixel pipeline on an already scaled RGBA buffer, in place:
 * grey → (invert) → (contrast stretch) → (black and white).
 * The result always has dark text on a light background.
 */
export function preprocessPixels(
  data: Uint8ClampedArray,
  options: PreprocessOptions,
): Pick<PreprocessReport, 'inverted' | 'threshold'> {
  let histogram = toGrayscale(data)
  const inverted = options.invert === 'on' || (options.invert === 'auto' && isDarkBackground(histogram))
  if (inverted) invertGray(data, histogram)
  if (options.stretchContrast) {
    stretchContrast(data, histogram)
    histogram = histogramOf(data)
  }
  let threshold: number | null = null
  if (options.binarize) {
    threshold = otsuThreshold(histogram)
    binarize(data, threshold)
  }
  return { inverted, threshold }
}
