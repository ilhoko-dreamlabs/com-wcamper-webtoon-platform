# 웹툰 플랫폼 완전 전환 계획 v0.1

Date: 2026-07-13
Status: Draft v0.1
Scope: `webtoon.wcamper.com`, 작가 스튜디오, 공개 웹툰, 관리자, API, DB, 자산 저장소, 문서 체계

## 0. 결론

WCAMPER Webtoon은 더 이상 "정적 웹툰 게시 MVP"로 보면 안 된다. 앞으로의 목표 형태는 다음의 양면 플랫폼이다.

```text
작가 / 공급자
  - 작품 기획
  - 회차 제작
  - 이미지/자산 제출
  - 검수 요청
  - 독자 피드백 확인
  - 협업/PPL 대응

플랫폼 / 운영자
  - 작가 승인
  - 콘텐츠 검수
  - 공개 승인
  - 공개 산출물 생성
  - 품질/권리/정책 관리
  - 집계/스코어링 관리

웹툰 구독자 / 수요자
  - 공개 웹툰 읽기
  - 관심/구독
  - 인증 피드백
  - 완독/재방문/선호 신호 제공
```

현재 혼돈은 MVP의 정적 공개 구조 위에 운영 기능을 계속 붙이면서 생긴다. 따라서 전환의 핵심은 기능 추가가 아니라 경계 재정의다.

- 작가/API/DB는 운영 데이터의 source of truth가 된다.
- 공개 웹툰 페이지는 DB를 매 요청 조회하지 않고, `PUBLISHED` 데이터에서 생성한 정적 snapshot을 제공한다.
- `data/catalog.js`는 장기 원천이 아니라 "현재 공개 상태의 마이그레이션 입력" 또는 "생성된 공개 산출물"로 격하한다.
- 문서는 기능별 산발 문서에서 계층형 설계 체계로 재구성한다.
- 성능 향상은 API 호출 수 절감만이 아니라 공개/운영 read model 분리, 이미지 CDN화, 이벤트 집계화로 접근한다.

## 1. 현재 문서 확인 결과

확인한 로컬 문서:

| 문서 | 현재 역할 | 전환 후 위치 |
|---|---|---|
| `README.md` | 현재 개발 단계, 운영 설정, MVP/2차 범위 | 프로젝트 현황 인덱스 |
| `docs/DESIGN.md` | 제품 큰 방향, 독자/작가/피드백/스코어링 원형 | 제품 비전과 도메인 기준 |
| `docs/AUTH_FEEDBACK_AUTHOR_PLAN.md` | 통합로그인, 피드백, 작가신청 정책 | 인증/작가신청/피드백 하위 설계 |
| `docs/NAVIGATION_PAGE_DESIGN.md` | 공개 페이지와 메뉴 구조 | IA/라우팅 하위 설계 |
| `docs/MYPAGE_AUTH_STATUS_DESIGN.md` | 마이페이지 로그인 상태 | 수요자 계정 하위 설계 |
| `docs/CREATOR_STUDIO_DETAIL_DESIGN.md` | 작가 스튜디오 기능과 데이터 모델 | 공급자 workspace 하위 설계 |
| `docs/CREATOR_STUDIO_PERFORMANCE_PLAN.md` | 작가 API 병목과 workspace API | 작가 API 성능 하위 설계 |
| `docs/SITE_ADMIN_SETTINGS_DESIGN.md` | 관리자 콘솔, 설정, 감사 로그 | 운영자/admin 하위 설계 |
| `docs/CREATOR_TRAINING_PAGE_DESIGN.md` | 작가모집 교육자료 | 공급자 onboarding 하위 설계 |
| `docs/OG_PREVIEW_DESIGN.md` | 정적 OG/SEO 생성 | 공개 snapshot 산출물 하위 설계 |
| `docs/OPERABLE_PLATFORM_REDESIGN_PLAN.md` | 운영 가능한 구조 재설계 초안 | 본 문서의 입력 문서 |
| `webtoon/WORKER_POLICY.md` 및 `webtoon/**` | AI 웹툰 worker 제작 정책 | 제작 worker/제출 패키지 하위 기준 |

확인한 DreamLabs registry 문서:

