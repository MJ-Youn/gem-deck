# 💎 Gem Deck

> **팀을 위한 프리미엄 프레젠테이션 뷰어**  
> Modern Team Presentation Viewer with Glassmorphism Design

### 🔗 Service URL: [https://gem-deck.pages.dev](https://gem-deck.pages.dev)

## 📖 소개 (Introduction)

**Gem Deck**은 모던한 UI와 글래스모피즘(Glassmorphism) 디자인이 결합된 웹 기반 프레젠테이션 뷰어입니다.  
HTML 기반의 프레젠테이션 파일을 아름답게 관리하고 열람할 수 있으며, **Cloudflare Pages**와 **Workers**를 통해 빠르고 안전하게 동작합니다.

### ✨ 주요 기능 (Key Features)

- **🎨 Premium UX/UI**: 최신 트렌드의 글래스모피즘 인터페이스와 고급스러운 다크 모드 테마
- **📂 스마트 파일 관리**: 드래그 앤 드롭으로 HTML 프레젠테이션 및 관련 이미지 업로드
- **⚡️ 빠른 뷰어**: Cloudflare Edge Network를 활용한 초고속 로딩
- **🔒 보안 로그인**: Google 계정 연동을 통한 안전한 사용자 인증
- **✏️ 파일 이름 변경**: 리스트/그리드 뷰에서 즉시 파일 이름 수정 (확장자 자동 관리)
- **🔍 편리한 탐색**: 리스트/그리드 뷰 전환 및 검색 기능 제공

---

## 🛠 기술 스택 (Tech Stack)

| Category     | Technology                             |
| ------------ | -------------------------------------- |
| **Frontend** | React 19, TypeScript, Vite             |
| **Styling**  | Tailwind CSS v4, PostCSS, Lucide Icons |
| **Backend**  | Cloudflare Pages Functions (Workers)   |
| **Storage**  | Cloudflare R2 (Binding: `GEM_DECK`)    |
| **Package**  | npm, yarn                              |

---

## 🚀 배포 설정 (Deployment Configuration)

Cloudflare Pages에 배포 시 다음 설정이 필수입니다.

### 1. R2 버킷 연결 (Functions)

`Settings` > `Functions` > `R2 Bucket Bindings`에서 다음 변수를 추가합니다.

- **Variable name**: `GEM_DECK`
- **R2 Bucket**: (사용 중인 R2 버킷 이름, 예: `gem-deck`)

### 2. 환경 변수 (Environment Variables)

`Settings` > `Environment Variables`에서 다음 변수를 추가합니다.

- `ENCRYPTION_SECRET`: 파일 경로 암호화 키
- `ADMIN_EMAIL`: 관리자 권한용 이메일
- `GOOGLE_CLIENT_ID`: Google OAuth Client ID
- `GOOGLE_CLIENT_SECRET`: Google OAuth Client Secret
- `GOOGLE_CALLBACK_URL`: OAuth 콜백 URL (예: `https://your-domain.com/auth/callback`)
- `TURNSTILE_SECRET_KEY`: Cloudflare Turnstile Secret Key (Backend)

---

## 🚀 시작하기 (Getting Started)

로컬 개발 환경에서 프로젝트를 실행하는 방법입니다.

### 1. 레포지토리 클론 (Clone)

### 3. Turnstile 설정 (필수)

**Frontend (.env)**:
`VITE_TURNSTILE_SITE_KEY`를 `.env` 파일에 추가합니다.

```env
VITE_TURNSTILE_SITE_KEY=your_site_key_here
```

**Backend (.dev.vars)**:
Cloudflare Dashboard에서 발급받은 실제 **Site Key**와 **Secret Key**를 `.dev.vars`에 추가합니다.

```env
TURNSTILE_SECRET_KEY=your_secret_key_here
VITE_TURNSTILE_SITE_KEY=your_site_key_here
```

