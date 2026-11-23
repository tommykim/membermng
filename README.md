# MemberDesk - 회원관리 프로그램

Next.js와 TypeScript 기반의 깔끔하고 직관적인 회원 관리 웹 애플리케이션입니다.

## 🚀 주요 기능

- **회원 인증 / 계정 관리**: 로그인 및 회원가입 기능 (로컬 오프라인 모드 & Supabase 연동 지원)
- **회원 목록 관리**:
  - 새 회원 등록 (이름, 이메일, 전화번호, 생년월일)
  - 회원 정보 실시간 수정 및 삭제
  - 이름, 이메일, 전화번호 실시간 검색 및 페이지네이션
- **데이터 내보내기**: 회원 목록 CSV 다운로드 (엑셀 호환 UTF-8 BOM 지원)
- **현황 대시보드**: 전체 회원 수, 이번 달 신규 가입자 통계 카드
- **하이브리드 모드 지원**:
  - **로컬 모드**: Supabase 설정 없이도 브라우저 로컬 저장소(`localStorage`)를 통해 즉시 사용 가능
  - **클라우드 모드**: Supabase URL 및 API Key 설정 시 실제 클라우드 DB와 연동

## 🛠 기술 스택

- **Framework**: Next.js (App Router)
- **Library**: React 19, TypeScript
- **Styling**: Tailwind CSS
- **Backend / Database**: Supabase (또는 Local Mock Storage)
- **Icons**: Lucide React

## 💻 로컬 실행 방법

### 1. 패키지 설치
```bash
npm install
# 또는
pnpm install
```

### 2. 개발 서버 실행
```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)으로 접속합니다.

### 3. (선택) Supabase 연동
실제 온라인 데이터베이스와 연동하려면 `.env.example`을 복사하여 `.env.local`을 생성하고 키 값을 입력하세요.
```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```
*(미설정 시 자동으로 로컬 모드로 동작합니다)*
