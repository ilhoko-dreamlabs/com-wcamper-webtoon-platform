# 봉달캠퍼 유니버스 코믹스

`webtoon.wcamper.com` 캠핑 웹툰 플랫폼입니다. 1차 MVP에서는 Google Drive에 업로드된 실제 웹툰 컷을 정적 사이트에 연결해 `봉달캠퍼 유니버스 코믹스` 공개연재 형태로 제공했습니다. 현재는 2차 개발로 진입하며, `auth.wcamper.com` 통합인증을 기준으로 회원 피드백, 작가신청, 작가 권한, 제출 API, 데이터 저장 구조를 구현하는 단계입니다.

## 현재 개발 단계

| 단계 | 상태 | 범위 |
|---|---|---|
| 1차 MVP | 완료 | 정적 웹툰 공개, 작품/회차/작가 화면, 피드백 설계 UI, 통합인증 진입 UI |
| 2차 개발 | 진행 | 통합로그인 회원 전용 피드백, 작가신청, 작가 테이블, 피드백/작가신청 API, DB 전환 |
| 운영 베타 | 예정 | 실제 작가 제출, 검수, 공개 승인, 조회/완독/피드백 집계, 스코어링 |

## 핵심 정책

- 피드백 작성은 `auth.wcamper.com` 통합로그인과 통합회원가입을 완료한 회원만 가능하다.
- 비로그인 사용자는 웹툰 읽기, 작품/회차/작가 조회만 가능하다.
- 웹툰 사이트 자체 회원가입은 만들지 않고, 모든 회원가입은 `auth.wcamper.com/signup`으로 통합한다.
- `작가가입`이라는 별도 회원가입은 만들지 않는다.
- 일반회원 가입 후 웹툰 서비스에서 `작가신청`을 제출하고, 운영 승인 후 작가 권한을 부여한다.
- 작가 정보는 auth 회원 테이블에 섞지 않고 웹툰 도메인의 별도 `Author` 테이블로 관리한다.
- `Author.userId`는 auth 플랫폼의 회원 ID를 참조하는 외부 키값으로 사용한다.
- 서비스 DB 분리를 고려해 auth DB와 웹툰 DB 사이의 물리 FK는 두지 않고, API 세션 검증으로 무결성을 보장한다.

## 2차 개발 목표

- `auth.wcamper.com/login?service=wcamper-webtoon&returnTo=...` 기반 로그인 복귀 흐름 확정
- `auth.wcamper.com/signup` 기반 통합회원가입 흐름 확정
- `GET https://auth.wcamper.com/api/auth/session` 기반 세션 확인
- 로그인 회원 전용 `POST /api/feedback` 구현
- 작가신청 `POST /api/author-applications` 구현
- 내 작가신청 상태 조회 `GET /api/author-applications/me` 구현
- 운영자 승인 후 `Author.status=ACTIVE` 전환
- `Author`, `AuthorApplication`, `Feedback`, `Favorite`, `FeedbackReport` 테이블 구현
- 정적 카탈로그 중심 구조에서 `Vercel Functions + Postgres + object storage` 기준으로 백엔드 전환

상세 계획은 `docs/AUTH_FEEDBACK_AUTHOR_PLAN.md`를 기준으로 한다.

## 구성

- `index.html`: 독자용 웹툰 사이트
- `docs/DESIGN.md`: 제품 구성, 통합인증, 피드백, 방문/조회 데이터, 스코어링 설계
- `docs/AUTH_FEEDBACK_AUTHOR_PLAN.md`: 통합로그인 기반 피드백/작가신청 설계 및 실행 계획
- `docs/NAVIGATION_PAGE_DESIGN.md`: 내비게이션, 마이페이지, 작가페이지 설계
- `docs/CREATOR_STUDIO_DETAIL_DESIGN.md`: 작가페이지 상세 화면, 작가 권한, 작품/회차/피드백 운영 설계
- `docs/SITE_ADMIN_SETTINGS_DESIGN.md`: 사이트관리자 설정, 관리자 권한, 운영 콘솔 설계
- `data/catalog.js`: 작품/회차 카탈로그 데이터
- `assets/`: CSS, JS, 이미지 자산
- `webtoon/characters/`: 캐릭터 기준 자산과 프롬프트
- `webtoon/world/`: BD크루 세계관, 관계, 말투 기준
- `webtoon/skills/`: worker 제작 규칙
- `webtoon/episodes/`: 회차별 worker 작업공간
- `api/`: Vercel Functions 기반 회원 피드백, 작가신청, 작가 콘솔 API
- `db/schema.sql`: 웹툰 서비스 전용 Postgres 스키마

## 로컬 실행

```bash
cd /workspace/github/com-wcamper-webtoon-platform
npm run start
```

브라우저에서 `http://localhost:5174/`로 확인합니다.

## 검증

```bash
npm run build
```

현재 저장소에서 확인된 로컬 검증 명령은 정적 페이지 생성용 `build`입니다. 테스트, 린트, 타입체크 스크립트는 아직 정의되어 있지 않습니다.

## 2차 백엔드 운영 설정

Vercel Functions는 다음 환경변수를 사용합니다.

