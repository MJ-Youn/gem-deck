import { parse } from 'cookie';

interface Env {
  GEM_DECK: R2Bucket;
  ADMIN_EMAIL: string;
}

/**
 * 파일 내용 조회 및 저장을 처리하는 API
 * 
 * GET: 파일 내용 조회
 * PUT: 파일 내용 저장
 * 
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env } = context;
  const cookies = parse(request.headers.get('Cookie') || '');
  const cookieValue = cookies['auth_session'];

  // 1. 인증 확인
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

  if (!email) {
    return new Response('Unauthorized', { status: 401 });
  }

  const isAdmin = email === env.ADMIN_EMAIL;

  // 2. 요청 처리 (GET vs PUT)
  if (request.method === 'GET') {
    return handleGet(request, env, email, isAdmin);
  } else if (request.method === 'PUT') {
    return handlePut(request, env, email, isAdmin);
  } else {
    return new Response('Method Not Allowed', { status: 405 });
  }
};

/**
 * GET 요청을 처리합니다. 파일을 조회하여 반환합니다.
 *
 * @param request Request 객체
 * @param env 환경 변수 객체
 * @param email 사용자 이메일
 * @param isAdmin 관리자 여부
 * @returns Response 파일 내용 또는 에러 응답
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
async function handleGet(request: Request, env: Env, email: string, isAdmin: boolean) {
  const url = new URL(request.url);
  const key = url.searchParams.get('key');

  if (!key) {
    return new Response('Bad Request: Missing key', { status: 400 });
  }

  // 권한 확인: 본인 파일이거나 관리자여야 함
  // 키 형식: docs/email/filename
  if (!isAdmin && !key.startsWith(`docs/${email}/`)) {
    return new Response('Forbidden', { status: 403 });
  }

  const object = await env.GEM_DECK.get(key);

  if (!object) {
    return new Response('Not Found', { status: 404 });
  }

  const content = await object.text();

  return new Response(content, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src * data:; sandbox allow-scripts allow-forms allow-popups;",
    },
  });
}

/**
 * PUT 요청을 처리합니다. 파일 내용을 수정하여 저장합니다.
 *
 * @param request Request 객체
 * @param env 환경 변수 객체
 * @param email 사용자 이메일
 * @param isAdmin 관리자 여부
 * @returns Response 성공 여부 또는 에러 응답
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
async function handlePut(request: Request, env: Env, email: string, isAdmin: boolean) {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response('Bad Request: Invalid JSON', { status: 400 });
  }

  const { key, content } = body;

  if (!key || content === undefined) {
    return new Response('Bad Request: Missing key or content', { status: 400 });
  }

  // 권한 확인
  if (!isAdmin && !key.startsWith(`docs/${email}/`)) {
    return new Response('Forbidden', { status: 403 });
  }

  // R2에 저장
  await env.GEM_DECK.put(key, content, {
    httpMetadata: {
        contentType: 'text/html',
    }
  });

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
