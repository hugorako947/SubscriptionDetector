import { recognize, type OcrProgress } from './engine'
import { groupIntoLines, wordsFromBlocks } from './lines'
import { chooseScale, preprocessPixels } from './preprocess'
import type { OcrPageResult, PageSegmentationMode, PreprocessOptions, PreprocessReport } from './types'

/** Decodes an image file. createImageBitmap first, <img> as a fallback (older Safari, unusual formats). */
async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; release: () => void }> {
  try {
    const bitmap = await createImageBitmap(file)
    return { source: bitmap, width: bitmap.width, height: bitmap.height, release: () => bitmap.close() }
  } catch {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.src = url
    try {
      await img.decode()
    } catch (error) {
      URL.revokeObjectURL(url)
      throw new Error("Image illisible : le format n'est peut-être pas pris en charge par ce navigateur.", {
        cause: error,
      })
    }
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, release: () => URL.revokeObjectURL(url) }
  }
}

export async function preprocessFile(
  file: Blob,
  options: PreprocessOptions,
): Promise<{ canvas: HTMLCanvasElement; report: PreprocessReport }> {
  const image = await decode(file)
  try {
    const scale = chooseScale(image.width, image.height, options.scale)
    const width = Math.round(image.width * scale)
    const height = Math.round(image.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new Error('Canvas indisponible sur ce navigateur.')
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image.source, 0, 0, width, height)
    const pixels = context.getImageData(0, 0, width, height)
    const { inverted, threshold } = preprocessPixels(pixels.data, options)
    context.putImageData(pixels, 0, 0)
    return { canvas, report: { scale, inverted, threshold, width, height } }
  } finally {
    image.release()
  }
}

/** One screenshot, start to finish. The caller owns (and must release) the returned canvas. */
export async function readScreenshot(
  file: Blob,
  options: PreprocessOptions,
  psm: PageSegmentationMode,
  onProgress?: OcrProgress,
): Promise<OcrPageResult & { canvas: HTMLCanvasElement }> {
  const started = performance.now()
  const { canvas, report } = await preprocessFile(file, options)
  const preprocessed = performance.now()
  const page = await recognize(canvas, psm, onProgress)
  const recognized = performance.now()
  return {
    canvas,
    lines: groupIntoLines(wordsFromBlocks(page.blocks)),
    rawText: page.text,
    preprocess: report,
    timingsMs: { preprocess: Math.round(preprocessed - started), recognize: Math.round(recognized - preprocessed) },
  }
}