- `/workspace/dreamlabs-skill-registry/README.md`
- `/workspace/dreamlabs-skill-registry/REGISTRY.md`
- `/workspace/dreamlabs-skill-registry/docs/WORKER_USAGE_GUIDE.md`
- `/workspace/dreamlabs-skill-registry/skills/general/atomic/repo-inspection/SKILL.md`
- `/workspace/dreamlabs-skill-registry/skills/dreamlabs-specific/atomic/dreamlabs-handoff-report-writer/SKILL.md`

registry 기준상 production deployment, remote push, DB migration, 외부 상태 변경은 별도 명시 승인 없이 수행하지 않는다.

## 2. 큰 방향성

### 2.1 플랫폼 정체성

전환 후 플랫폼은 단순 연재 사이트가 아니라 "AI 웹툰 공급자와 웹툰 수요자를 연결하고, 운영자가 품질과 공개 흐름을 통제하는 콘텐츠 마켓형 운영 플랫폼"이다.

```text
Supply Side
  작가, 내부 제작자, 브랜드 협업 제작자, AI 제작 worker

Platform Core
  인증, 권한, 작품/회차/자산, 검수, 공개, 피드백, 집계, 스코어링

Demand Side
  독자, 구독자, 피드백 참여자, 브랜드/협업 문의자
```

### 2.2 핵심 원칙

1. 운영 원천은 DB/API다.
2. 공개 페이지는 정적 snapshot과 CDN 자산으로 빠르게 제공한다.
3. 공급자 화면과 수요자 화면은 같은 데이터를 보되, 다른 read model을 사용한다.
4. 제작 상태와 공개 상태를 분리한다.
5. 이미지 바이너리와 메타데이터를 분리한다.
6. 고빈도 독자 이벤트는 원본 장기 보관보다 집계 우선으로 설계한다.
7. 관리자 승인 없는 작가 직접 공개는 초기 범위에서 제외한다.
8. AI 제작 worker는 독자 서비스와 분리하고 제출 API로 연결한다.

## 3. 설계문서 구조

목표는 맥락 오염을 줄이는 것이다. 지금처럼 기능별 문서가 모두 동등한 위치에 있으면 새 세션에서 어떤 문서가 상위 결정인지 판단하기 어렵다. 따라서 문서는 "상위 결정 -> 도메인 설계 -> 기능 상세 -> 운영 runbook -> evidence" 순서로 재배치한다.

### 3.1 권장 문서 트리

```text
docs/
  00-index.md
  01-platform/
    vision.md
    transition-plan-v0.1.md
    architecture.md
    decision-records.md
  02-domains/
    auth-and-identity.md
    creator-supply.md
    reader-demand.md
    admin-operations.md
    public-publication.md
    assets.md
    feedback-events-scoring.md
  03-apis/
    creator-api.md
    admin-api.md
    public-snapshot-api.md
    feedback-api.md
    submission-api.md
  04-data/
    schema.md
    migrations.md
    static-catalog-import.md
    published-snapshot.md
  05-frontend/
    information-architecture.md
    creator-studio.md
    reader-pages.md
    mypage.md
    admin-console.md
  06-operations/
    deployment-readiness.md
    smoke-tests.md
    rollback.md
    observability.md
  07-archive/
    mvp-static-design.md
```

### 3.2 문서별 책임

| 계층 | 역할 | 금지할 것 |
|---|---|---|
| `01-platform` | 변경되지 않는 방향, 경계, source of truth, 단계 계획 | 화면 세부 구현 |
| `02-domains` | 도메인 용어, 상태, 권한, 정책 | 특정 파일명 중심 구현 |
| `03-apis` | 요청/응답, 인증, 에러, idempotency | UI 설명 |
| `04-data` | DB 스키마, migration, snapshot, 검증 | 제품 카피 |
| `05-frontend` | 화면 흐름, 상태, 컴포넌트 책임 | DB migration 결정 |
| `06-operations` | 배포, 검증, rollback, 운영 승인 | 기능 요구사항 확장 |
| `07-archive` | 과거 MVP 결정과 폐기 배경 | 현재 기준처럼 참조 |

### 3.3 기존 문서 처리

바로 문서를 대량 이동하지 않는다. 다음 세션의 1차 작업은 새 인덱스를 만들고 기존 문서를 링크로 묶는 것이다.

