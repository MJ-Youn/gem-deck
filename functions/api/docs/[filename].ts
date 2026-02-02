import { parse } from 'cookie';
import { load } from 'cheerio';

interface Env {
    GEM_DECK: R2Bucket;
}

/**
 * 파일 삭제 요청을 처리합니다. HTML 파일과 연관된 이미지들을 함께 삭제합니다.
 *
 * @param context Pages 컨텍스트
 * @returns 처리 결과 Response
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-02
 */
export const onRequestDelete: PagesFunction<Env> = async (context) => {
    const { request, params, env } = context;
    const filename = params.filename as string;

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

    if (!email) {
        return new Response('Unauthorized', { status: 401 });
    }

    // 보안: 자신의 파일만 삭제 허용
    const key = `docs/${email}/${filename}`;

    // 1. HTML을 가져와 연관된 이미지 찾기
    const object = await env.GEM_DECK.get(key);

    if (object) {
        const htmlContent = await object.text();
        const $ = load(htmlContent);

        const imagesToDelete: string[] = [];

        $('img').each((_, elem) => {
            const src = $(elem).attr('src');
            // src 형식: /api/file/image/user/uuid
            if (src && src.startsWith('/api/file/image/')) {
                const imageKey = src.replace('/api/file/', '');
                // 사용자의 키인지 확인
                if (imageKey.startsWith(`image/${email}/`)) {
                    imagesToDelete.push(imageKey);
                }
            }
        });

        // 2. 이미지 삭제
        if (imagesToDelete.length > 0) {
            await Promise.all(imagesToDelete.map((k) => env.GEM_DECK.delete(k)));
        }
    }

    // 3. HTML 파일 삭제
    await env.GEM_DECK.delete(key);

    return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' },
    });
};

/**
 * 파일 이름 변경 요청을 처리합니다. 파일을 복사하고 기존 파일을 삭제합니다.
 *
 * @param context Pages 컨텍스트
 * @returns 처리 결과 Response
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-02
 */
export const onRequestPatch: PagesFunction<Env> = async (context) => {
    const { request, params, env } = context;
    const filename = params.filename as string;

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

    if (!email) {
        return new Response('Unauthorized', { status: 401 });
    }

    let body: any;
    try {
        body = await request.json();
    } catch {
        return new Response('Bad Request', { status: 400 });
    }

    const newNameWithoutExt = body.name;
    if (!newNameWithoutExt) {
        return new Response('Missing name', { status: 400 });
    }

    // 새 이름에 .html 확장자 보장
    const newName = newNameWithoutExt.endsWith('.html') ? newNameWithoutExt : `${newNameWithoutExt}.html`;

    const oldKey = `docs/${email}/${filename}`;
    const newKey = `docs/${email}/${newName}`;

    if (oldKey === newKey) {
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
        });
    }

    const object = await env.GEM_DECK.get(oldKey);
    if (!object) {
        return new Response('File not found', { status: 404 });
    }

    // 복사 (새 키 생성)
    await env.GEM_DECK.put(newKey, object.body);

    // 기존 파일 삭제 (이미지는 재사용되므로 HTML 파일만 삭제)
    await env.GEM_DECK.delete(oldKey);

    return new Response(JSON.stringify({ success: true, newName }), {
        headers: { 'Content-Type': 'application/json' },
    });
};
