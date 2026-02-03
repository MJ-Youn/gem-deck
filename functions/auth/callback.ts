import { serialize } from 'cookie';

interface Env {
    GOOGLE_CLIENT_ID: string;
    GOOGLE_CLIENT_SECRET: string;
    GOOGLE_CALLBACK_URL: string;
}

/**
 * Google OAuth 콜백 요청을 처리합니다.
 * 인증 코드를 토큰으로 교환하고 사용자 정보를 조회하여 세션 쿠키를 설정합니다.
 *
 * @param context Pages 컨텍스트
 * @returns 리다이렉트 Response
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
export const onRequest: PagesFunction<Env> = async (context) => {
    const { request, env } = context;
    const url = new URL(request.url);
    const code = url.searchParams.get('code');

    if (!code) {
        return new Response('Missing code', { status: 400 });
    }

    // Exchange code for token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            code,
            client_id: env.GOOGLE_CLIENT_ID,
            client_secret: env.GOOGLE_CLIENT_SECRET,
            redirect_uri: env.GOOGLE_CALLBACK_URL,
            grant_type: 'authorization_code',
        }),
    });

    const tokenData = (await tokenResponse.json()) as any;

    if (tokenData.error || !tokenData.access_token) {
        return new Response(`Token Error: ${JSON.stringify(tokenData)}`, { status: 401 });
    }

    // Get User Info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const userData = (await userResponse.json()) as any;

    // Set Cookie
    const sessionData = JSON.stringify({
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
    });

    const cookie = serialize('auth_session', sessionData, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // Only secure in production
        path: '/',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        sameSite: 'lax',
    });

    return new Response(null, {
        status: 302,
        headers: {
            Location: '/dashboard',
            'Set-Cookie': cookie,
        },
    });
};