1. `docs/00-index.md`를 만든다.
2. 본 문서를 `docs/01-platform/transition-plan-v0.1.md`로 승격한다.
3. 기존 문서는 원위치에 두되 `00-index.md`에서 "현재 기준", "하위 기준", "archive 후보"로 분류한다.
4. 구현이 안정된 뒤 기능별 문서를 새 구조로 이동한다.
5. 이동 시에는 파일 내용 변경과 경로 변경을 같은 commit에 섞지 않는다.

## 4. 시스템 구성

성능 향상을 위한 핵심은 "모든 화면이 같은 API를 실시간으로 두드리는 구조"를 피하는 것이다. 공급자, 운영자, 수요자의 읽기 패턴이 다르므로 write model과 read model을 분리한다.

### 4.1 목표 아키텍처

```text
auth.wcamper.com
  |
  v
Webtoon API
  - auth adapter
  - creator workspace
  - admin review
  - feedback/events
  - asset metadata
  - snapshot builder trigger
  |
  v
Postgres write model
  - authors
  - author_applications
  - webtoon_series
  - webtoon_episodes
  - episode_images / asset_objects
  - publication_reviews
  - feedback
  - event aggregates
  - admin_audit_logs
  |
  +--> Object Storage
  |      - originals
  |      - optimized panels
  |      - thumbnails
  |
  +--> Published Snapshot Builder
         - public catalog
         - static route metadata
         - generated static pages
         - integrity report
         |
         v
       CDN / Static Public Site
         - /webtoons
         - /@author
         - /works
         - /episodes
         - static images
```

### 4.2 Read model 분리

| 화면/기능 | 데이터 방식 | 이유 |
|---|---|---|
| 공개 홈/웹툰/회차 | published snapshot + static HTML + CDN 이미지 | 독자 성능, SEO, DB 장애 격리 |
| 작가 스튜디오 | `/api/creator/workspace` 중심 DB 조회 | 권한/소유권/초안/검수 상태 필요 |
| 관리자 콘솔 | admin API DB 조회 | 검수, 상태 변경, 감사 로그 필요 |
| 마이페이지 | `/api/me` + 독자 활동 API | 개인정보와 인증 상태 필요 |
| 피드백 작성 | API write | 인증 회원만 허용 |
| 조회/완독 이벤트 | light event API + aggregate table | 고빈도 트래픽 비용 제어 |

### 4.3 API 모듈 경계

현재 `api/creator.js`와 `api/_lib/creator-content.js`에 많은 책임이 집중되어 있다. 전환 후 경계는 다음과 같다.

```text
api/_lib/
  auth-adapter.js
  author-access.js
  creator-repository.js
  admin-review-service.js
  asset-service.js
  publication-service.js
  public-snapshot-service.js
  event-aggregate-service.js
  audit-log-service.js
```

Vercel Functions 엔트리포인트는 얇게 유지한다.

```text
api/creator/workspace.js
api/creator/series.js
api/creator/episodes/[id].js
api/admin/reviews.js
api/admin/publications/[id].js
api/public/snapshot.js
api/events.js
```

초기에는 파일 라우팅 제약 때문에 완전한 디렉터리 분리가 어렵다면, 내부 service/repository 분리부터 시작한다.

### 4.4 데이터 모델 방향

기존 테이블은 유지하되, 상태와 자산을 보강한다.

핵심 테이블:

```text
authors
author_applications
webtoon_series
webtoon_episodes
episode_images
asset_objects
publication_reviews
publication_snapshots
feedback
feedback_reports
reader_activity_aggregates
creator_dashboard_counts
site_settings
admin_audit_logs
```

상태 분리 권장:

```text
draft_status:
  DRAFT
  SUBMITTED
  CHANGES_REQUESTED
  APPROVED

publication_status:
  PRIVATE
  SCHEDULED
  PUBLISHED
  PAUSED
  ARCHIVED
```

기존 단일 `status`는 단기 호환 필드로 유지하되, 새 설계에서는 제작 상태와 공개 상태를 분리한다.

### 4.5 자산 저장

단기:

