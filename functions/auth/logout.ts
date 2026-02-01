import { serialize } from 'cookie'

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
