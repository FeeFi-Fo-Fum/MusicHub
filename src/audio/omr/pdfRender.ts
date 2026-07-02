import * as pdfjsLib from 'pdfjs-dist'
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl

export interface RenderedPage {
  pageNum: number
  imageData: ImageData
  width: number
  height: number
}

export async function renderPdfPages(file: File, scale = 2.5): Promise<RenderedPage[]> {
  const buf = await file.arrayBuffer()
  const pdf = await pdfjsLib.getDocument({ data: buf }).promise
  const pages: RenderedPage[] = []

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const viewport = page.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = viewport.width
    canvas.height = viewport.height
    const ctx = canvas.getContext('2d')!
    await page.render({ canvasContext: ctx, viewport, canvas }).promise
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    pages.push({ pageNum: i, imageData, width: canvas.width, height: canvas.height })
  }

  return pages
}
