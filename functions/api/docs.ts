import { parse } from 'cookie'

import { encryptPath } from '../utils/crypto'

interface Env {
  GEM_DECK: R2Bucket
  ADMIN_EMAIL: string
  ENCRYPTION_SECRET: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
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

  // Check for 'scope' query parameter
  const url = new URL(request.url)
  const scope = url.searchParams.get('scope')

  const isAdmin = email === env.ADMIN_EMAIL
  // Admin can see all files ONLY if they explicitly ask for scope=all
  // Otherwise, they see their own files like regular users
  const prefix = (isAdmin && scope === 'all') ? 'docs/' : `docs/${email}/`
  
  const list = await env.GEM_DECK.list({ prefix })
  
  const files = await Promise.all(list.objects.map(async o => {
    // 전체 키를 암호화하여 URL을 불투명하게 만듭니다.
    const encryptedPath = await encryptPath(o.key, env.ENCRYPTION_SECRET)
    
    return {
      key: o.key, // 내부 로직(삭제 등)을 위해 실제 키 유지
      // UI는 현재 표시를 위해 'name'을 사용합니다. 분리해야 합니다.
      name: o.key, 
      display_name: o.key.split('/').pop(),
      url: `/api/file/${encryptedPath}`,
      size: o.size,
      uploaded: o.uploaded
    }
  }))

  return new Response(JSON.stringify({ files }), {
    headers: { 'Content-Type': 'application/json' }
  })
}

// Handle DELETE /api/docs/:filename
// Pages Functions routing for this is tricky if we use same file.
// Better to check request method or path parameter manually if mapped to same.
// But wait, /api/docs is list. /api/docs/:filename is delete.
// We can make a separate file functions/api/docs/[[filename]].ts or handle both here?
// Actually simpler to have api/docs.ts handle LIST, and api/docs/[filename].ts handle DELETE.
// Let's stick to user request structure. But for simplicity let's use query param or POST for now?
// Or just make a delete endpoint: functions/api/delete.ts? 
// No, RESTful is better. Let's create functions/api/docs/[filename].ts next.
