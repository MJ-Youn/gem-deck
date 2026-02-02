/**
 * Cloudflare Turnstile 토큰 검증 유틸리티
 * 
 * @param token 클라이언트로부터 받은 Turnstile 응답 토큰
 * @param secretKey Cloudflare Turnstile Secret Key
 * @param ip 클라이언트 IP 주소 (선택 사항)
 * @returns 검증 성공 여부 (boolean)
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-02
 */
export async function verifyTurnstile(token: string, secretKey: string, ip?: string): Promise<boolean> {
  // 토큰이나 키가 없으면 검증 실패
  if (!token || !secretKey) {
    return false;
  }

  const formData = new FormData();
  formData.append('secret', secretKey);
  formData.append('response', token);
  if (ip) {
    formData.append('remoteip', ip);
  }

  try {
    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const outcome = (await result.json()) as { success: boolean };
    return outcome.success;
  } catch (e) {
    console.error('Turnstile verification error:', e);
    return false;
  }
}
