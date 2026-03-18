import { toast } from 'sonner';

/**
 * 파일 링크를 클립보드에 복사합니다.
 *
 * @param url 복사할 URL
 * @returns Promise<void>
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
export const handleCopyLink = async (url: string) => {
    if (!url) {
        toast.error('복사할 링크가 없습니다.');
        return;
    }

    try {
        await navigator.clipboard.writeText(window.location.origin + url);
        toast.success('링크가 클립보드에 복사되었습니다.');
    } catch (err) {
        toast.error('클립보드 복사에 실패했습니다. 새 창으로 열기를 이용해주세요.');
    }
};
