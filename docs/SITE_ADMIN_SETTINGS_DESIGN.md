# 사이트관리자 설정 구성 설계

## 목적

`webtoon.wcamper.com`의 사이트관리자 설정은 공개 웹툰 서비스와 작가 운영을 한 곳에서 조정하는 내부 운영 콘솔이다. 일반회원의 마이페이지, 승인 작가의 작가페이지와 분리해 운영자만 접근할 수 있어야 하며, 작가신청 승인, 공개 콘텐츠 상태, 피드백 검수, 사이트 공지와 운영 플래그를 안전하게 관리하는 것을 목표로 한다.

초기 구현은 관리자 UI 전체를 한 번에 만들지 않고, 현재 존재하는 관리자 승인 API와 웹툰 DB 구조를 기준으로 작은 운영 단위부터 붙인다.

## 사용자/권한 경계

| 구분 | 경로 | 권한 | 목적 |
|---|---|---|---|
| 일반회원 | `/mypage` | 통합로그인 회원 | 감상, 관심작, 피드백, 작가신청 상태 확인 |
| 승인 작가 | `/creator-studio` | `Author.status=ACTIVE` | 작품/회차/피드백/협업 현황 확인 |
| 사이트관리자 | `/admin` | 운영자 권한 | 작가신청, 콘텐츠 공개, 피드백 검수, 사이트 설정 관리 |

관리자 권한은 프론트 표시 상태만으로 판단하지 않는다. 모든 관리자 API는 서버에서 별도 관리자 인증을 재검증한다.

초기 관리자 인증 기준:

- 1차: `WEBTOON_ADMIN_API_TOKEN` Bearer 토큰 기반 서버 API 보호
- 2차: auth 세션 기반 `siteAdmin` 또는 `webtoonAdmin` role 확인
- 3차: role별 권한 분리와 감사 로그 저장

`WEBTOON_ADMIN_API_TOKEN`은 과도기 운영용으로만 사용하고, 브라우저에 직접 노출하지 않는다.

## 관리자 메뉴 구조

```text
/admin
├─ 운영 현황
│  ├─ 작가신청 대기
│  ├─ 검수 대기 피드백
│  ├─ 공개/기획중 작품 수
│  └─ 최근 운영 이벤트
├─ 작가신청 관리
│  ├─ 신청 목록
│  ├─ 신청 상세
│  ├─ 승인
│  └─ 반려/보완요청
├─ 웹툰 콘텐츠 관리
│  ├─ 작품 상태
│  ├─ 회차 공개 상태
│  ├─ 썸네일/표지 연결 상태
│  └─ AI 사용 고지/검수 상태
├─ 피드백 관리
│  ├─ 공개 피드백
│  ├─ 신고/숨김 피드백
│  └─ 상태 변경
├─ 사이트 설정
│  ├─ 공지/배너
│  ├─ 모집 상태
│  ├─ 피드백 허용 여부
│  ├─ 교육자료 노출 상태
│  └─ 외부 링크 설정
└─ 운영 로그
   ├─ 관리자 액션
   ├─ 대상 리소스
   └─ 변경 전후 요약
```

## 설정 항목

| 설정 | 키 예시 | 기본값 | 설명 |
|---|---|---|---|
| 작가모집 상태 | `creatorApplications.enabled` | `true` | 작가신청 폼 제출 가능 여부 |
| 피드백 작성 | `feedback.enabled` | `true` | 회원 피드백 작성 가능 여부 |
| 피드백 사전검수 | `feedback.moderationMode` | `post` | `post`, `pre`, `closed` 중 하나 |
| 교육자료 노출 | `creatorTraining.visible` | `true` | `/creators/training` CTA 노출 여부 |
| 메인 공지 | `siteNotice` | 없음 | 홈/마이페이지 상단 운영 공지 |
| 긴급 점검 배너 | `maintenanceBanner` | 없음 | 읽기는 허용하고 작성 기능 제한 안내 |
| 협업문의 상태 | `partnership.enabled` | `true` | 협업문의 CTA 활성 여부 |
| 관리자 알림 수신 | `adminNotification.email` | 없음 | 작가신청/신고 알림 수신 주소 |

초기 정적 사이트에서는 설정값을 빌드 산출물에 고정하지 않고 API에서 조회하는 구조로 둔다. 공개 페이지에서 필요한 일부 설정만 `GET /api/site-settings/public`으로 내려준다.

## 데이터 모델

기존 `authors`, `author_applications`, `feedback`, `favorites`, `feedback_reports`는 유지한다. 관리자 설정과 감사 로그를 위해 다음 테이블을 추가한다.

```sql
create table if not exists site_settings (
  key text primary key,
  value jsonb not null,
  updated_by text not null,
  updated_at timestamptz not null default now()
);

create table if not exists admin_audit_logs (
  id text primary key,
  admin_user_id text,
  action text not null,
  resource_type text not null,
  resource_id text,
  before_value jsonb,
  after_value jsonb,
  request_id text,
  created_at timestamptz not null default now()
);
```

민감정보, 토큰, DB URL, 쿠키 값은 `site_settings`에 저장하지 않는다. 운영 비밀값은 Vercel 환경변수나 별도 secret manager에서 관리한다.

