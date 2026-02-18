import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import { Upload, FileText, Trash2, LogOut, Loader2, Image as ImageIcon, ExternalLink, Search, LayoutGrid, List as ListIcon, Pencil, Check, X, FileCode, Link, File } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Turnstile from 'react-turnstile';
import { Footer } from '../components/Footer';
import { FileEditorModal } from '../components/FileEditorModal';
import { DocFile, VerificationState } from '../types';

/**
 * 대시보드 페이지 컴포넌트
 * 파일 목록 조회, 업로드, 삭제, 이름 변경 기능을 제공합니다.
 *
 * @returns JSX.Element 대시보드 UI
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-02
 */
export function Dashboard() {
    const navigate = useNavigate();
    const [files, setFiles] = useState<DocFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [userName, setUserName] = useState('');
    const [userPicture, setUserPicture] = useState('');
    const [uploading, setUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [editingFile, setEditingFile] = useState<string | null>(null);
    const [renameValue, setRenameValue] = useState('');
    const [verificationState, setVerificationState] = useState<VerificationState>(null);
    const [isAdmin, setIsAdmin] = useState(false);
    
    // Editor State
    const [editorOpen, setEditorOpen] = useState(false);
    const [editorFile, setEditorFile] = useState<{ key: string; name: string } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        checkAuth();
        fetchFiles();
    }, []);

    /**
     * 사용자 인증 상태를 확인합니다.
     * 인증되지 않은 경우 로그인 페이지로 리다이렉트합니다.
     *
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const checkAuth = async () => {
        try {
            const { data } = (await axios.get('/auth/me')) as { data: any };
            setUserName(data.name || data.email.split('@')[0]);
            setUserPicture(data.picture);
            setIsAdmin(data.isAdmin || false);
            if (!data.authenticated) {
                navigate('/');
            }
        } catch {
            navigate('/');
        }
    };

    /**
     * 서버에서 파일 목록을 조회합니다.
     *
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const fetchFiles = async () => {
        try {
            const { data } = (await axios.get('/api/docs')) as { data: { files: DocFile[] } };
            setFiles(data.files);
        } catch (e) {
            toast.error('파일 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };



    /**
     * 파일 업로드를 실행합니다.
     * HTML 파일과 이미지 파일들을 FormData로 전송합니다.
     *
     * @param files 업로드할 파일 배열
     * @param token Turnstile 인증 토큰
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const executeUpload = async (files: File[], token: string) => {
        const htmlFile = files.find((f) => f.name.endsWith('.html'));
        const imageFiles = files.filter((f) => !f.name.endsWith('.html'));

        if (!htmlFile) {
            toast.error('HTML 파일을 포함해야 합니다.');
            return;
        }

        setUploading(true);
        const formData = new FormData();
        formData.append('html', htmlFile);
        imageFiles.forEach((img) => formData.append('images', img));
        formData.append('cf-turnstile-response', token);

        try {
            const { data: result } = (await axios.post('/api/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })) as { data: any };

            toast.success('업로드 완료', {
                description: `${result.uploadedImages}개의 이미지와 함께 변환되었습니다.`,
            });
            fetchFiles();
        } catch (e) {
            toast.error('업로드 실패');
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };



    /**
     * 파일 삭제를 실행합니다.
     *
     * @param filename 삭제할 파일명
     * @param token Turnstile 인증 토큰
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const executeDelete = async (key: string, token: string) => {
        try {
            const actualName = key.split('/').pop();
            const res = await fetch(`/api/docs/${actualName}`, {
                method: 'DELETE',
                headers: { 'X-Turnstile-Token': token },
            });
            if (res.ok) {
                toast.success('파일이 삭제되었습니다.');
                fetchFiles();
            } else {
                toast.error('삭제 실패');
            }
        } catch {
            toast.error('삭제 오류');
        }
    };



    /**
     * Turnstile 검증 성공 시 호출되는 핸들러입니다.
     * 업로드 또는 삭제 작업을 계속 진행합니다.
     *
     * @param token 검증 토큰
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const handleVerificationSuccess = (token: string) => {
        if (!verificationState) return;

        if (verificationState.type === 'upload') {
            executeUpload(verificationState.files, token);
        } else if (verificationState.type === 'delete') {
            executeDelete(verificationState.filename, token);
        }
        setVerificationState(null);
    };



    /**
     * 파일 선택 시 업로드 프로세스를 시작합니다.
     *
     * @param e 파일 입력 변경 이벤트
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.length) {
            return;
        }

        const fileList = Array.from(e.target.files);
        const htmlFile = fileList.find((f) => f.name.endsWith('.html'));
        
        if (!htmlFile) {
            toast.error('HTML 파일을 포함해야 합니다.');
            return;
        }

        setVerificationState({ type: 'upload', files: fileList });
        
        // Reset input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };



    /**
     * 파일 삭제 프로세스를 시작합니다.
     *
     * @param filename 삭제할 파일명
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const handleDelete = async (filename: string) => {
        setVerificationState({ type: 'delete', filename });
    };



    /**
     * 드래그 오버 이벤트를 처리합니다.
     *
     * @param e 드래그 이벤트
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };



    /**
     * 드롭 이벤트를 처리하여 파일을 업로드합니다.
     *
     * @param e 드래그 이벤트
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length > 0) {
            const syntheticEvent = { target: { files: e.dataTransfer.files } } as any;
            handleUpload(syntheticEvent);
        }
    };



    /**
     * 파일 이름 변경 모드를 시작합니다.
     *
     * @param file 대상 파일 객체
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const handleStartEdit = (file: DocFile) => {
        setEditingFile(file.key);
        // Remove .html for editing
        setRenameValue(file.display_name.replace(/\.html$/, ''));
    };



    /**
     * 파일 이름 변경을 취소합니다.
     *
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const handleCancelEdit = () => {
        setEditingFile(null);
        setRenameValue('');
    };



    /**
     * 변경된 파일 이름을 저장합니다.
     *
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const handleSaveRename = async () => {
        if (!editingFile || !renameValue.trim()) {
            return;
        }

        try {
            const actualName = editingFile.split('/').pop();
            const res = await fetch(`/api/docs/${actualName}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: renameValue }),
            });

            if (res.ok) {
                toast.success('이름이 변경되었습니다.');
                handleCancelEdit();
                fetchFiles();
            } else {
                const err = await res.text();
                toast.error('변경 실패: ' + err);
            }
        } catch {
            toast.error('변경 중 오류 발생');
        }
    };



    /**
     * 파일 편집기를 엽니다.
     *
     * @param file 대상 파일 객체
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const handleOpenEditor = (file: DocFile) => {
        setEditorFile({ key: file.key, name: file.display_name });
        setEditorOpen(true);
    };



    /**
     * 파일 링크를 클립보드에 복사합니다.
     *
     * @param url 복사할 URL
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const handleCopyLink = async (url: string) => {
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



    /**
     * 파일 확장자에 따른 아이콘을 반환합니다.
     *
     * @param filename 파일명
     * @param size 아이콘 크기
     * @returns JSX.Element 아이콘 컴포넌트
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const getFileIcon = (filename: string, size: number) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'html': return <FileCode size={size} />;
            case 'pdf': return <FileText size={size} />;
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'gif':
            case 'webp': return <ImageIcon size={size} />;
            case 'svg': return <FileCode size={size} />;
            default: return <File size={size} />;
        }
    };



    /**
     * 파일 확장자에 따른 배경 색상 클래스를 반환합니다.
     *
     * @param filename 파일명
     * @returns string Tailwind CSS 클래스 문자열
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const getFileColor = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        switch (ext) {
            case 'html': return 'bg-gradient-to-br from-orange-500/10 to-amber-500/10 text-orange-400 ring-1 ring-orange-500/20 shadow-lg shadow-orange-500/10';
            case 'pdf': return 'bg-gradient-to-br from-red-500/10 to-rose-500/10 text-red-400 ring-1 ring-red-500/20 shadow-lg shadow-red-500/10';
            case 'png':
            case 'jpg':
            case 'jpeg':
            case 'gif':
            case 'webp': return 'bg-gradient-to-br from-blue-500/10 to-indigo-500/10 text-blue-400 ring-1 ring-blue-500/20 shadow-lg shadow-blue-500/10';
            default: return 'bg-gradient-to-br from-slate-500/10 to-gray-500/10 text-slate-400 ring-1 ring-slate-500/20 shadow-lg shadow-slate-500/10';
        }
    };

    const filteredFiles = files.filter((f) =>
        f.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.key.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen flex flex-col font-sans text-slate-200">
            <Toaster
                theme="dark"
                position="top-right"
                toastOptions={{
                    style: { background: '#1e293b', border: '1px solid #334155', color: '#f8fafc' },
                }}
            />

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3 group cursor-pointer hover:opacity-90 transition-opacity">
                        <img src="/logo.png" alt="Gem Deck" className="w-10 h-10 object-contain" />
                        <h1 className="text-xl font-bold bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">Gem Deck</h1>
                    </div>

                    <div className="flex items-center gap-6">
                        <div className="hidden md:flex items-center gap-2 bg-slate-900/50 rounded-full px-4 py-2 border border-white/5">
                            <Search
                                size={16}
                                className="text-slate-500"
                            />
                            <input
                                type="text"
                                placeholder="검색..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 w-48"
                            />
                        </div>

                        <div className="flex items-center gap-3 pl-6 border-l border-white/10">
                            {isAdmin && (
                                <button
                                    onClick={() => navigate('/admin')}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 text-sm font-medium transition-colors border border-indigo-500/20"
                                >
                                    Admin
                                </button>
                            )}

                            {userPicture ? (
                                <img
                                    src={userPicture}
                                    alt={userName}
                                    className="w-9 h-9 rounded-full ring-2 ring-white/10"
                                />
                            ) : (
                                <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold ring-2 ring-white/10">{userName.charAt(0).toUpperCase()}</div>
                            )}

                            <button
                                onClick={() => (window.location.href = '/auth/logout')}
                                className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="로그아웃"
                            >
                                <LogOut size={20} />
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-6 pt-32 pb-20">
                {/* Actions Bar */}
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-10">
                    <div>
                        <h2 className="text-3xl font-bold text-white mb-2">Dashboard</h2>
                        <p className="text-slate-400">{files.length}개의 프레젠테이션이 관리되고 있습니다.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1 bg-slate-900/50 p-1 rounded-lg border border-white/5">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-indigo-500/20 text-indigo-400 font-medium' : 'text-slate-500 hover:text-slate-300'}`}
                                title="리스트 뷰"
                            >
                                <ListIcon size={18} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-indigo-500/20 text-indigo-400 font-medium' : 'text-slate-500 hover:text-slate-300'}`}
                                title="그리드 뷰"
                            >
                                <LayoutGrid size={18} />
                            </button>
                        </div>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="btn btn-primary"
                        >
                            <Upload size={18} />
                            <span>업로드</span>
                        </button>
                    </div>
                </div>

                {/* Upload Drop Zone (Visible when dragging or empty) */}
                {(isDragging || files.length === 0) && (
                    <div
                        className={`
                mb-12 relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300
                flex flex-col items-center justify-center p-12 text-center group cursor-pointer
                ${isDragging ? 'border-indigo-500/50 bg-indigo-500/5 scale-[1.01]' : 'border-slate-700/50 bg-slate-900/30 hover:border-slate-600 hover:bg-slate-900/50'}
              `}
                        onDragOver={handleDragOver}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <div
                            className={`
                w-16 h-16 rounded-2xl flex items-center justify-center mb-6 transition-all duration-300
                ${isDragging ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/50' : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-white'}
              `}
                        >
                            {uploading ? <Loader2 className="animate-spin w-8 h-8" /> : <Upload className="w-8 h-8" />}
                        </div>
                        <h3 className="text-xl font-semibold text-white mb-2">{uploading ? '파일 처리 중...' : '파일 업로드'}</h3>
                        <p className="text-slate-400 max-w-sm mx-auto">HTML 파일과 관련 이미지들을 이곳에 끌어다 놓으세요.</p>
                    </div>
                )}

                {/* Content Area */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                        <Loader2 className="animate-spin w-10 h-10 text-indigo-500" />
                        <p className="text-slate-500 animate-pulse">데이터를 불러오는 중...</p>
                    </div>
                ) : filteredFiles.length === 0 ? (
                    !isDragging && (
                        <div className="text-center py-20 px-4 rounded-3xl border border-white/5 bg-slate-900/20">
                            <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Search className="w-8 h-8 text-slate-600" />
                            </div>
                            <h3 className="text-slate-300 font-medium mb-1">검색 결과가 없거나 파일이 없습니다.</h3>
                            <p className="text-slate-500 text-sm">새로운 파일을 업로드해보세요.</p>
                        </div>
                    )
                ) : viewMode === 'list' ? (
                    <div className="space-y-3">
                        {filteredFiles.map((file) => (
                            <div
                                key={file.key}
                                className="group glass-card p-4 flex items-center gap-5 hover:bg-slate-800/40 border-transparent hover:border-white/10 transition-all"
                            >
                                <div
                                    className={`w-12 h-12 rounded-lg flex-shrink-0 flex items-center justify-center ${getFileColor(file.display_name)}`}
                                >
                                    {getFileIcon(file.display_name, 24)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    {editingFile === file.key ? (
                                        <div className="flex items-center gap-2 mb-1">
                                            <div className="flex items-center">
                                                <input
                                                    type="text"
                                                    value={renameValue}
                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                    className="bg-transparent border-b border-indigo-500 px-0 py-0 text-lg font-medium text-white focus:outline-none min-w-[50px]"
                                                    style={{ width: `${Math.max(renameValue.length * 9, 50)}px` }}
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveRename();
                                                        if (e.key === 'Escape') handleCancelEdit();
                                                    }}
                                                />
                                                <span className="text-slate-400 text-lg font-medium">.html</span>
                                            </div>
                                            <button
                                                onClick={handleSaveRename}
                                                className="p-1 text-green-400 hover:bg-green-400/10 rounded"
                                            >
                                                <Check size={16} />
                                            </button>
                                            <button
                                                onClick={handleCancelEdit}
                                                className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                                            >
                                                <X size={16} />
                                            </button>
                                        </div>
                                    ) : (
                                        <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-lg font-medium text-slate-200 group-hover:text-indigo-400 transition-colors block truncate"
                                        >
                                            {file.display_name}
                                        </a>
                                    )}

                                    <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                                        <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                        <span>{new Date(file.uploaded).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0 duration-300">
                                    <a
                                        href={file.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-indigo-500/20 transition-colors"
                                        title="열기"
                                    >
                                        <ExternalLink size={20} />
                                    </a>
                                    <button
                                        onClick={() => handleCopyLink(file.url || '')}
                                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                                        title="링크 복사"
                                    >
                                        <Link size={20} />
                                    </button>
                                    {file.display_name.endsWith('.html') && (
                                        <button
                                            onClick={() => handleOpenEditor(file)}
                                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                                            title="내용 수정"
                                        >
                                            <FileCode size={20} />
                                        </button>
                                    )}
                                    <button
                                        onClick={() => handleStartEdit(file)}
                                        className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 transition-colors"
                                        title="이름 변경"
                                    >
                                        <Pencil size={20} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(file.key)}
                                        className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                        title="삭제"
                                    >
                                        <Trash2 size={20} />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredFiles.map((file) => (
                            <div
                                key={file.key}
                                className="group glass-card hover:bg-slate-800/60 transition-all flex flex-col h-full border-t border-white/5"
                            >
                                <div className="p-6 flex-1 flex flex-col items-center text-center">
                                    <div
                                        className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 duration-300 ${getFileColor(file.display_name)}`}
                                    >
                                        {getFileIcon(file.display_name, 32)}
                                    </div>
                                    {editingFile === file.key ? (
                                        <div className="w-full mb-2 flex flex-col items-center gap-2">
                                            <div className="flex items-center justify-center w-full">
                                                <input
                                                    type="text"
                                                    value={renameValue}
                                                    onChange={(e) => setRenameValue(e.target.value)}
                                                    className="bg-transparent border-b border-indigo-500 px-0 py-0.5 text-sm text-white font-semibold text-center focus:outline-none min-w-[50px]"
                                                    style={{ width: `${Math.max(renameValue.length * 8, 50)}px` }}
                                                    autoFocus
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') handleSaveRename();
                                                        if (e.key === 'Escape') handleCancelEdit();
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                />
                                                <span className="text-slate-400 text-sm font-semibold">.html</span>
                                            </div>
                                            <div className="flex items-center justify-center gap-2">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSaveRename();
                                                    }}
                                                    className="p-1 text-green-400 hover:bg-green-400/10 rounded"
                                                >
                                                    <Check size={16} />
                                                </button>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleCancelEdit();
                                                    }}
                                                    className="p-1 text-red-400 hover:bg-red-400/10 rounded"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <h3
                                            className="font-semibold text-white mb-2 line-clamp-2 w-full"
                                            title={file.display_name}
                                        >
                                            {file.display_name}
                                        </h3>
                                    )}
                                    <p className="text-xs text-slate-500 bg-slate-900/50 px-2 py-1 rounded-full border border-white/5">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>

                                <div className="p-4 border-t border-white/5 bg-slate-900/30 flex items-center justify-between">
                                    <span className="text-xs text-slate-500">{new Date(file.uploaded).toLocaleDateString()}</span>
                                    <div className="flex gap-1">
                                        <a
                                            href={file.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-md transition-colors"
                                            title="열기"
                                        >
                                            <ExternalLink size={16} />
                                        </a>
                                        <button
                                            onClick={() => handleCopyLink(file.url || '')}
                                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors"
                                            title="링크 복사"
                                        >
                                            <Link size={16} />
                                        </button>
                                        {file.display_name.endsWith('.html') && (
                                            <button
                                                onClick={() => handleOpenEditor(file)}
                                                className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors"
                                                title="내용 수정"
                                            >
                                                <FileCode size={16} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleStartEdit(file)}
                                            className="p-1.5 text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/10 rounded-md transition-colors"
                                            title="이름 변경"
                                        >
                                            <Pencil size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(file.key)}
                                            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                                            title="삭제"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            {/* Verification Modal */}
            {verificationState && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="glass-card p-8 rounded-2xl max-w-sm w-full text-center border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-200">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-indigo-500/30">
                            <Check className="w-6 h-6 text-indigo-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">사람인지 확인이 필요합니다</h3>
                        <p className="text-slate-400 text-sm mb-6">
                            보안을 위해 {verificationState.type === 'upload' ? '업로드' : '삭제'} 전 확인 과정을 거칩니다.
                        </p>

                        <div className="flex justify-center mb-6">
                            <Turnstile
                                sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
                                onVerify={handleVerificationSuccess}
                                theme="dark"
                            />
                        </div>

                        <button
                            onClick={() => setVerificationState(null)}
                            className="text-slate-500 hover:text-white text-sm transition-colors"
                        >
                            취소
                        </button>
                    </div>
                </div>
            )}

            {/* File Editor Modal */}
            {editorFile && (
                <FileEditorModal
                    isOpen={editorOpen}
                    onClose={() => setEditorOpen(false)}
                    fileKey={editorFile.key}
                    fileName={editorFile.name}
                    onSave={() => {
                        // 저장 후 필요한 경우 목록 갱신 등을 수행할 수 있음
                        // 현재는 단순 저장만 수행
                    }}
                />
            )}

            <Footer />

            {/* Hidden Input */}
            <input
                type="file"
                multiple
                ref={fileInputRef}
                className="hidden"
                onChange={handleUpload}
                accept=".html,.png,.jpg,.jpeg,.gif,.svg,.webp"
            />
        </div>
    );
}
