import { parse } from 'cookie'

import { encryptPath } from '../utils/crypto'

interface Env {
  GEM_DECK: R2Bucket
  ADMIN_EMAIL: string
  ENCRYPTION_SECRET: string
}

/**
 * 파일 목록 조회 요청을 처리합니다.
 * 관리자는 모든 파일을, 일반 사용자는 자신의 파일만 조회할 수 있습니다.
 * 
 * @param context Pages 컨텍스트
 * @returns Response 파일 목록 JSON
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
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
