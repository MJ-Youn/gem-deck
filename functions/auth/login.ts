import { serialize } from '../utils/cookie.ts';
import { verifyTurnstile } from '../utils/turnstile.ts';

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
  const secretKey = env.TURNSTILE_SECRET_KEY || ''
  const ip = request.headers.get('CF-Connecting-IP') || undefined;
  
  if (!(await verifyTurnstile(cfToken, secretKey, ip))) {
    return new Response('Turnstile verification failed', { status: 403 })
  }

  // CSRF 방지를 위한 state 생성
  const state = crypto.randomUUID()
  
  const params = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    redirect_uri: env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    state: state
  })

  const oauthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`

  // state를 쿠키에 저장
  const stateCookie = serialize('oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 5, // 5 minutes
    sameSite: 'lax',
  })
  
  return new Response(null, {
    status: 302,
    headers: {
      'Location': oauthUrl,
      'Set-Cookie': stateCookie,
    },
  })
}

interface Env {
  GOOGLE_CLIENT_ID: string
  GOOGLE_CALLBACK_URL: string
  TURNSTILE_SECRET_KEY?: string
}
