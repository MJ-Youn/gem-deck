import { decryptPath } from '../../utils/crypto'

interface Env {
  GEM_DECK: R2Bucket
  ENCRYPTION_SECRET: string
}

/**
 * 암호화된 경로 또는 일반 경로를 통해 파일을 서빙합니다.
 *
 * @param context Pages 컨텍스트
 * @returns Response 파일 내용
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  const { params, env } = context
  
  // path can be:
  // 1. Encrypted hex string (single segment)
  // 2. Legacy cleartext path array (e.g. ['docs', 'user', 'file.html'])
  
  const pathParam = params.path
  let key: string | null = null

  // 보안 강화: 암호화된 단일 경로만 허용 (IDOR 방지)
  // Only allow encrypted paths to prevent unauthorized direct access.
  if (Array.isArray(pathParam) && pathParam.length === 1) {
    key = await decryptPath(pathParam[0], env.ENCRYPTION_SECRET)
  }

  if (!key) {
    return new Response('Forbidden: Invalid or unencrypted path', { status: 403 })
  }

  const object = await env.GEM_DECK.get(key)

  if (!object) {
    return new Response('Not Found', { status: 404 })
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)

  // Add security headers: Prevent XSS and MIME sniffing
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src * data:; sandbox allow-scripts allow-forms allow-popups;")

  return new Response(object.body, { headers })
}
