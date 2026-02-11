import { parse } from 'cookie';
import { load } from 'cheerio';

interface Env {
  GEM_DECK: R2Bucket;
  ADMIN_EMAIL: string;
  ENCRYPTION_SECRET: string;
}

/**
 * 관리자 권한으로 파일 삭제 요청을 처리합니다.
 * 키(Key)를 기반으로 특정 파일을 삭제할 수 있습니다.
 *
 * @param context Pages 컨텍스트
 * @returns 처리 결과 Response
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-02
 */
import { decryptPath, getCryptoKey } from '../../utils/crypto';

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. 권한 확인 (Auth Check)
  const cookies = parse(request.headers.get('Cookie') || '');
  const cookieValue = cookies['auth_session'];
  if (!cookieValue) {
    return new Response('Unauthorized', { status: 401 });
  }

  let email = '';
  try {
    const sessionHelper = JSON.parse(cookieValue);
    email = sessionHelper.email;
  } catch {
    email = cookieValue;
  }

  if (email !== env.ADMIN_EMAIL) {
    return new Response('Forbidden', { status: 403 });
  }

  // 2. 요청 본문 파싱 (Parse Request Body)
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response('Bad Request: Invalid JSON', { status: 400 });
  }

  const { key } = body;
  if (!key) {
    return new Response('Bad Request: Missing key', { status: 400 });
  }

  // 3. 로직: HTML 가져오기 -> 연관된 이미지 찾기 -> 이미지 삭제 -> HTML 삭제
  const object = await env.GEM_DECK.get(key);

  if (object) {
      const htmlContent = await object.text();
      const $ = load(htmlContent);

      const imagesToDelete: string[] = [];
      const imagePromises: Promise<void>[] = [];

      const cryptoKey = await getCryptoKey(env.ENCRYPTION_SECRET);

      $('img').each((_, elem) => {
          const src = $(elem).attr('src');
          // src 형식: /api/file/<encryptedHex>
          if (src && src.startsWith('/api/file/')) {
              const encryptedHex = src.replace('/api/file/', '');
              
              imagePromises.push((async () => {
                  try {
                      const decryptedPath = await decryptPath(encryptedHex, cryptoKey);
                      if (decryptedPath) {
                          // 보안 검사: 이미지가 동일한 사용자에게 속하거나 합당한지 확인
                          // 관리자의 경우, 파일에 링크되어 있다면 삭제되어야 한다고 신뢰함.
                          // 하지만 안전을 위해 'image/'로 시작하는지 확인.
                          if (decryptedPath.startsWith('image/')) {
                              imagesToDelete.push(decryptedPath);
                          }
                      }
                  } catch (e) {
                      // 복호화 오류 무시
                  }
              })());
          }
      });

      await Promise.all(imagePromises);

      // 이미지 삭제
      if (imagesToDelete.length > 0) {
          await Promise.all(imagesToDelete.map(k => env.GEM_DECK.delete(k)));
      }
  }

  // 4. HTML 파일 삭제
  await env.GEM_DECK.delete(key);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
