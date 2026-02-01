import { Github, Globe, Mail } from 'lucide-react';
import { APP_VERSION } from '../constants';

/**
 * 어플리케이션 하단에 위치하는 푸터 컴포넌트입니다.
 * 저작권 정보와 개발자의 GitHub, 블로그 링크를 포함합니다.
 *
 * @author 윤명준 (MJ Yune)
 * @since 2026-01-30
 */
export const Footer = () => {
    return (
        <footer className="fixed bottom-0 left-0 right-0 w-full py-5 border-t border-white/5 glass z-40">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    {/* Copyright Section */}
                    <div className="text-sm text-slate-500 flex items-center gap-3">
                        <span className="font-medium">© 2026 <span className="text-slate-300">윤명준 (MJ Yun)</span></span>
                        <span className="w-1 h-1 rounded-full bg-slate-700"></span>
                        <span className="text-slate-600 font-mono text-xs px-2 py-0.5 rounded-full bg-slate-900 border border-white/5">{APP_VERSION}</span>
                    </div>

                    {/* Social Links Section */}
                    <div className="flex items-center gap-6">
                        <a
                            href="https://github.com/MJ-Youn/daily-calorie-db"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-white hover:scale-110 transition-all duration-200"
                            title="GitHub"
                        >
                            <Github className="h-5 w-5" />
                        </a>
                        <a
                            href="https://mj.is-a.dev"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-500 hover:text-indigo-400 hover:scale-110 transition-all duration-200"
                            title="Blog"
                        >
                            <Globe className="h-5 w-5" />
                        </a>
                        <a
                            href="mailto:yun0244@naver.com"
                            className="text-slate-500 hover:text-violet-400 hover:scale-110 transition-all duration-200"
                            title="Contact Email"
                        >
                            <Mail className="h-5 w-5" />
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};