| 환경변수 | 필수 | 용도 |
|---|---|---|
| `WEBTOON_DATABASE_URL` 또는 `POSTGRES_URL` 또는 `DATABASE_URL` | 예 | 웹툰 전용 Postgres 연결 문자열 |
| `AUTH_SESSION_URL` | 아니오 | 기본값 `https://auth.wcamper.com/api/auth/session` |
| `WEBTOON_PUBLIC_ORIGIN` | 아니오 | 기본값 `https://webtoon.wcamper.com` |
| `WEBTOON_DATABASE_SSL` | 아니오 | `disable`이면 DB SSL 비활성화 |
| `WEBTOON_ADMIN_API_TOKEN` | 예, 관리자 승인 API 사용 시 | 작가신청 승인 API Bearer 토큰 |
| `WEBTOON_ADMIN_EMAILS` | 아니오 | 추가 사이트관리자 이메일 allowlist. 쉼표 또는 공백 구분 |
| `WEBTOON_AUTHOR_EMAILS` | 아니오 | 추가 승인 작가 이메일 allowlist. 쉼표 또는 공백 구분 |

DB 스키마는 자동 마이그레이션하지 않습니다. 운영 DB에 `db/schema.sql`을 적용한 뒤 API를 배포합니다.

서버 API가 auth 세션을 검증하려면 브라우저가 `webtoon.wcamper.com`의 `/api/*` 요청에도 `wcamper_session` 쿠키를 전달해야 합니다. 따라서 auth 운영 설정은 세션 쿠키 domain을 `.wcamper.com` 범위로 발급하는 구성이 필요합니다. 이 조건이 충족되지 않으면 프론트의 auth 세션 확인은 성공해도 webtoon API 저장 요청은 `AUTH_REQUIRED`로 실패합니다.

초기 사이트관리자 계정은 `ilho.ko@dreamlabs.co.kr`입니다. 추가 계정은 `WEBTOON_ADMIN_EMAILS` 또는 auth role `siteAdmin`/`webtoonAdmin`으로 등록합니다.

초기 승인 작가 계정은 `ilho.ko@dreamlabs.co.kr`입니다. 해당 계정은 auth 세션에서 검증된 이메일이 일치하면 웹툰 API가 `Author.status=ACTIVE`에 준하는 작가 권한으로 처리합니다. 추가 작가는 `WEBTOON_AUTHOR_EMAILS` 또는 auth role `webtoonAuthor`/`creator`/`author`로 등록합니다.

## 1차 MVP 완료 범위

- 작가 프로필: `봉달캠퍼 유니버스 코믹스`
- 공개연재 시즌 1: `BD-Crew 단톡방` 13컷
- 공개연재 시즌 2: `부라보캠프 단톡방` 5컷
- 기획중: `봉봉패미리 캠핑`
- Google Drive에서 내려받은 정적 이미지 기반 회차 뷰어
- 메인, 작품 목록, 작품 상세, 회차 목록, 회차 뷰어
- 작가 프로필, 작가의 여러 작품, 연재 준비작, 기획작
- 작가/작품/회차별 피드백 설계 화면
- `auth.wcamper.com` 통합인증 진입 UI
- 비로그인 피드백 작성 차단 UI
- 통합로그인/통합회원가입 CTA
- 작가신청/작가페이지 진입 구조
- 방문/조회/완독/재방문 데이터 축적 설계
- 작가/작품/회차별 목표 설정 및 달성률 설계 화면
- 작가 제출 API, MCP 서버, GPT Actions용 OpenAPI 계약 방향
- AI 도구 사용 고지와 검수 상태 설계
- Vercel 기반 무료 MVP/베타 운영 기준
- 모바일 최적화
- 정적 데이터 기반 게시
- 회차별 제작 폴더 규칙
- worker 산출물 검수 체크리스트

## 2차에서 구현할 항목

- 실제 회원 세션 확인: API 구현
- 실제 피드백 저장/댓글 운영: 피드백 저장/조회 API 구현
- 실제 작가신청 저장 및 검수 운영: 신청 저장/조회/승인 API 구현
- 실제 작가 권한 테이블과 작가페이지 권한 분기: DB/API 기반 구현 시작
- 실제 방문/조회 이벤트 저장 API
- 실제 목표 설정/수정 API
- 실제 목표 달성률 집계 작업
- 실제 스코어링 배치/집계 작업
- 실제 작가 제출 API
- 실제 MCP 서버
- 실제 GPT Actions 배포
- 실제 자산 업로드 저장소
- 작가 대시보드

## 아직 제외하는 항목

- 결제
- 외부 작가 자유 즉시 공개
- AI 웹툰작가 저작도구 worker production 서비스
- 자동 공개 배포
- 운영자 승인 없는 production 배포 또는 DB migration

## Worker 운영 원칙

AI 웹툰 worker는 `webtoon/episodes/{episode-id}/`만 쓰기 대상으로 사용합니다. `characters/`, `world/`, `skills/`는 기준 문서이므로 읽기 전용으로 취급합니다. 실제 사이트 게시 반영은 사람이 검수한 뒤 `data/catalog.js`와 최종 이미지 자산을 업데이트합니다.

향후 AI 웹툰작가 저작도구는 독자 서비스와 분리된 별도 worker 서비스로 구성합니다. 이 worker는 콘티/컷/이미지 생성과 제출 패키지 생성을 맡고, 본 플랫폼은 인증, 제출 API, 검수, 공개, 독자 데이터 축적을 담당합니다.

## MVP/베타 운영 판단

2차 개발의 초기 운영 구조는 `Vercel 정적 프론트 + Vercel Functions API + Postgres + object storage`를 기준으로 설계합니다. GitHub 정적 사이트나 Git 저장소는 코드와 샘플 자산용으로만 사용하고, 작가 업로드 이미지와 회차 자산은 별도 object storage에 저장합니다.

무료 구간에서는 이미지 전송량, Blob/storage 사용량, DB 크기, API 호출 수, 이벤트 row 수를 월별로 확인합니다. 무료 한도 70%에 접근하거나 외부 작가 모집/상업적 베타를 시작하면 유료 전환 또는 별도 인프라 전환을 검토합니다.
