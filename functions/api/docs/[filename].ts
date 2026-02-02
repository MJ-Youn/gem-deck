import { parse } from 'cookie'
import { load } from 'cheerio'

interface Env {
  GEM_DECK: R2Bucket
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, params, env } = context
  const filename = params.filename as string
  
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

  // Security: only allow deleting own file
  const key = `docs/${email}/${filename}`
  
  // 1. Fetch HTML to find associated images
  const object = await env.GEM_DECK.get(key)
  
  if (object) {
    const htmlContent = await object.text()
    const $ = load(htmlContent)
    
    const imagesToDelete: string[] = []
    
    $('img').each((_, elem) => {
      const src = $(elem).attr('src')
      // src format: /api/file/image/user/uuid
      if (src && src.startsWith('/api/file/image/')) {
        const imageKey = src.replace('/api/file/', '')
        // Verify key belongs to user
        if (imageKey.startsWith(`image/${email}/`)) {
          imagesToDelete.push(imageKey)
        }
      }
    })

    // 2. Delete images
    if (imagesToDelete.length > 0) {
      await Promise.all(imagesToDelete.map(k => env.GEM_DECK.delete(k)))
    }
  }

  // 3. Delete HTML file
  await env.GEM_DECK.delete(key)

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

export const onRequestPatch: PagesFunction<Env> = async (context) => {
  const { request, params, env } = context
  const filename = params.filename as string

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

  let body: any
  try {
    body = await request.json()
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const newNameWithoutExt = body.name
  if (!newNameWithoutExt) return new Response('Missing name', { status: 400 })

  // Ensure new name has .html extension
  const newName = newNameWithoutExt.endsWith('.html') ? newNameWithoutExt : `${newNameWithoutExt}.html`

  const oldKey = `docs/${email}/${filename}`
  const newKey = `docs/${email}/${newName}`

  if (oldKey === newKey) {
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  const object = await env.GEM_DECK.get(oldKey)
  if (!object) {
    return new Response('File not found', { status: 404 })
  }

  // Copy (Put new)
  await env.GEM_DECK.put(newKey, object.body)

  // Delete old (Only the HTML file, keep images as they are reused)
  await env.GEM_DECK.delete(oldKey)

  return new Response(JSON.stringify({ success: true, newName }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
