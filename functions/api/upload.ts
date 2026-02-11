import { parse } from 'cookie';
import { load } from 'cheerio';

import { encryptPath, getCryptoKey } from '../utils/crypto';
import { verifyTurnstile } from '../utils/turnstile';

interface Env {
    GEM_DECK: R2Bucket;
    ENCRYPTION_SECRET: string;
    TURNSTILE_SECRET_KEY?: string;
}

/**
 * 파일 업로드 요청을 처리합니다. HTML 파일과 관련 이미지를 파싱하고 저장합니다.
 *
 * @param context Pages 컨텍스트
 * @returns 처리 결과 Response
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-02
 */
export const onRequestPost: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
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

    const formData = await request.formData();

    // Turnstile 검증
    const token = formData.get('cf-turnstile-response') as string;
    const secretKey = env.TURNSTILE_SECRET_KEY || '1x00000000000000000000AA';
    const ip = request.headers.get('CF-Connecting-IP') || undefined;

    if (!(await verifyTurnstile(token, secretKey, ip))) {
        return new Response('Turnstile verification failed', { status: 403 });
    }

    const htmlFile = formData.get('html') as File;
    const imageFiles = formData.getAll('images') as File[];

    if (!htmlFile) {
        return new Response(JSON.stringify({ error: 'No HTML' }), { status: 400 });
    }

    // 1. HTML 파싱
    const htmlContent = await htmlFile.text();
    const $ = load(htmlContent);

    const imageMapping = new Map<string, string>();
    const usedImages = new Set<string>();

    const cryptoKey = await getCryptoKey(env.ENCRYPTION_SECRET);

    // 2. 이미지 분석
    $('img').each((_, elem) => {
        const src = $(elem).attr('src');
        if (src && !src.startsWith('http') && !src.startsWith('//')) {
            const filename = src.split('/').pop();
            if (filename) {
                usedImages.add(filename);
            }
        }
    });

    // 3. 이미지 업로드
    for (const img of imageFiles) {
        if (usedImages.has(img.name)) {
            const ext = img.name.split('.').pop();
            const randomName = crypto.randomUUID() + '.' + ext;
            const key = `image/${email}/${randomName}`;

            await env.GEM_DECK.put(key, await img.arrayBuffer(), {
                httpMetadata: { contentType: img.type },
            });

            const encryptedKey = await encryptPath(key, cryptoKey);
            imageMapping.set(img.name, `/api/file/${encryptedKey}`);
        }
    }

    // 4. 경로 재작성 (Rewrite)
    $('img').each((_, elem) => {
        const src = $(elem).attr('src');
        if (src) {
            const filename = src.split('/').pop();
            if (filename && imageMapping.has(filename)) {
                $(elem).attr('src', imageMapping.get(filename)!);
            }
        }
    });

    // 5. HTML 파일 업로드
    // 목록 API는 전체 키를 반환하지만, UI는 단순 이름을 기대할 수 있음.
    // 현재 구조상 전체 키 사용.
    const htmlKey = `docs/${email}/${htmlFile.name}`;
    await env.GEM_DECK.put(htmlKey, $.html(), {
        httpMetadata: { contentType: 'text/html' },
    });

    return new Response(
        JSON.stringify({
            success: true,
            uploadedImages: imageMapping.size,
        }),
        {
            headers: { 'Content-Type': 'application/json' },
        },
    );
};
