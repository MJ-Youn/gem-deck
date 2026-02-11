/**
 * 비밀 키를 사용하여 암호화 키를 생성합니다.
 *
 * @param secret 비밀 키 문자열
 * @returns 생성된 CryptoKey Promise
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
export async function getCryptoKey(secret: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'PBKDF2' }, false, ['deriveKey']);
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: enc.encode('salt'), // 결정론적 키 파생을 위한 고정 salt
            iterations: 100000,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        true,
        ['encrypt', 'decrypt'],
    );
}



/**
 * ArrayBuffer를 16진수 문자열로 변환합니다.
 *
 * @param buffer 변환할 버퍼
 * @returns 16진수 문자열
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
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
 * 경로를 암호화합니다.
 *
 * @param path 암호화할 경로
 * @param secretOrKey 비밀 키 또는 이미 생성된 CryptoKey
 * @returns IV와 암호문이 결합된 16진수 문자열
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
export async function encryptPath(path: string, secretOrKey: string | CryptoKey): Promise<string> {
    const key = typeof secretOrKey === 'string' ? await getCryptoKey(secretOrKey) : secretOrKey;
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
 * @returns 복호화된 경로 문자열 또는 실패 시 null
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-02
 */
export async function decryptPath(encryptedHex: string, secretOrKey: string | CryptoKey): Promise<string | null> {
    try {
        const key = typeof secretOrKey === 'string' ? await getCryptoKey(secretOrKey) : secretOrKey;
        const data = hex2buf(encryptedHex);

        // 첫 12바이트는 IV
        const iv = data.slice(0, 12);
        const ciphertext = data.slice(12);

        const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);

        return new TextDecoder().decode(decrypted);
    } catch (e) {
        return null;
    }
}
