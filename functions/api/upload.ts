import { parse } from 'cookie'
import { load } from 'cheerio'

import { encryptPath } from '../utils/crypto'

interface Env {
  PPT_STORAGE: R2Bucket
  ENCRYPTION_SECRET: string
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const cookies = parse(request.headers.get('Cookie') || '')
  const cookieValue = cookies['auth_session']
  if (!cookieValue) return new Response('Unauthorized', { status: 401 })

  let email = ''
  try {
    const sessionHelper = JSON.parse(cookieValue)
    email = sessionHelper.email
  } catch {
    email = cookieValue
  }

  if (!email) return new Response('Unauthorized', { status: 401 })

  const formData = await request.formData()
  const htmlFile = formData.get('html') as File
  const imageFiles = formData.getAll('images') as File[]

  if (!htmlFile) return new Response(JSON.stringify({ error: 'No HTML' }), { status: 400 })

  // 1. Parse HTML
  const htmlContent = await htmlFile.text()
  const $ = load(htmlContent)
  
  const imageMapping = new Map<string, string>()
  const usedImages = new Set<string>()

  // 2. Analyze
  $('img').each((_, elem) => {
    const src = $(elem).attr('src')
    if (src && !src.startsWith('http') && !src.startsWith('//')) {
      const filename = src.split('/').pop()
      if (filename) usedImages.add(filename)
    }
  })

  // 3. Upload Images
  for (const img of imageFiles) {
    if (usedImages.has(img.name)) {
      const ext = img.name.split('.').pop()
      const randomName = crypto.randomUUID() + '.' + ext
      const key = `image/${email}/${randomName}`
      
      await env.PPT_STORAGE.put(key, await img.arrayBuffer(), {
        httpMetadata: { contentType: img.type }
      })
      
      const encryptedKey = await encryptPath(key, env.ENCRYPTION_SECRET)
      imageMapping.set(img.name, `/api/file/${encryptedKey}`)
    }
  }

  // 4. Rewrite
  $('img').each((_, elem) => {
    const src = $(elem).attr('src')
    if (src) {
      const filename = src.split('/').pop()
      if (filename && imageMapping.has(filename)) {
        $(elem).attr('src', imageMapping.get(filename)!)
      }
    }
  })

  // 5. Upload HTML
  // Docs list returns key, but UI expects simple name?
  // Our list API returns full key.
  const htmlKey = `docs/${email}/${htmlFile.name}`
  await env.PPT_STORAGE.put(htmlKey, $.html(), {
    httpMetadata: { contentType: 'text/html' }
  })

  return new Response(JSON.stringify({ 
    success: true, 
    uploadedImages: imageMapping.size 
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
