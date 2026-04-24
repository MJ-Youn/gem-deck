/**
 * 비밀 키와 salt를 사용하여 암호화 키를 생성하고 캐싱합니다.
 *
 * @param secret 비밀 키 문자열
 * @param salt 키 파생에 사용할 salt
 * @returns 생성된 CryptoKey Promise
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-14
 */
const keyCache = new Map<string, Promise<CryptoKey>>();

export function getCryptoKey(secret: string, salt: string = 'salt'): Promise<CryptoKey> {
    const cacheKey = `${secret}:${salt}`;
    const cached = keyCache.get(cacheKey);
    if (cached) return cached;

    const promise = (async () => {
        const enc = new TextEncoder();
        const keyMaterial = await crypto.subtle.importKey(
            'raw',
            enc.encode(secret),
            { name: 'PBKDF2' },
            false,
            ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            {
                name: 'PBKDF2',
                salt: enc.encode(salt),
                iterations: 100000,
                hash: 'SHA-256',
            },
            keyMaterial,
            { name: 'AES-GCM', length: 256 },
            true,
            ['encrypt', 'decrypt'],
        );
    })();

    keyCache.set(cacheKey, promise);
    return promise;
}



/**
 * ArrayBuffer를 16진수 문자열로 변환합니다.
 *
 * @param buffer 변환할 버퍼
 * @returns 16진수 문자열
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
function buf2hex(buffer: ArrayBuffer) {
    return [...new Uint8Array(buffer)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

/**
 * 16진수 문자열을 Uint8Array로 변환합니다.
 *
 * @param hex 16진수 문자열
 * @returns 변환된 Uint8Array
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
function hex2buf(hex: string) {
    return new Uint8Array(hex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)));
}

/**
 * 세션 데이터를 서명합니다. (HMAC-SHA256)
 *
 * @param payload 서명할 데이터
 * @param secret 비밀 키
 * @returns 서명된 세션 문자열 (hexPayload.hexSignature)
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-14
 */
export async function signSession(payload: any, secret: string): Promise<string> {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        enc.encode(secret),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const payloadStr = JSON.stringify(payload);
    const data = enc.encode(payloadStr);
    const signature = await crypto.subtle.sign('HMAC', key, data);

    return `${buf2hex(data.buffer)}.${buf2hex(signature)}`;
}

/**
 * 서명된 세션 문자열을 검증하고 데이터를 복구합니다.
 *
 * @param token 서명된 세션 문자열
 * @param secret 비밀 키
 * @returns 복구된 데이터 또는 실패 시 null
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-14
 */
export async function verifySession<T>(token: string, secret: string): Promise<T | null> {
    try {
        const [hexPayload, hexSignature] = token.split('.');
        if (!hexPayload || !hexSignature) return null;

        const payloadBuf = hex2buf(hexPayload);
        const payloadStr = new TextDecoder().decode(payloadBuf);
        const payload = JSON.parse(payloadStr) as T;

        const enc = new TextEncoder();
        const key = await crypto.subtle.importKey(
            'raw',
            enc.encode(secret),
            { name: 'HMAC', hash: 'SHA-256' },
            false,
            ['verify']
        );

        const signature = hex2buf(hexSignature);
        const data = enc.encode(payloadStr);

        const isValid = await crypto.subtle.verify('HMAC', key, signature, data);

        return isValid ? payload : null;
    } catch {
        return null;
    }
}

/**
 * 경로를 암호화합니다.
 *
 * @param path 암호화할 경로
 * @param secretOrKey 비밀 키 또는 이미 생성된 CryptoKey
 * @param salt 키 파생에 사용할 salt (secretOrKey가 string인 경우)
 * @returns IV와 암호문이 결합된 16진수 문자열
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-14
 */
export async function encryptPath(path: string, secretOrKey: string | CryptoKey, salt: string = 'salt'): Promise<string> {
    const key = typeof secretOrKey === 'string' ? await getCryptoKey(secretOrKey, salt) : secretOrKey;
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(path);

    const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);

    // IV + 암호문을 hex 문자열로 반환
    return buf2hex(iv.buffer) + buf2hex(cipher);
}

/**
 * 암호화된 16진수 문자열을 복호화하여 원래 경로를 반환합니다.
 *
 * @param encryptedHex 암호화된 16진수 문자열
 * @param secretOrKey 비밀 키 또는 이미 생성된 CryptoKey
 * @param salt 키 파생에 사용할 salt (secretOrKey가 string인 경우)
 * @returns 복호화된 경로 문자열 또는 실패 시 null
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-14
 */
export async function decryptPath(encryptedHex: string, secretOrKey: string | CryptoKey, salt: string = 'salt'): Promise<string | null> {
    try {
        const key = typeof secretOrKey === 'string' ? await getCryptoKey(secretOrKey, salt) : secretOrKey;
        const data = hex2buf(encryptedHex);

        // 첫 12바이트는 IV
        const iv = data.slice(0, 12);
        const ciphertext = data.slice(12);

        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

        return new TextDecoder().decode(decrypted);
    } catch {
        // 지정된 salt로 복호화 실패 시, 레거시 salt('salt')로 재시도하여 하위 호환성 유지
        if (typeof secretOrKey === 'string' && salt !== 'salt') {
            return decryptPath(encryptedHex, secretOrKey, 'salt');
        }
        return null;
    }
}