운영 환경(Cloudflare Pages)에서는 `Settings > Environment Variables`에 동일한 키를 등록해야 합니다.

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

- 서버는 `http://localhost:8789` 에서 자동으로 시작됩니다.

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
├── │   ├── 📂 components/  # 재사용 가능한 UI 컴포넌트
├── │   ├── 📂 pages/       # 라우트 페이지 (Login, Dashboard, Viewer)
├── │   ├── 📜 App.tsx      # 메인 앱 라우터
├── │   └── 📜 index.css    # 전역 스타일 (Tailwind v4)
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

### v1.2.2 (2026-02-03) - HTML Editor & Documentation 📝

**"In-Browser Code Editing & Comprehensive Docs"**

- **✨ 기능 추가 (Features)**:
    - **HTML 코드 편집 (HTML Editor)**: 대시보드에서 HTML 파일을 바로 수정할 수 있는 전용 모나코(Monaco) 에디터 기능 추가.
    - **UI 개선 (UI Enhancements)**: 버튼 툴팁 추가 및 파일 아이콘/색상 구분 강화.
- **📚 문서화 (Documentation)**:
    - **Javadoc 표준화**: 모든 주요 소스 코드(`src`, `functions`)에 한국어 Javadoc 주석 추가 완료.
- **🧹 리팩토링 (Refactoring)**:
    - 코드 구조 정리 및 불필요한 파일 정리.

### v1.2.1 (2026-02-02) - Admin Features & Refactoring 🛠️

**"Enhanced Admin Capabilities & Code Cleanup"**

- **✨ 기능 추가 (Features)**:
    - **링크 복사 (Copy Link)**: Dashboard 및 Admin Dashboard의 리스트/그리드 뷰에서 파일 링크 즉시 복사 기능 추가.
    - **시스템 상태 링크 (Admin)**: Admin Dashboard의 Status Card(Google, Cloudflare, R2) 클릭 시 해당 서비스 대시보드로 이동.
- **🧹 리팩토링 & 정리 (Refactoring & Cleanup)**:
    - **Global Rules**: 모든 TSX 소스 코드에 한글 Javadoc(Author: 윤명준) 및 코딩 컨벤션 적용.
    - **Logging**: 불필요한 `console.log`, `console.error` 제거.
    - **Cleanup**: 사용하지 않는 `Viewer.tsx` 컴포넌트 및 라우트 제거.

### v1.2.0 (2026-02-02)

- **보안 강화 (Security)**:
    - 중요 액션(파일 업로드, 삭제) 시 **Cloudflare Turnstile** 검증 도입.
    - 로그인 세션 유지 시간을 그대로 두면서 봇 악용 방지.
- **UI 개선 (UX)**:
    - **리스트 뷰 이름 변경**: 팝업 대신 인라인 수정 방식으로 변경 (그리드 뷰와 통일).
    - 대시보드 검증 모달 디자인 적용.
- **자산 업데이트**:
    - 새로운 로고 및 파비콘 적용.
- **SEO**:
    - `robots.txt` 추가 (개인 페이지 크롤링 방지).

### v1.1.0 (2026-02-02) - File Rename & Refactoring ✏️

**"Enhanced Usability & Code Quality"**

- **✏️ 파일 이름 변경 기능**:
    - 리스트/그리드 뷰에서 파일을 직접 이름 변경할 수 있습니다.
    - `.html` 확장자를 자동으로 유지하며 사용자 친화적인 UI를 제공합니다.
- **🧹 코드 리팩토링 및 표준화**:
    - 모든 주요 소스 코드(`functions`, `src`)에 **코딩 표준(Korean Javadoc, Braces)** 적용.
    - 불필요한 코드 제거 및 가독성 향상.
- **⚙️ 배포 구성 최적화**:
    - R2 버킷 바인딩 변수를 명확한 이름(`GEM_DECK`)으로 통일.

### v1.0.0-20260201 (2026-02-01) - Major UI Overhaul ✨

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
