import { useEffect, useState } from 'react';
import axios from 'axios';
import { Toaster, toast } from 'sonner';
import { Trash2, LogOut, Loader2, Search, Server, Cloud, Database, FileText, Image as ImageIcon, ExternalLink, ShieldCheck, Users, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Footer } from '../components/Footer';

type DocFile = {
    key: string;
    name: string;
    display_name: string;
    url?: string;
    size: number;
    uploaded: string;
};

type SystemStatus = {
    google: boolean;
    cloudflare: boolean;
    r2: boolean;
};

/**
 * 관리자 대시보드 페이지
 * 시스템 상태 모니터링 및 전체 파일 관리 기능을 제공합니다.
 *
 * @returns JSX.Element 관리자 대시보드 UI
 * @author 윤명준 (MJ Yune)
 * @since 2026-02-02
 */
export function AdminDashboard() {
    const navigate = useNavigate();
    const [files, setFiles] = useState<DocFile[]>([]);
    const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedUser, setSelectedUser] = useState<string>('all');
    const [deleting, setDeleting] = useState<string | null>(null);

    useEffect(() => {
        checkAuthAndFetchData();
    }, []);

    /**
     * 인증 상태를 확인하고 관리자 권한이 있는 경우 데이터를 불러옵니다.
     * 권한이 없으면 사용자 대시보드 또는 메인으로 리다이렉트합니다.
     *
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const checkAuthAndFetchData = async () => {
        try {
            // 1. Check Auth & Admin Status
            const { data: authData } = (await axios.get('/auth/me')) as { data: any };
            if (!authData.authenticated || !authData.isAdmin) {
                toast.error('접근 권한이 없습니다.');
                navigate('/dashboard');
                return;
            }

            // 2. Fetch System Status
            fetchSystemStatus();

            // 3. Fetch All Files
            fetchFiles();
        } catch {
            navigate('/');
        }
    };



    /**
     * 시스템 상태(Google, Cloudflare, R2)를 조회합니다.
     *
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const fetchSystemStatus = async () => {
        try {
            const { data } = await axios.get('/api/admin/system');
            setSystemStatus(data);
        } catch {
            toast.error('시스템 상태를 불러오지 못했습니다.');
        }
    };



    /**
     * 모든 파일 목록을 조회합니다.
     * 관리자 권한으로 scope=all 파라미터를 사용하여 전체 파일을 가져옵니다.
     *
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const fetchFiles = async () => {
        try {
            // 관리자 컨텍스트는 모든 파일 조회를 의미합니다.
            // 기존 /api/docs 엔드포인트는 prefix를 기반으로 파일을 반환합니다.
            // 관리자의 경우, api/docs.ts에서 이미 "isAdmin ? prefix='docs/' : ..." 로직을 처리합니다.
            // 따라서 관리자 권한으로 /api/docs를 호출하면 모든 파일을 반환해야 합니다.
            // 업데이트: 이제 관리자라도 모든 파일을 보려면 scope=all 파라미터를 명시적으로 강제합니다.
            const { data } = (await axios.get('/api/docs?scope=all')) as { data: { files: DocFile[] } };
            setFiles(data.files);
        } catch (e) {
            toast.error('파일 목록을 불러오지 못했습니다.');
        } finally {
            setLoading(false);
        }
    };



    /**
     * 파일을 삭제합니다.
     * 관리자 권한으로 실행되며, 삭제 전 확인 메시지를 표시합니다.
     *
     * @param key 삭제할 파일 키 (경로)
     * @returns Promise<void>
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const handleDelete = async (key: string) => {
        if (!confirm('정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) return;

        setDeleting(key);
        try {
            // Use DELETE method with data body (supported by axios)
            await axios.delete('/api/admin/files', {
                data: { key },
            });
            toast.success('파일이 삭제되었습니다.');
            setFiles((prev) => prev.filter((f) => f.key !== key));
        } catch (e) {
            toast.error('삭제 실패');
        } finally {
            setDeleting(null);
        }
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

    const users = Array.from(
        new Set(
            files.map((f) => {
                const parts = f.key.split('/');
                // key format: docs/email/filename
                return parts.length > 2 ? parts[1] : 'Unknown';
            }),
        ),
    ).sort();

    const filteredFiles = files.filter((f) => {
        const matchesSearch = f.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                             f.key.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesUser = selectedUser === 'all' ? true : f.key.includes(`/${selectedUser}/`);
        return matchesSearch && matchesUser;
    });

    /**
     * 시스템 상태 카드 컴포넌트
     *
     * @param props.title 서비스명
     * @param props.status 연결 상태
     * @param props.icon 아이콘 컴포넌트
     * @param props.link 대시보드 링크
     * @returns JSX.Element
     * @author 윤명준 (MJ Yune)
     * @since 2026-02-03
     */
    const StatusCard = ({ title, status, icon: Icon, link }: { title: string; status: boolean; icon: any; link: string }) => (
        <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="glass-card p-6 flex items-center justify-between border border-white/5 bg-slate-900/40 hover:bg-slate-800/60 transition-colors group cursor-pointer"
        >
            <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${status ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    <Icon size={24} />
                </div>
                <div>
                    <h3 className="text-sm font-medium text-slate-400 group-hover:text-indigo-300 transition-colors flex items-center gap-2">
                        {title}
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                    <p className={`text-lg font-bold ${status ? 'text-white' : 'text-red-400'}`}>{status ? 'Connected' : 'Disconnected'}</p>
                </div>
            </div>
            <div className={`w-3 h-3 rounded-full ${status ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]'}`}></div>
        </a>
    );

    return (
        <div className="min-h-screen flex flex-col font-sans text-slate-200 bg-slate-950">
            <Toaster
                theme="dark"
                position="top-right"
            />

            {/* Header */}
            <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-indigo-500/20">
                <div className="container mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-red-500 to-pink-600 flex items-center justify-center shadow-lg shadow-red-500/20 ring-1 ring-white/20">
                            <ShieldCheck className="text-white w-6 h-6" />
                        </div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-pink-200 to-rose-400 bg-clip-text text-transparent">Gem Admin</h1>
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/dashboard')}
                            className="text-sm text-slate-400 hover:text-white transition-colors"
                        >
                            사용자 대시보드로 이동
                        </button>
                        <button
                            onClick={() => (window.location.href = '/auth/logout')}
                            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                            title="로그아웃"
                        >
                            <LogOut size={20} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-6 pt-32 pb-20">
                {/* System Status Section */}
                <section className="mb-12">
                    <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                        <Server
                            className="text-indigo-400"
                            size={24}
                        />
                        System Status
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <StatusCard
                            title="Google OAuth"
                            status={systemStatus?.google ?? false}
                            icon={Cloud}
                            link="https://console.cloud.google.com/apis/credentials"
                        />
                        <StatusCard
                            title="Cloudflare Pages"
                            status={systemStatus?.cloudflare ?? false}
                            icon={Server}
                            link="https://dash.cloudflare.com/"
                        />
                        <StatusCard
                            title="R2 Storage"
                            status={systemStatus?.r2 ?? false}
                            icon={Database}
                            link="https://dash.cloudflare.com/"
                        />
                    </div>
                </section>

                {/* File Management Section */}
                <section>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-6">
                        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                            <Database
                                className="text-indigo-400"
                                size={24}
                            />
                            File Management
                        </h2>

                        <div className="flex flex-col md:flex-row gap-4 w-full md:w-auto">
                            <div className="bg-slate-900/50 rounded-full px-4 py-2 border border-white/5 flex items-center gap-2">
                                <Users
                                    size={16}
                                    className="text-slate-500"
                                />
                                <select
                                    value={selectedUser}
                                    onChange={(e) => setSelectedUser(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm text-white w-full md:w-48 appearance-none cursor-pointer"
                                >
                                    <option
                                        value="all"
                                        className="bg-slate-900 text-slate-300"
                                    >
                                        모든 사용자
                                    </option>
                                    {users.map((user) => (
                                        <option
                                            key={user}
                                            value={user}
                                            className="bg-slate-900 text-slate-300"
                                        >
                                            {user}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-slate-900/50 rounded-full px-4 py-2 border border-white/5 flex items-center gap-2 w-full md:w-auto">
                                <Search
                                    size={16}
                                    className="text-slate-500"
                                />
                                <input
                                    type="text"
                                    placeholder="파일 검색..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm text-white placeholder-slate-500 w-full md:w-64"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="glass-card rounded-2xl border border-white/5 overflow-hidden">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                                <Loader2 className="animate-spin w-10 h-10 text-indigo-500" />
                                <p className="text-slate-500">데이터를 불러오는 중...</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-slate-900/50">
                                            <th className="p-4 text-slate-400 font-medium text-sm">File Name</th>
                                            <th className="p-4 text-slate-400 font-medium text-sm">Key (Path)</th>
                                            <th className="p-4 text-slate-400 font-medium text-sm">Size</th>
                                            <th className="p-4 text-slate-400 font-medium text-sm">Date</th>
                                            <th className="p-4 text-slate-400 font-medium text-sm text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredFiles.map((file) => (
                                            <tr
                                                key={file.key}
                                                className="border-b border-white/5 hover:bg-white/5 transition-colors"
                                            >
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${file.key.endsWith('.html') ? 'bg-orange-500/20 text-orange-400' : 'bg-blue-500/20 text-blue-400'}`}>
                                                            {file.key.endsWith('.html') ? <FileText size={16} /> : <ImageIcon size={16} />}
                                                        </div>
                                                        <span className="font-medium text-white">{file.display_name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-4 text-slate-400 text-sm font-mono">{file.key}</td>
                                                <td className="p-4 text-slate-400 text-sm">{(file.size / 1024).toFixed(1)} KB</td>
                                                <td className="p-4 text-slate-400 text-sm">{new Date(file.uploaded).toLocaleDateString()}</td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <a
                                                            href={file.url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-indigo-500/20 transition-colors"
                                                            title="열기"
                                                        >
                                                            <ExternalLink size={18} />
                                                        </a>
                                                        <button
                                                            onClick={() => handleCopyLink(file.url || '')}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-indigo-500/20 transition-colors"
                                                            title="링크 복사"
                                                        >
                                                            <Copy size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDelete(file.key)}
                                                            disabled={deleting === file.key}
                                                            className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/20 transition-colors disabled:opacity-50"
                                                            title="삭제"
                                                        >
                                                            {deleting === file.key ? (
                                                                <Loader2
                                                                    size={18}
                                                                    className="animate-spin"
                                                                />
                                                            ) : (
                                                                <Trash2 size={18} />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredFiles.length === 0 && <div className="text-center py-12 text-slate-500">검색 결과가 없습니다.</div>}
                            </div>
                        )}
                    </div>
                </section>
            </main>

            <Footer />
        </div>
    );
}
