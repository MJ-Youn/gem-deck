/**
 * 어플리케이션 전역 타입 정의
 */

export type DocFile = {
    key: string;
    name: string;
    display_name: string;
    url?: string;
    size: number;
    uploaded: string;
};

export type SystemStatus = {
    google: boolean;
    cloudflare: boolean;
    r2: boolean;
};

export type VerificationState = { type: 'upload'; files: File[] } | { type: 'delete'; filename: string } | null;
