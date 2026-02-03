import { serialize } from 'cookie'

/**
 * 로그아웃 요청을 처리합니다.
 * 세션 쿠키를 만료시키고 메인 페이지로 리다이렉트합니다.
 *
 * @returns 리다이렉트 Response
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
export const onRequest: PagesFunction = async () => {
  const cookie = serialize('auth_session', '', {
    httpOnly: true,
    secure: true,
    path: '/',
    maxAge: 0 // Expire immediately
  })

  return new Response(null, {
    status: 302,
    headers: {
      'Location': '/',
      'Set-Cookie': cookie
    }
  })
}
