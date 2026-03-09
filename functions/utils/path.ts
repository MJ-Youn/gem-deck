/**
 * Filename sanitization to prevent path traversal attacks.
 * Removes path segments and dangerous characters.
 *
 * @param filename The original filename
 * @returns Sanitized filename
 * @author Jules
 * @since 2026-02-13
 */
export function sanitizeFilename(filename: string): string {
    if (!filename) return '';

    // 1. Take only the last part of the path (handles both / and \)
    const base = filename.split(/[/\\]/).pop() || '';

    // 2. Remove '..' sequences that could be used for traversal if prepended elsewhere
    // and remove characters that are illegal in many filesystems.
    return base
        .replace(/\.\./g, '.')
        .replace(/[<>:"/\\|?*]/g, '')
        .trim();
}
