import { parse } from 'cookie'

interface Env {
  ADMIN_EMAIL: string
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context
  const cookieHeader = request.headers.get('Cookie') || ''
  const cookies = parse(cookieHeader)
  const cookieValue = cookies['auth_session']
  if (!cookieValue) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  let email = ''
  let name = ''
  let picture = ''

  try {
    // Try parsing as JSON first
    const sessionData = JSON.parse(cookieValue)
    email = sessionData.email
    name = sessionData.name
    picture = sessionData.picture
  } catch {
    // Fallback for legacy plain text email cookies
    email = cookieValue
    name = email.split('@')[0]
  }

  if (!email) {
    return new Response(JSON.stringify({ authenticated: false }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    })
  }

  return new Response(JSON.stringify({
    authenticated: true,
    email,
    name,
    picture,
    isAdmin: email === env.ADMIN_EMAIL
  }), {
    headers: { 'Content-Type': 'application/json' }
  })
}
