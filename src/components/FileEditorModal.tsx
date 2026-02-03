import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { X, Save, Loader2, FileCode } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

interface FileEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    fileKey: string;
    fileName: string;
    onSave?: () => void;
}

/**
 * 파일 편집 모달 컴포넌트
 * Monaco Editor를 사용하여 HTML 파일 내용을 직접 수정할 수 있습니다.
 * 
 * @param props FileEditorModalProps
 * @returns JSX.Element
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-03
 */
export function FileEditorModal({ isOpen, onClose, fileKey, fileName, onSave }: FileEditorModalProps) {
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [originalContent, setOriginalContent] = useState('');

    useEffect(() => {
        if (isOpen && fileKey) {
            fetchContent();
        } else {
            setContent('');
            setOriginalContent('');
        }
    }, [isOpen, fileKey]);

    // 키보드 단축키 핸들링 (Ctrl+S / Cmd+S)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                e.preventDefault();
                if (isOpen && !saving) {
                    handleSave();
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, saving, content]);

    /**
     * 파일 내용을 서버에서 가져옵니다.
     *
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const fetchContent = async () => {
        setLoading(true);
        try {
            // raw content 가져오기
            const response = await axios.get(`/api/content?key=${encodeURIComponent(fileKey)}`, {
                responseType: 'text'
            });
            setContent(response.data);
            setOriginalContent(response.data);
        } catch (e) {
            toast.error('파일 내용을 불러오지 못했습니다.');
            onClose();
        } finally {
            setLoading(false);
        }
    };

    /**
     * 변경된 파일 내용을 저장합니다.
     *
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const handleSave = async () => {
        setSaving(true);
        try {
            await axios.put('/api/content', {
                key: fileKey,
                content: content
            });
            
            toast.success('파일이 저장되었습니다.');
            setOriginalContent(content);
            if (onSave) onSave();
        } catch (e) {
            toast.error('저장에 실패했습니다.');
        } finally {
            setSaving(false);
        }
    };

    /**
     * 모달을 닫습니다.
     * 변경 사항이 있는 경우 확인 메시지를 표시합니다.
     *
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const handleClose = () => {
        if (content !== originalContent) {
            if (!confirm('변경 사항이 있습니다. 저장하지 않고 닫으시겠습니까?')) {
                return;
            }
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl h-[85vh] bg-[#1e1e1e] rounded-xl shadow-2xl flex flex-col border border-white/10 overflow-hidden">
                {/* Header */}
                <div className="h-14 flex items-center justify-between px-6 border-b border-white/10 bg-[#252526]">
                    <div className="flex items-center gap-3">
                        <FileCode className="text-blue-400" size={20} />
                        <span className="text-slate-200 font-medium truncate max-w-md" title={fileKey}>
                            {fileName}
                        </span>
                        {content !== originalContent && (
                            <span className="text-xs bg-yellow-500/20 text-yellow-500 px-2 py-0.5 rounded-full border border-yellow-500/30">
                                수정됨
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleSave}
                            disabled={saving || loading}
                            className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {saving ? <Loader2 className="animate-spin w-4 h-4" /> : <Save size={16} />}
                            저장 (Cmd+S)
                        </button>
                        <button
                            onClick={handleClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                            title="닫기"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Editor Area */}
                <div className="flex-1 relative bg-[#1e1e1e]">
                    {loading ? (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-slate-500">
                            <Loader2 className="animate-spin w-8 h-8 text-indigo-500" />
                            <p>파일 내용을 불러오는 중...</p>
                        </div>
                    ) : (
                        <Editor
                            height="100%"
                            defaultLanguage="html"
                            path={fileKey} // 중요: 동일 파일 재오픈 시 상태 유지를 위해
                            value={content}
                            onChange={(value) => setContent(value || '')}
                            theme="vs-dark"
                            options={{
                                minimap: { enabled: true },
                                fontSize: 14,
                                wordWrap: 'on',
                                automaticLayout: true,
                                padding: { top: 20 },
                                scrollBeyondLastLine: false,
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