- 현재 repo static path를 DB의 `episode_images.image_url`로 마이그레이션한다.
- 공개 페이지는 기존 정적 이미지 경로를 계속 사용한다.
- image path integrity check를 build 전 검증한다.

중기:

- 원본은 object storage에 저장한다.
- 공개 최적화본은 CDN/cache 가능한 URL로 저장한다.
- DB에는 `original_url`, `public_url`, `width`, `height`, `mime_type`, `file_size`, `checksum`, `owner_author_id`, `episode_id`를 둔다.

장기:

- 업로드 URL 발급, 리사이징, 썸네일 생성, 권리/AI 고지 메타 자동화를 도입한다.
- 공개 snapshot은 public URL만 포함한다.

### 4.6 성능 기준

| 영역 | v0.1 목표 |
|---|---|
| 공개 웹툰 | 런타임 DB 의존 없음 |
| 공개 회차 이미지 | static/CDN path 직접 로딩 |
| 작가 첫 화면 | `/api/me` 1회 + `/api/creator/workspace` 1회 |
| 작품/회차 상세 | 필요한 범위만 workspace query |
| 관리자 콘솔 | 목록 pagination, 상태별 index |
| 이벤트 | 원본 무한 적재 금지, 집계 우선 |
| 빌드 | catalog/snapshot/image integrity check 통과 후 static generation |

## 5. 전환 로드맵

### Phase 0. 기준선 고정

목표: 현재 운영 상태를 손상 없이 스냅샷으로 남긴다.

- 현재 `data/catalog.js` 작품/회차/이미지 수 리포트 생성
- 공개 이미지 파일 존재 여부 검증
- 현재 API, DB schema, route, build command 목록화
- 기존 문서 인덱스 생성
- 기존 공개 URL smoke test 목록 작성

산출물:

- `docs/00-index.md`
- `reports/static-catalog-baseline.json`
- `scripts/validate-static-assets.js`

### Phase 1. 문서 체계 정리

목표: 새 세션에서 맥락 오염 없이 시작할 수 있는 설계 참조 구조를 만든다.

- 본 문서를 platform transition 기준으로 채택
- 기존 문서별 책임 분류
- archive 후보와 current 기준 구분
- API/data/frontend/operations 문서 skeleton 생성
- 의사결정 기록 파일 생성

산출물:

- `docs/01-platform/transition-plan-v0.1.md`
- `docs/01-platform/architecture.md`
- `docs/01-platform/decision-records.md`

### Phase 2. 운영 데이터 모델 확정

목표: 작가-공급자 데이터 저장공간을 정식 모델로 확정한다.

- `authors`, `webtoon_series`, `webtoon_episodes`, `episode_images` 현행 스키마 검토
- `draft_status`와 `publication_status` 분리 결정
- `asset_objects`, `publication_reviews`, `publication_snapshots` 도입 결정
- migration은 문서와 SQL 초안까지만 작성하고 운영 DB 적용은 별도 승인으로 분리

산출물:

- `docs/04-data/schema.md`
- `docs/04-data/migrations.md`
- `db/migrations/*` 초안

### Phase 3. 현재 공개 데이터 마이그레이션 설계 및 스크립트

목표: 현재 웹툰 페이지의 데이터를 작가별 저장공간으로 재현 가능하게 이관한다.

- `data/catalog.js`를 읽어 author/series/episode/image로 변환
- `panels`를 `episode_images`로 변환
- 공개/기획 상태를 새 상태 모델로 매핑
- idempotent upsert 설계
- import 전후 개수 비교

산출물:

- `scripts/import-static-catalog-to-db.js`
- `scripts/validate-content-integrity.js`
- `docs/04-data/static-catalog-import.md`

### Phase 4. API 구조 분리

목표: 기능 혼합을 줄이고 성능 최적화가 가능한 구조로 만든다.

- auth adapter 분리
- author access/ownership helper 분리
- creator workspace service 분리
- asset metadata service 분리
- publication service 분리
- admin review service 분리
- 기존 API route는 호환 wrapper로 유지

산출물:

- `api/_lib/*-service.js`
- `api/_lib/*-repository.js`
- `docs/03-apis/creator-api.md`
- `docs/03-apis/admin-api.md`

### Phase 5. Published snapshot 생성

목표: DB의 `PUBLISHED` 데이터를 공개 페이지 산출물로 변환한다.