## API 계약

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| `GET` | `/api/admin/summary` | 관리자 | 운영 현황 요약 |
| `GET` | `/api/admin/author-applications` | 관리자 | 작가신청 목록 |
| `GET` | `/api/admin/author-applications/:id` | 관리자 | 작가신청 상세 |
| `POST` | `/api/admin/author-applications/:id/approve` | 관리자 | 작가 승인. 현재 구현됨 |
| `POST` | `/api/admin/author-applications/:id/reject` | 관리자 | 작가신청 반려 |
| `GET` | `/api/admin/feedback` | 관리자 | 피드백 목록/신고 목록 |
| `PATCH` | `/api/admin/feedback/:id` | 관리자 | 피드백 상태 변경 |
| `GET` | `/api/admin/site-settings` | 관리자 | 전체 사이트 설정 조회 |
| `PATCH` | `/api/admin/site-settings/:key` | 관리자 | 설정 단일 항목 수정 |
| `GET` | `/api/site-settings/public` | 선택 | 공개 페이지가 사용할 허용된 설정만 조회 |

관리자 API 응답에는 내부 토큰, 쿠키, 원문 Authorization header, DB 연결 정보, auth provider 내부 식별자를 포함하지 않는다.

## 화면 상태

`/admin`은 다음 상태를 분리한다.

| 상태 | 화면 |
|---|---|
| 관리자 확인 전 | 관리자 권한 확인 중 |
| 비로그인 | 통합로그인 안내 |
| 로그인했지만 관리자 아님 | 접근 권한 없음 |
| 관리자 | 운영 현황과 메뉴 표시 |
| API 오류 | 재시도 가능한 오류 메시지 |

브라우저에서 auth fallback으로 로그인 상태가 확인되더라도 관리자 권한은 확정하지 않는다. 관리자 권한은 반드시 웹툰 API가 검증한 결과로만 확정한다.

## 보안 원칙

- `/admin` 링크는 공개 상단 메뉴에 기본 노출하지 않는다.
- 관리자 API는 CORS와 credential 정책을 공개 API보다 좁게 유지한다.
- 모든 변경 API는 `POST` 또는 `PATCH`로 제한하고 `GET` 요청으로 상태를 변경하지 않는다.
- 관리자 변경은 `admin_audit_logs`에 남긴다.
- 설정 변경은 key 단위 allowlist로 제한한다.
- 설정 값은 JSON schema 수준으로 검증한다.
- 운영 비밀값은 화면, 로그, DB 설정 테이블에 저장하지 않는다.
- 승인/반려/숨김 같은 상태 변경은 멱등성을 고려해 이미 처리된 리소스에 명확한 응답을 반환한다.

## 구현 순서

1. 문서 확정: 관리자 역할, 메뉴, 설정 key, API 계약 확정
2. DB 확장: `site_settings`, `admin_audit_logs` 스키마 추가
3. 관리자 인증 공통 함수: `assertAdmin`을 `_lib/admin-auth.js`로 분리
4. 작가신청 목록/상세/반려 API 추가
5. `/admin` 정적 라우트와 권한 상태 UI 추가
6. 사이트 설정 조회/수정 API 추가
7. 공개 설정 API를 홈, 작가모집, 교육자료 CTA에 연결
8. 피드백 검수 API와 운영 로그 화면 추가

## 2026-07-10 MVP 달성 범위

이번 구현 목표는 운영 DB migration 없이 배포 가능한 사이트관리자 설정 MVP로 한정했다.

달성 항목:

- `/admin` 정적 라우트와 SPA 라우터 메타 추가
- 공개 상단 메뉴에는 `/admin` 미노출 유지
- `api/_lib/admin-auth.js` 공통 관리자 인증 추가
  - `WEBTOON_ADMIN_API_TOKEN` Bearer 토큰
  - auth 세션의 `siteAdmin` 또는 `webtoonAdmin` role
- `api/_lib/site-settings.js` 설정 allowlist, 기본값, 검증 로직 추가
- `GET /api/admin/me` 관리자 권한 확인 API 추가
- `GET /api/admin/site-settings` 관리자 설정 조회 API 추가
- `PATCH /api/admin/site-settings/:key` 관리자 설정 변경 API 추가
- `GET /api/site-settings/public` 공개 페이지용 설정 API 추가
- `db/schema.sql`에 `site_settings`, `admin_audit_logs` 정의 추가
- 기존 작가 승인 API가 공통 관리자 인증과 감사 로그를 사용하도록 보완
- 공개 설정을 프론트에 연결
  - `creatorApplications.enabled`: 작가신청 폼/CTA 제어
  - `feedback.enabled`, `feedback.moderationMode`: 피드백 작성 제어
  - `creatorTraining.visible`: 교육자료 CTA와 직접 진입 화면 제어

보류 항목:

- 운영 DB에 `db/schema.sql` 적용
- auth 서비스의 관리자 role 부여
- 작가신청 목록/상세/반려 화면
- 피드백 검수 목록과 숨김/복구 API
- 운영 로그 목록 화면

운영 DB에 테이블이 없거나 DB 환경변수가 없으면 공개 설정 API는 기본값으로 응답한다. 관리자 설정 저장은 `SETTINGS_STORE_NOT_READY`로 실패하며, 이는 migration 전 정상적인 준비 상태다.

## MVP 포함/제외

MVP 포함:

- `/admin` 진입 화면
- 관리자 권한 확인 상태
- 작가신청 목록/상세/승인/반려
- 사이트 설정 조회
- 작가모집/피드백/교육자료 노출 플래그
- 관리자 액션 감사 로그 저장

MVP 제외:

- 결제/정산 관리
- auth 서비스의 회원 role 직접 수정
- 대량 메일 발송
- 자동 DB migration
- 운영 비밀값 화면 관리
- 외부 작가 자유 공개

## 운영 판단

사이트관리자 설정은 공개 서비스 운영에 직접 영향을 준다. 따라서 DB migration, production 환경변수 변경, 관리자 role 부여, production 배포는 명시 승인 후 진행한다. 문서와 프론트 라우트 추가는 코드 변경으로 처리할 수 있지만, 실제 관리자 권한 부여와 운영 DB 적용은 별도 운영 작업으로 분리한다.
