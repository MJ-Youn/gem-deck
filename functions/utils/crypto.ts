export async function getCryptoKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  )
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: enc.encode('salt'), // Fixed salt for deterministic key derivation
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  )
}

function buf2hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)]
    .map(x => x.toString(16).padStart(2, '0'))
    .join('')
}

function hex2buf(hex: string) {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)))
}

export async function encryptPath(path: string, secret: string): Promise<string> {
  const key = await getCryptoKey(secret)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(path)
  
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded
  )
  
  // Return IV + Ciphertext as hex
  return buf2hex(iv.buffer) + buf2hex(cipher)
}

export async function decryptPath(encryptedHex: string, secret: string): Promise<string | null> {
  try {
    const key = await getCryptoKey(secret)
    const data = hex2buf(encryptedHex)
    
    // First 12 bytes are IV
    const iv = data.slice(0, 12)
    const ciphertext = data.slice(12)
    
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    )
    
    return new TextDecoder().decode(decrypted)
  } catch (e) {
    return null
  }
}
