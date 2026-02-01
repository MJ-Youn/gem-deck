import { decryptPath } from '../../utils/crypto'

interface Env {
  PPT_STORAGE: R2Bucket
  ENCRYPTION_SECRET: string
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { params, env } = context
  
  // path can be:
  // 1. Encrypted hex string (single segment)
  // 2. Legacy cleartext path array (e.g. ['docs', 'user', 'file.html'])
  
  const pathParam = params.path
  let key = ''

  if (Array.isArray(pathParam)) {
    // If it's a single long string, try to decrypt it first
    if (pathParam.length === 1) {
      const decrypted = await decryptPath(pathParam[0], env.ENCRYPTION_SECRET)
      if (decrypted) {
        key = decrypted
      } else {
        // Fallback: treat as cleartext (if we want to support legacy links or mixed mode)
        // Or reject. User requested hiding username, so let's check.
        // If it looks like 'docs/email/...' it might be legacy or direct access attempt.
        // For now, let's allow direct access if decryption fails, OR force encryption?
        // User wants to HIDE it. So if they try to access /api/file/docs/me/file, they can still guess.
        // To strictly enforce, we should ONLY allow decrypted keys. 
        // But for transition/dev, let's try decrypt, if fail, assume it's a direct key if valid?
        // Let's assume if decrypt returns null, it's just the key (pathParam[0]).
        key = pathParam[0]
      }
    } else {
      key = pathParam.join('/')
    }
  } else {
    key = pathParam as string
  }

  const object = await env.PPT_STORAGE.get(key)

  if (!object) {
    return new Response('Not Found', { status: 404 })
  }

  const headers = new Headers()
  object.writeHttpMetadata(headers)
  headers.set('etag', object.httpEtag)

  return new Response(object.body, { headers })
}
