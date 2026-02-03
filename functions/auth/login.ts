/**
 * 로그인 요청을 처리합니다.
 * Turnstile 토큰을 검증하고 Google OAuth 인증 URL로 리다이렉트합니다.
 *
 * @param context Pages 컨텍스트
 * @returns 리다이렉트 Response 또는 에러 응답
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const url = new URL(request.url)
  const cfToken = url.searchParams.get('cf_token')

  if (!cfToken) {
    return new Response('Turnstile token required', { status: 403 })
  }

  // Verify Turnstile Token
  // Use env.TURNSTILE_SECRET_KEY if available, otherwise use Test Secret Key
  const secretKey = env.TURNSTILE_SECRET_KEY || '1x00000000000000000000AA'
  
  const formData = new FormData()
  formData.append('secret', secretKey)
  formData.append('response', cfToken)
  formData.append('remoteip', request.headers.get('CF-Connecting-IP') || '')

  const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData
  })

  const outcome = await result.json() as { success: boolean }
  if (!outcome.success) {
    return new Response('Turnstile verification failed', { status: 403 })
  }
  
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online'
  })
  
  return Response.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`, 302)
}

interface Env {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CALLBACK_URL: string
  TURNSTILE_SECRET_KEY?: string
}
