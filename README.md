# 💎 Gem Deck

> **팀을 위한 프리미엄 프레젠테이션 뷰어**  
> Modern Team Presentation Viewer with Glassmorphism Design

![Gem Deck Preview](/assets/preview.png)

## 📖 소개 (Introduction)

**Gem Deck**은 모던한 UI와 글래스모피즘(Glassmorphism) 디자인이 결합된 웹 기반 프레젠테이션 뷰어입니다.  
HTML 기반의 프레젠테이션 파일을 아름답게 관리하고 열람할 수 있으며, **Cloudflare Pages**와 **Workers**를 통해 빠르고 안전하게 동작합니다.

### ✨ 주요 기능 (Key Features)

- **🎨 Premium UX/UI**: 최신 트렌드의 글래스모피즘 인터페이스와 고급스러운 다크 모드 테마
- **📂 스마트 파일 관리**: 드래그 앤 드롭으로 HTML 프레젠테이션 및 관련 이미지 업로드
- **⚡️ 빠른 뷰어**: Cloudflare Edge Network를 활용한 초고속 로딩
- **🔒 보안 로그인**: Google 계정 연동을 통한 안전한 사용자 인증
- **🔍 편리한 탐색**: 리스트/그리드 뷰 전환 및 검색 기능 제공

---

## 🛠 기술 스택 (Tech Stack)

| Category | Technology |
|----------|------------|
| **Frontend** | React 19, TypeScript, Vite |
| **Styling** | Tailwind CSS v4, PostCSS, Lucide Icons |
| **Backend** | Cloudflare Pages Functions (Workers) |
| **Storage** | Cloudflare R2 (Plans) / KV |
| **Package** | npm, yarn |

---

## 🚀 시작하기 (Getting Started)

로컬 개발 환경에서 프로젝트를 실행하는 방법입니다.

### 1. 레포지토리 클론 (Clone)

```bash
git clone https://github.com/MJ-Youn/gem-deck.git
cd gem-deck
```

### 2. 의존성 설치 (Install Dependencies)

```bash
npm install
```

### 3. 개발 서버 실행 (Run Dev Server)

이 프로젝트는 `wrangler`를 사용하여 Cloudflare Pages 환경을 시뮬레이션합니다.

```bash
npm run dev
```
* 서버는 `http://localhost:8789` 에서 자동으로 시작됩니다.

---

## 📜 스크립트 (Scripts)

- **`npm run dev`**: Wrangler Proxy와 Vite 프론트엔드를 통합하여 실행 (추천)
- **`npm run dev:frontend`**: Vite 프론트엔드 단독 실행 (백엔드 API 없음)
- **`npm run build`**: TypeScript 컴파일 및 프로덕션 빌드
- **`npm run deploy`**: 빌드 후 Cloudflare Pages에 배포

---

## 📁 프로젝트 구조 (Project Structure)

```
gem-deck/
├── 📂 functions/       # Cloudflare Pages Functions (Backend API)
├── 📂 src/
│   ├── 📂 components/  # 재사용 가능한 UI 컴포넌트
│   ├── 📂 pages/       # 라우트 페이지 (Login, Dashboard, Viewer)
│   ├── 📜 App.tsx      # 메인 앱 라우터
│   └── 📜 index.css    # 전역 스타일 (Tailwind v4)
├── 📜 package.json
└── 📜 wrangler.toml    # Cloudflare 설정 파일
```

---

## 👤 작성자 (Author)

Created by **윤명준 (MJ Yune)**
- GitHub: [@MJ-Youn](https://github.com/MJ-Youn)
- Email: yun0244@naver.com

---

## 📄 라이선스 (License)

This project is licensed under the MIT License.

---

## 📅 릴리즈 노트 (Release Notes)

### v1.0.0.20260201 (2026-02-01) - Major UI Overhaul ✨
**"Premium Glassmorphism Design Update"**

- **🎨 디자인 전면 개편**: 전체 UI에 Glassmorphism(유리 잔상 효과) 테마 적용
- **🌗 테마 강화**: Deep Indigo & Violet 그라데이션 기반의 모던 다크 모드 완성
- **📂 대시보드 개선**:
  - 리스트 뷰 / 그리드 뷰 전환 기능 추가
  - 검색 기능 추가
  - 드래그 앤 드롭 업로드 Zone UX 개선
- **🔧 기술적 개선**:
  - `Tailwind CSS v4` 완벽 호환성 확보
  - `.gitignore` 및 `README.md` 등 프로젝트 설정 파일 표준화
  - `Outfit` 모던 폰트 적용 가독성 향상

