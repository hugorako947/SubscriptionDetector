import { describe, expect, it } from 'vitest'
import {
  MAX_PIXELS,
  chooseScale,
  isDarkBackground,
  otsuThreshold,
  preprocessPixels,
  toGrayscale,
} from './preprocess'
import { DEFAULT_PREPROCESS } from './types'

/** RGBA buffer filled with one colour, with an optional block of another colour. */
function image(pixels: number, background: [number, number, number], ink?: [number, number, number], inkPixels = 0) {
  const data = new Uint8ClampedArray(pixels * 4)
  for (let p = 0; p < pixels; p++) {
    const [r, g, b] = p < inkPixels && ink ? ink : background
    data.set([r, g, b, 255], p * 4)
  }
  return data
}

describe('chooseScale', () => {
  it('doubles small images only in auto mode', () => {
    expect(chooseScale(720, 1600, 'auto')).toBe(2)
    expect(chooseScale(1170, 2532, 'auto')).toBe(1)
  })
  it('respects a forced scale when it fits', () => {
    expect(chooseScale(1170, 2532, 2)).toBe(2)
  })
  it('never exceeds the pixel budget', () => {
    const scale = chooseScale(1290, 2796, 2)
    expect(1290 * 2796 * scale * scale).toBeLessThanOrEqual(MAX_PIXELS)
    expect(scale).toBeLessThan(2)
  })
  it('shrinks huge images', () => {
    const scale = chooseScale(4000, 6000, 'auto')
    expect(scale).toBeLessThan(1)
    expect(4000 * 6000 * scale * scale).toBeLessThanOrEqual(MAX_PIXELS)
  })
})

describe('toGrayscale', () => {
  it('uses perceived luminance', () => {
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255])
    toGrayscale(data)
    expect([data[0], data[4], data[8]]).toEqual([76, 149, 29])
  })
})

describe('dark background detection', () => {
  it('recognises a dark-mode screenshot', () => {
    expect(isDarkBackground(toGrayscale(image(100, [20, 24, 28], [230, 230, 230], 10)))).toBe(true)
  })
  it('keeps a light screenshot as is', () => {
    expect(isDarkBackground(toGrayscale(image(100, [250, 250, 250], [30, 30, 30], 10)))).toBe(false)
  })
})

describe('otsuThreshold', () => {
  it('falls between the two grey populations', () => {
    const histogram = new Uint32Array(256)
    histogram[40] = 300
    histogram[220] = 700
    const t = otsuThreshold(histogram)
    expect(t).toBeGreaterThanOrEqual(40)
    expect(t).toBeLessThan(220)
  })
})

describe('preprocessPixels', () => {
  it('always ends with dark text on a light background', () => {
    const dark = image(100, [15, 15, 15], [235, 235, 235], 10)
    const report = preprocessPixels(dark, DEFAULT_PREPROCESS)
    expect(report.inverted).toBe(true)
    expect(dark[0]).toBeLessThan(60) // former light text, now dark
    expect(dark[99 * 4]).toBeGreaterThan(200) // former dark background, now light
  })
  it('darkens pale grey text with the contrast stretch', () => {
    const pale = image(1000, [255, 255, 255], [170, 170, 170], 100)
    preprocessPixels(pale, { ...DEFAULT_PREPROCESS, invert: 'off' })
    expect(pale[0]).toBeLessThan(40)
  })
  it('produces pure black and white when binarize is on', () => {
    const data = image(100, [240, 240, 240], [60, 60, 60], 30)
    const report = preprocessPixels(data, { ...DEFAULT_PREPROCESS, binarize: true })
    expect(report.threshold).not.toBeNull()
    expect(new Set(Array.from(data).filter((_, i) => i % 4 === 0))).toEqual(new Set([0, 255]))
  })
})
