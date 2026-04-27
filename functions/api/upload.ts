import { parse } from '../utils/cookie.ts';

import { encryptPath, getCryptoKey, verifySession } from '../utils/crypto.ts';
import { verifyTurnstile } from '../utils/turnstile.ts';
import { sanitizeFilename } from '../utils/path.ts';

interface Env {
    GEM_DECK: R2Bucket;
    ENCRYPTION_SECRET: string;
    ENCRYPTION_SALT?: string;
    TURNSTILE_SECRET_KEY?: string;
    MAX_FILE_SIZE?: string;
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

    const session = await verifySession<{ email: string }>(cookieValue, env.ENCRYPTION_SECRET);
    if (!session) {
        return new Response('Unauthorized', { status: 401 });
    }

    const email = session.email;
    if (!email) {
        return new Response('Unauthorized', { status: 401 });
    }

    const formData = await request.formData();

    // Turnstile 검증
    const token = formData.get('cf-turnstile-response') as string;
    const secretKey = env.TURNSTILE_SECRET_KEY || '';
    const ip = request.headers.get('CF-Connecting-IP') || undefined;

    if (!(await verifyTurnstile(token, secretKey, ip))) {
        return new Response('Turnstile verification failed', { status: 403 });
    }

    const htmlFile = formData.get('html') as File;
    const imageFiles = formData.getAll('images') as File[];

    if (!htmlFile) {
        return new Response(JSON.stringify({ error: 'No HTML' }), { status: 400 });
    }

    // Check file size limits
    const maxFileSize = parseInt(env.MAX_FILE_SIZE || '10485760', 10);
    if (htmlFile.size > maxFileSize) {
        return new Response(JSON.stringify({ error: `File too large: ${htmlFile.name}` }), { status: 413 });
    }
    for (const img of imageFiles) {
        if (img.size > maxFileSize) {
            return new Response(JSON.stringify({ error: `File too large: ${img.name}` }), { status: 413 });
        }
    }

    // 1. HTML 파싱
    const htmlContent = await htmlFile.text();

    const imageMapping = new Map<string, string>();
    const usedImages = new Set<string>();

    const cryptoKey = await getCryptoKey(env.ENCRYPTION_SECRET, env.ENCRYPTION_SALT);

    // 2. 이미지 분석
    const imgTagRegex = /<img[^>]+src\s*=\s*["']?([^"'\s>]+)["']?[^>]*>/gi;
    let match;
    while ((match = imgTagRegex.exec(htmlContent)) !== null) {
        const src = match[1];
        if (src && !src.startsWith('http') && !src.startsWith('//')) {
            const filename = src.split('/').pop();
            if (filename) {
                usedImages.add(filename);
            }
        }
    }

    // 3. 이미지 업로드
    await Promise.all(
        imageFiles.map(async (img) => {
            if (usedImages.has(img.name)) {
                const ext = img.name.split('.').pop();
                const randomName = crypto.randomUUID() + '.' + ext;
                const key = `image/${email}/${randomName}`;

                await env.GEM_DECK.put(key, await img.arrayBuffer(), {
                    httpMetadata: { contentType: img.type },
                });

                const encryptedKey = await encryptPath(key, cryptoKey, env.ENCRYPTION_SALT);
                imageMapping.set(img.name, `/api/file/${encryptedKey}`);
            }
        }),
    );

    // 4. 경로 재작성 (Rewrite)
    const rewrittenHtml = htmlContent.replace(imgTagRegex, (tag, src) => {
        if (src) {
            const filename = src.split('/').pop();
            if (filename && imageMapping.has(filename)) {
                return tag.replace(src, imageMapping.get(filename)!);
            }
        }
        return tag;
    });

    // 5. HTML 파일 업로드
    // 목록 API는 전체 키를 반환하지만, UI는 단순 이름을 기대할 수 있음.
    // 현재 구조상 전체 키 사용.
    const sanitizedName = sanitizeFilename(htmlFile.name);
    const htmlKey = `docs/${email}/${sanitizedName}`;
    await env.GEM_DECK.put(htmlKey, rewrittenHtml, {
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
