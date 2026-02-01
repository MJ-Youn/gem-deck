export const onRequest: PagesFunction<Env> = async (context) => {
  const { env } = context
  
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
}
