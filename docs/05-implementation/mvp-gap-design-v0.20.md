# MVP Gap Design v0.20

## Scope

이 문서는 `DESIGN.md`, `AUTH_FEEDBACK_AUTHOR_PLAN.md`, `SITE_ADMIN_SETTINGS_DESIGN.md`, `OPERABLE_PLATFORM_REDESIGN_PLAN.md`의 미구현 항목을 MVP 구현 기준으로 보완한다.

## Admin Operations

`/admin`은 다음 운영 작업의 기준 화면이다.

| 기능 | API | 상태 |
|---|---|---|
| 관리자 권한 확인 | `GET /api/admin/me` | 기존 |
| 작가신청 목록 | `GET /api/admin/author-applications` | 신규 |
| 작가신청 상세 | `GET /api/admin/author-applications/:id` | 신규 |
| 작가신청 승인 | `POST /api/admin/author-applications/:id/approve` | 보완 |
| 작가신청 반려 | `POST /api/admin/author-applications/:id/reject` | 신규 |
| 피드백 목록 | `GET /api/admin/feedback` | 신규 |
| 피드백 검수 | `PATCH /api/admin/feedback/:id` | 신규 |
| 콘텐츠 검수 목록 | `GET /api/admin/publication-reviews` | 신규 |
| 콘텐츠 검수 액션 | `PATCH /api/admin/publication-reviews/:id` | 신규 |
| 사이트 설정 | `GET /api/admin/site-settings`, `PATCH /api/admin/site-settings/:key` | 기존 |

모든 관리자 변경 액션은 `admin_audit_logs`에 기록한다.

## Creator Publication Flow

작가 회차 검수 요청은 다음 순서로 처리한다.

| 단계 | 상태 | 주체 |
|---|---|---|
| 초안 | `DRAFT` | 작가 |
| 검수 요청 | `REVIEW_REQUESTED`, `publication_reviews.REQUESTED` | 작가 |
| 승인 | `APPROVED` | 관리자 |
| 보완 요청 | `REVISION_REQUESTED` | 관리자 |
| 공개 | `PUBLISHED` | 관리자 |

공개 catalog runtime은 당분간 `/data/catalog.generated.js`를 유지한다. DB source 전환은 `publication_snapshots`와 import/export diff 검증 후 별도 릴리스로 진행한다.

## Feedback Moderation

피드백은 기본적으로 작성 즉시 `VISIBLE`이다. 신고되면 `REPORTED`로 전환하고 관리자 콘솔에서 다음 액션을 수행한다.

| 액션 | 결과 |
|---|---|
| 복구 | `VISIBLE`, open report는 `DISMISSED` |
| 숨김 | `HIDDEN`, open report는 `ACTIONED` |
| 삭제 | `DELETED`, open report는 `ACTIONED` |

## Reader Activity

독자 이벤트는 `reader_events`에 원문 이벤트를 저장하고 `reader_activity_daily`에 일별 집계를 누적한다.

| 이벤트 | 의미 |
|---|---|
| `VIEW` | 회차 페이지 조회 |
| `READ_START` | 일정 시간 체류 후 읽기 시작 추정 |
| `READ_COMPLETE` | time-on-page 기반 완독 추정 |
| `RETURN_VISIT` | 재방문 추정, 후속 구현 |

민감정보 최소화를 위해 클라이언트 익명 ID와 로그인 사용자 ID만 저장하며 IP/UA 원문 저장은 하지 않는다.

## Asset Objects

`asset_objects`는 object storage signed upload 전환을 위한 중간 모델이다. 현재 MVP에서는 작가가 이미 접근 가능한 public URL을 등록하고, 후속으로 signed upload URL 발급을 붙인다.

## Superseded Notes

문서상 "설계 화면"으로만 남아 있던 관리자 콘솔/피드백/작가신청 설명은 이 문서의 API와 상태 모델을 우선한다. 기존 static/generated catalog 운영 문서는 폐기하지 않고, DB source 전환 전까지 runtime 기준으로 유지한다.
