# 통합로그인 기반 피드백/작가신청 설계 및 실행 계획

Date: 2026-07-09
Scope: `webtoon.wcamper.com`, `auth.wcamper.com`

## 목표

피드백은 `auth.wcamper.com` 통합로그인과 통합회원가입을 완료한 회원만 남길 수 있다. 작가가입은 별도 회원가입으로 만들지 않고, 일반회원 가입 후 웹툰 서비스에서 작가신청을 제출하고 운영 승인 절차를 거쳐 작가 권한을 얻는다. 작가 도메인 정보는 auth 회원 테이블에 섞지 않고 웹툰 서비스의 별도 작가 테이블에서 `userId`로 연결한다.

## 계획표

| 단계 | 승인여부 | 의사결정사항 | 권고안 | 수행 상태 |
|---:|---|---|---|---|
| 1 | 승인됨 | 익명 피드백 폐지 | 피드백 작성은 로그인 회원만 허용 | 반영 |
| 2 | 승인됨 | 회원가입 경계 | 모든 회원가입은 `auth.wcamper.com/signup`에서 처리 | 반영 |
| 3 | 승인됨 | 로그인 경계 | 웹툰은 `auth.wcamper.com/login?service=wcamper-webtoon&returnTo=...` 사용 | 반영 |
| 4 | 승인됨 | 작가가입 폐지 | 일반회원 가입 후 웹툰에서 작가신청 | 반영 |
| 5 | 승인됨 | 작가 데이터 분리 | `Author.userId = auth User.id` 외부 참조 | 설계 반영 |
| 6 | 승인됨 | 물리 FK 여부 | 서비스 DB 분리를 고려해 강한 DB FK 없이 문자열 `userId` 저장 | 설계 반영 |
| 7 | 승인됨 | 피드백 저장 API | API에서 auth session 검증 후 저장 | API 구현 |
| 8 | 승인됨 | 작가 승인 | `AuthorApplication` 승인 후 `Author.status=ACTIVE` | 관리자 API 구현 |
| 9 | 승인됨 | 정적 MVP 한계 | 현 정적 사이트는 작성 UI를 로그인 필수로 잠그고 API 계약을 고정 | 반영 |
| 10 | 승인됨 | 배포 권한 | 커밋/푸시/배포까지 작업자가 수행 가능 | 로컬 구현 진행 |

## 단계별 설계

### 1. 인증 경계

- auth 서비스 ID: `wcamper-webtoon`
- 허용 origin: `https://webtoon.wcamper.com`
- 허용 return URL: `https://webtoon.wcamper.com/*`
- 세션 확인: `GET https://auth.wcamper.com/api/auth/session`
- 비로그인 사용자가 피드백을 시도하면 현재 URL을 `returnTo`로 보존해 auth 로그인 또는 회원가입으로 보낸다.

### 2. 피드백 정책

- 비로그인 사용자는 작품/회차/작가 조회만 가능하다.
- 피드백 작성 UI는 로그인 전에는 textarea를 비활성화한다.
- 피드백 샘플과 카운트는 익명 항목을 노출하지 않는다.
- 백엔드 저장 시점에는 세션 검증을 통과한 `userId`만 저장한다.

### 3. 작가신청 정책

- `작가 로그인`이라는 별도 가입 개념을 제거하고 `작가신청`으로 표현한다.
- 사용자는 먼저 통합회원이 된다.
- 웹툰 서비스에서 작가신청을 제출한다.
- 운영자가 승인하면 작가 레코드를 활성화한다.
- 작가페이지 기능은 `Author.status=ACTIVE`인 회원에게만 제공한다.

### 4. 웹툰 DB 모델

```text
Author
- id
- userId                    auth User.id 문자열 참조
- displayName
- bio
- status                    PENDING | ACTIVE | SUSPENDED | REJECTED
- approvedAt
- createdAt
- updatedAt

AuthorApplication
- id
- userId                    auth User.id 문자열 참조
- authorId nullable
- status                    DRAFT | SUBMITTED | REVIEWING | APPROVED | REJECTED
- portfolioUrl
- introduction
- samplePlan
- reviewedBy
- reviewedAt
- rejectionReason
- createdAt
- updatedAt

Feedback
- id
- userId                    auth User.id 문자열 참조
- targetType                AUTHOR | SERIES | EPISODE
- targetId
- body
- status                    VISIBLE | HIDDEN | DELETED | REPORTED
- createdAt
- updatedAt

Favorite
- id
- userId
- targetType                AUTHOR | SERIES
- targetId
- createdAt

FeedbackReport
- id
- feedbackId
- reporterUserId
- reason
- status                    OPEN | REVIEWED | DISMISSED | ACTIONED
- createdAt
```

