import { parse } from 'cookie'
import { load } from 'cheerio'

interface Env {
  PPT_STORAGE: R2Bucket
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
  const object = await env.PPT_STORAGE.get(key)
  
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
      await Promise.all(imagesToDelete.map(k => env.PPT_STORAGE.delete(k)))
    }
  }

  // 3. Delete HTML file
  await env.PPT_STORAGE.delete(key)

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