- DB -> public catalog 변환
- `data/catalog.js` 또는 `public/data/catalog.js` 생성
- static route metadata 생성
- `scripts/generate-static-pages.js`와 연결
- 기존 공개 catalog와 새 generated catalog 비교

산출물:

- `scripts/generate-public-catalog.js`
- `docs/04-data/published-snapshot.md`
- `reports/public-snapshot-diff.json`

### Phase 6. 공개/작가/관리자 화면 전환

목표: 각 화면이 자기 read model만 보게 한다.

- 공개 웹툰은 generated snapshot만 사용
- 작가 스튜디오는 DB workspace API만 사용
- 관리자 콘솔은 검수/publication API 사용
- 마이페이지는 `/api/me`와 독자 활동 API로 분리

검증:

- 공개 목록/작품/회차 표시 일치
- 작가페이지의 작품/회차/이미지 수 일치
- 관리자 승인 전 공개 미노출
- 승인 후 snapshot 생성 시 공개 노출

### Phase 7. 성능/운영 검증

목표: 운영 가능한 베타 기준을 통과한다.

- build + static generation
- asset integrity
- API syntax check
- 작가 권한 smoke test
- 관리자 권한 smoke test
- 공개 URL smoke test
- 이벤트/피드백 저장 smoke test
- rollback 문서 작성

## 6. 새 세션 시작 기준

새 세션은 바로 기능 구현이나 배포로 시작하지 않는다. 시작 순서는 다음이 맞다.

1. `docs/PLATFORM_TRANSITION_PLAN_V0_1.md`를 기준 문서로 읽는다.
2. `docs/OPERABLE_PLATFORM_REDESIGN_PLAN.md`를 보조 입력으로 읽는다.
3. `README.md`, `docs/DESIGN.md`, `docs/CREATOR_STUDIO_DETAIL_DESIGN.md`, `docs/SITE_ADMIN_SETTINGS_DESIGN.md`, `docs/CREATOR_STUDIO_PERFORMANCE_PLAN.md`를 현재 구현 맥락으로 확인한다.
4. `docs/00-index.md`부터 만든다.
5. 현재 catalog baseline report를 만든다.
6. migration/import/generation/validation script를 만든다.
7. production DB migration, push, deploy는 별도 승인 전 수행하지 않는다.

## 7. 의사결정 필요 항목

| 항목 | v0.1 권고 |
|---|---|
| 최종 source of truth | Webtoon DB/API |
| 공개 페이지 데이터 | DB `PUBLISHED` 기반 generated snapshot |
| 기존 `data/catalog.js` | 마이그레이션 입력 및 생성 산출물 |
| 작가 역할 | 공급자, 단 직접 공개 권한 없음 |
| 독자 역할 | 수요자, 인증 피드백/구독/완독 신호 제공 |
| 운영자 역할 | 승인, 검수, 공개, 중지, 정책 관리 |
| 이미지 저장 | 단기 static path, 중기 object storage + CDN |
| 이벤트 저장 | 고빈도 원본 장기 저장보다 집계 우선 |
| AI worker | 독자 서비스와 분리, 제출 API로 연결 |
| DB migration | 문서/SQL 초안 후 별도 승인 |
| 배포 | snapshot 검증 후 별도 승인 |

## 8. v0.1에서 하지 않는 것

- 운영 DB에 migration 직접 적용
- production 환경변수 변경
- production deploy
- 결제/정산 설계 확정
- 외부 작가 즉시 공개
- AI 이미지 생성 worker production 서비스화
- 기존 문서 대량 이동
- 기존 공개 웹툰 URL 구조 변경

## 9. 성공 기준

전환 계획 v0.1은 다음을 만족하면 성공이다.

- 새 세션이 이 문서만 읽어도 전체 방향을 이해할 수 있다.
- 기존 문서가 어떤 역할인지 분류되어 있다.
- 공개/작가/관리자/마이페이지의 데이터 원천이 구분되어 있다.
- 정적 공개 성능과 DB 운영 원천이 충돌하지 않는다.
- 마이그레이션과 snapshot 생성이 양방향으로 검증 가능하다.
- production 영향 작업이 명시 승인 없이 섞이지 않는다.

