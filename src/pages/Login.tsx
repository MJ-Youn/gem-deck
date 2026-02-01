import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { LayoutDashboard, Sparkles } from 'lucide-react';

export function Login() {
    const navigate = useNavigate();

    useEffect(() => {
        checkAuth();
    }, []);

    const checkAuth = async () => {
        try {
            const { data } = (await axios.get('/auth/me')) as { data: any };
            if (data.authenticated) {
                navigate('/dashboard');
            }
        } catch {
            // Not authenticated, stay here
        }
    };

    const handleLogin = () => {
        window.location.href = '/auth/login';
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/20 rounded-full blur-[120px] animate-float" />
                <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-violet-600/20 rounded-full blur-[120px] animate-float-delayed" />
                <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
            </div>

            <div className="glass-card max-w-md w-full p-8 md:p-12 text-center relative z-10 border-t border-white/20">
                <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-gradient-to-tr from-indigo-500/20 to-violet-500/20 mb-8 ring-1 ring-white/10 shadow-lg shadow-indigo-500/20">
                    <LayoutDashboard className="w-10 h-10 text-indigo-400" />
                </div>

                <div className="relative mb-3">
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white via-indigo-200 to-indigo-400 bg-clip-text text-transparent tracking-tight">
                        Gem Deck
                    </h1>
                    <Sparkles className="w-5 h-5 text-yellow-300 absolute -top-1 -right-2 animate-pulse" />
                </div>
                
                <p className="text-slate-400 mb-10 text-lg leading-relaxed">
                    프리미엄 프레젠테이션 뷰어<br/>
                    <span className="text-sm text-slate-500">모던한 팀을 위한 스마트한 선택</span>
                </p>

                <button
                    onClick={handleLogin}
                    className="btn btn-primary w-full py-4 text-lg group relative overflow-hidden"
                >
                    <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                    <div className="flex items-center justify-center gap-3 relative z-10">
                        <div className="p-1 bg-white rounded-full">
                            <img
                                src="https://www.svgrepo.com/show/475656/google-color.svg"
                                className="w-4 h-4"
                                alt="G"
                            />
                        </div>
                        <span className="font-semibold">Google 계정으로 시작하기</span>
                    </div>
                </button>
                
                <div className="mt-8 pt-6 border-t border-white/5">
                    <p className="text-xs text-slate-500 font-light">
                        Powered by Cloudflare Pages & Workers
                    </p>
                </div>
            </div>
        </div>
    );
}