### 5. API 계약

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| `GET` | `/api/me` | 선택 | 웹툰 서비스 기준 회원/작가 상태 조회 |
| `POST` | `/api/feedback` | 필수 | 작가/작품/회차 피드백 작성 |
| `GET` | `/api/feedback?targetType=&targetId=` | 선택 | 공개 피드백 목록 조회 |
| `POST` | `/api/author-applications` | 필수 | 작가신청 제출 |
| `GET` | `/api/author-applications/me` | 필수 | 내 작가신청 상태 조회 |
| `POST` | `/api/admin/author-applications/:id/approve` | 운영자 | 작가 승인 및 `Author` 활성화 |
| `GET` | `/api/admin/author-applications` | 운영자 | 작가신청 목록 조회 |
| `GET` | `/api/admin/author-applications/:id` | 운영자 | 작가신청 상세 조회 |
| `POST` | `/api/admin/author-applications/:id/reject` | 운영자 | 작가신청 반려 |
| `GET` | `/api/admin/site-settings` | 운영자 | 사이트관리자 설정 조회 |
| `PATCH` | `/api/admin/site-settings/:key` | 운영자 | 사이트관리자 설정 수정 |
| `GET` | `/api/site-settings/public` | 선택 | 공개 페이지용 허용 설정 조회 |

### 6. 운영 환경변수

| 환경변수 | 용도 |
|---|---|
| `WEBTOON_DATABASE_URL` 또는 `POSTGRES_URL` 또는 `DATABASE_URL` | 웹툰 전용 Postgres 연결 |
| `AUTH_SESSION_URL` | auth 세션 확인 URL. 기본값은 `https://auth.wcamper.com/api/auth/session` |
| `WEBTOON_PUBLIC_ORIGIN` | auth 세션 확인 시 전달할 웹툰 origin |
| `WEBTOON_ADMIN_API_TOKEN` | 작가신청 승인 API Bearer 토큰 |
| `WEBTOON_ADMIN_EMAILS` | 추가 사이트관리자 이메일 allowlist. 쉼표 또는 공백 구분 |
| `WEBTOON_AUTHOR_EMAILS` | 추가 승인 작가 이메일 allowlist. 쉼표 또는 공백 구분 |

auth 운영 설정은 세션 쿠키가 `webtoon.wcamper.com` API 요청에도 전달되도록 `.wcamper.com` 범위로 발급되어야 한다. 쿠키가 `auth.wcamper.com` 전용이면 브라우저의 auth 세션 확인은 가능하지만, webtoon 서버 API가 쿠키를 전달받지 못해 저장 요청을 인증할 수 없다.

관리자 설정과 운영 콘솔은 `docs/SITE_ADMIN_SETTINGS_DESIGN.md`를 기준으로 확장한다. `WEBTOON_ADMIN_API_TOKEN`은 과도기 승인 API 보호용이며, 운영자 UI에는 노출하지 않는다. 초기 운영 관리자 `ilho.ko@dreamlabs.co.kr`는 웹툰 API의 서버 측 이메일 allowlist로 권한을 가진다. 최종 관리자 판정은 auth 세션 기반 관리자 role 확인과 웹툰 API의 서버 측 재검증으로 전환한다.

초기 승인 작가 `ilho.ko@dreamlabs.co.kr`는 웹툰 API의 서버 측 작가 이메일 allowlist로 권한을 가진다. 클라이언트가 제출한 이메일은 신뢰하지 않고, auth 세션에서 검증된 이메일 또는 `webtoonAuthor`/`creator`/`author` role만 작가 권한으로 인정한다. `/api/me`와 `/api/creator/me`는 이 판정을 공유하며, `/creator-studio`는 `Author.status=ACTIVE`에 준하는 응답이 있을 때만 작가 관리 화면을 표시한다.

### 7. 검증 기준

- 비로그인 상태에서 피드백 textarea가 비활성화된다.
- 비로그인 상태에서 피드백 영역에 통합로그인/통합회원가입 CTA가 표시된다.
- 로그인 URL은 `service=wcamper-webtoon`과 현재 페이지 `returnTo`를 포함한다.
- auth 서비스 레지스트리가 `webtoon.wcamper.com` return URL을 허용한다.
- 문서와 정적 카탈로그에서 익명 피드백 작성 정책이 제거된다.
- 빌드, 정적 생성, 문법 검사, auth typecheck/test/lint/build를 통과한다.

## 보완 설계 메모

2차 초기 백엔드는 정적 프론트 유지, Vercel Functions API 추가, 웹툰 전용 Postgres 분리 구조로 구현한다. API는 `auth.wcamper.com/api/auth/session`에 쿠키를 전달해 통합회원 세션을 검증하고, auth DB와 웹툰 DB 사이에는 물리 FK를 두지 않는다. 운영 DB에는 `db/schema.sql`을 명시 적용하며, API 함수가 운영 DB를 자동 마이그레이션하지 않는다.
