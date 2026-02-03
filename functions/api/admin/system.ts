import { parse } from 'cookie';

interface Env {
  GEM_DECK: R2Bucket;
  ADMIN_EMAIL: string;
  GOOGLE_CLIENT_ID?: string;
}

/**
 * 시스템 상태 확인 요청을 처리합니다.
 * Google OAuth, Cloudflare Pages, R2 연결 상태를 반환합니다.
 *
 * @param context Pages 컨텍스트
 * @returns 시스템 상태를 포함한 Response
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { request, env } = context;

  // 1. 권한 확인 (Auth Check - Admin Only)
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

  // 2. 시스템 확인 (Check Systems)
  const googleStatus = !!env.GOOGLE_CLIENT_ID;
  
  // Cloudflare Pages 환경은 이 함수가 실행 중이라면 암시적으로 활성 상태입니다.
  // 특정 환경 변수가 설정되어 있는지 확인할 수 있습니다.
  const pagesStatus = true; // 실행 중이라면 항상 true.

  // R2 확인 (R2 Check)
  let r2Status = false;
  try {
    // 연결성을 확인하기 위해 가벼운 작업 수행
    // 1개의 객체 목록 조회는 저렴/무료에 가까움
    await env.GEM_DECK.list({ limit: 1 });
    r2Status = true;
  } catch (e) {
    console.error('R2 Check Failed:', e);
    r2Status = false;
  }

  return new Response(JSON.stringify({
    google: googleStatus,
    cloudflare: pagesStatus,
    r2: r2Status
  }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
