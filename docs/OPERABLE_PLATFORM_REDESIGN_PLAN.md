# 운영 가능한 웹툰 플랫폼 재설계 문서

Date: 2026-07-12
Scope: `webtoon.wcamper.com`, 작가 스튜디오, 공개 웹툰, API, DB, 자산 저장소, 배포 산출물

## 결론

현재 혼돈의 핵심 원인은 MVP로 빠르게 만든 정적 공개 웹툰 구조 위에 운영 기능을 증축하고 있기 때문이다. 정적 카탈로그, 작가 API, 작가페이지, 공개 페이지, 이미지 자산 경로가 각각 다른 기준을 갖기 시작하면서 데이터 소유권과 공개 흐름이 불명확해졌다.

따라서 다음 세션에서는 기존 코드에 기능을 더 얹는 방식이 아니라, 현재까지의 시행착오를 기준으로 운영 가능한 구조를 먼저 정의한 뒤 새 기준으로 재구성한다.

핵심 방향은 다음이다.

- 작가/API/DB를 운영 데이터의 source of truth로 둔다.
- 공개 웹툰 페이지는 런타임 DB 의존을 최소화하고 published snapshot 기반 정적 산출물로 제공한다.
- MVP의 `data/catalog.js`는 장기 source of truth가 아니라 공개 산출물 또는 마이그레이션 입력으로 취급한다.
- 이미지 파일은 공개 성능을 위해 정적/CDN 경로로 서비스하되, 그 경로와 소유권 메타데이터는 DB가 관리한다.
- 작가 스튜디오는 정적 카탈로그를 따라가는 화면이 아니라 작품 제작, 검수, 공개, 피드백 운영의 기준 시스템이 되어야 한다.

## 문제 인식

### 현재 발생한 구조적 문제

- 공개 웹툰 페이지는 `data/catalog.js`와 정적 이미지 경로를 기준으로 동작한다.
- 작가 스튜디오는 `api/_lib/creator-content.js`, DB 테이블, 런타임 seed/upsert 로직을 기준으로 동작한다.
- 같은 작품, 회차, 이미지 정보가 정적 카탈로그와 API 내부 seed에 중복된다.
- 공개 페이지의 `panels`와 작가 API의 `episode_images`가 같은 정보를 다른 모델로 표현한다.
- MVP에서는 빠른 공개가 목적이었기 때문에 수동 정적 반영이 합리적이었지만, 운영 베타에서는 작가 권한, 검수, 공개 상태, 피드백, 자산 교체, 예약 공개가 필요하다.

### 근본 원인

MVP 구조는 "이미 배포할 콘텐츠를 정적으로 보여주는 것"에 최적화되어 있었다. 운영 구조는 "콘텐츠가 생성, 수정, 검수, 승인, 공개, 중지, 회수되는 흐름"을 관리해야 한다. 두 구조의 목표가 다르기 때문에 단순 증축만으로는 일관성을 유지하기 어렵다.

## 목표 구조

```text
Auth Platform
    |
    v
Webtoon API / DB
    |
    +-- Author Workspace
    |     - 작가 프로필
    |     - 작품
    |     - 회차
    |     - 이미지 자산
    |     - 검수 요청
    |     - 피드백 확인
    |
    +-- Admin Workflow
    |     - 작가 승인
    |     - 작품/회차 검수
    |     - 공개 승인
    |     - 중지/회수
    |
    v
Published Snapshot Build
    |
    +-- data/catalog.js
    +-- static pages
    +-- static image references
    |
    v
Public Webtoon Site
```

공개 사이트는 계속 빠르게 유지한다. 다만 공개 사이트가 원천 데이터를 직접 소유하지 않는다. 운영 DB의 `PUBLISHED` 상태 데이터를 기준으로 정적 공개 산출물을 생성한다.

## 단기 계획

### 1. API 기능 분리와 구조 최적화

현재의 `/api/creator` 단일 함수 중심 구조를 역할별로 분리한다.

권장 경계:

| 영역 | 책임 |
|---|---|
| Auth adapter | `auth.wcamper.com` 세션 검증, user identity 정규화 |
| Author access | 작가 권한, 소유권, 상태 판정 |
| Creator workspace API | 작가용 작품/회차/이미지 CRUD |
| Admin review API | 검수, 승인, 반려, 공개 중지 |
| Public read model | 공개 페이지용 published 데이터 조회 또는 snapshot 생성 |
| Asset service | 이미지 업로드, 정적 경로, 메타데이터 관리 |
| Migration scripts | 기존 정적 카탈로그를 DB 운영 모델로 가져오기 |

성능 최적화는 이 분리 이후에 적용한다. 먼저 책임 경계를 맞추고, 이후 조회 단위 통합, 캐시, snapshot 생성, 이미지 전송 최적화를 진행한다.

### 2. 현재 공개 웹툰 데이터 마이그레이션

현재 운영 중인 공개 웹툰 페이지는 실제 사용자에게 노출된 기준이므로 단기 마이그레이션의 입력으로 사용한다.

마이그레이션 대상:

- 작가
- 작품
- 회차
- 회차 이미지 목록
- 표지/썸네일
- 공개 상태
- 공개 URL
- 기존 정적 이미지 경로

원칙:

- 마이그레이션은 수동 복사가 아니라 재실행 가능한 스크립트로 만든다.
- 기존 공개 페이지와 DB import 결과의 작품/회차/이미지 개수를 검증한다.
- 정적 이미지 파일 존재 여부를 검증한다.
- 같은 데이터를 여러 번 import해도 중복 생성되지 않도록 idempotent upsert로 만든다.
- 마이그레이션 이후에는 DB/API 쪽을 운영 원천으로 전환한다.

## 장기 목표

### Source of Truth

| 데이터 | 장기 원천 |
|---|---|
| 작가 권한 | Auth session + Webtoon `authors` |
| 작가 프로필 | Webtoon DB |
| 작품 | Webtoon DB |
| 회차 | Webtoon DB |
| 회차 이미지 메타 | Webtoon DB |
| 이미지 바이너리 | Object storage 또는 static asset store |
| 공개 카탈로그 | DB의 `PUBLISHED` 데이터에서 생성된 산출물 |
| 공개 HTML | published snapshot에서 생성된 산출물 |

### 공개 페이지 전략

공개 페이지는 운영 DB를 매 요청마다 조회하지 않는다. published snapshot을 생성해 정적 페이지와 정적 이미지 경로를 제공한다.

이 방식은 다음 장점을 가진다.

- 독자 페이지 성능 유지
- CDN/cache 친화성 유지
- SEO 정적 HTML 유지
- DB 장애 시 공개 페이지 영향 최소화
- 운영 데이터와 공개 산출물의 경계 명확화

## 데이터 모델 방향

기존 `authors`, `webtoon_series`, `webtoon_episodes`, `episode_images` 모델은 기본 방향이 맞다. 다만 운영 가능한 구조를 위해 상태와 산출물 경계를 더 명확히 해야 한다.

### 권장 핵심 엔티티

```text
authors
webtoon_series
webtoon_episodes
episode_images
publication_reviews
publication_snapshots
asset_objects
feedback
creator_dashboard_counts
admin_audit_logs
```

### 상태 모델

작품과 회차 상태는 제작 상태와 공개 상태를 섞지 않는 방향을 검토한다.

예시:

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

현재처럼 하나의 `status`에 제작/검수/공개 상태를 모두 넣으면 UI와 공개 산출물 생성 조건이 복잡해진다. 단기에는 기존 status를 유지하더라도, 새 설계에서는 분리 상태를 기준으로 잡는다.

## 자산 저장 방향

이미지는 공개 성능과 운영 편의가 모두 필요하다.

권장 방향:

- 원본 업로드: object storage
- 공개 최적화본: static/CDN 경로
- DB 메타: 원본 URL, 공개 URL, width, height, mime type, file size, checksum, owner, episode id
- 공개 페이지: 공개 URL만 사용
- 작가페이지: 원본/공개 URL과 검수 상태를 함께 표시

초기에는 현재 repo의 정적 파일 경로를 그대로 `episode_images.image_url`에 이관한다. 이후 업로드 저장소가 준비되면 신규 자산부터 object storage로 저장한다.

## API 설계 방향

### 작가 API

작가 API는 작가 업무 화면에 최적화한다.

```text
GET    /api/creator/workspace
POST   /api/creator/series
PATCH  /api/creator/series/:seriesId
POST   /api/creator/series/:seriesId/episodes
PATCH  /api/creator/episodes/:episodeId
POST   /api/creator/episodes/:episodeId/images
PATCH  /api/creator/episodes/:episodeId/images/:imageId
DELETE /api/creator/episodes/:episodeId/images/:imageId
POST   /api/creator/episodes/:episodeId/submit-review
```

### 관리자 API

관리자 API는 검수와 공개 승인에 집중한다.

```text
GET  /api/admin/reviews
POST /api/admin/episodes/:episodeId/approve
POST /api/admin/episodes/:episodeId/request-changes
POST /api/admin/episodes/:episodeId/publish
POST /api/admin/episodes/:episodeId/unpublish
```

### 공개 산출물 생성

```text
node scripts/import-static-catalog-to-db.js
node scripts/validate-content-integrity.js
node scripts/generate-public-catalog.js
node scripts/generate-static-pages.js
```

`generate-public-catalog`는 DB의 published read model에서 `data/catalog.js`를 생성한다. 기존 `generate-static-pages.js`는 생성된 catalog를 입력으로 사용한다.

## 마이그레이션 계획

### Phase 0. 현황 고정

- 현재 공개 페이지와 `data/catalog.js`를 운영 스냅샷으로 보존한다.
- 작품/회차/이미지 수를 리포트로 남긴다.
- 기존 static 이미지 경로의 파일 존재 여부를 확인한다.

### Phase 1. DB 운영 모델 정리

- 기존 테이블을 기준으로 부족한 컬럼을 정의한다.
- 제작 상태와 공개 상태 분리 여부를 결정한다.
- `asset_objects`, `publication_snapshots` 도입 여부를 결정한다.

### Phase 2. 정적 카탈로그 import

- `data/catalog.js`를 읽어 작가별 저장공간에 upsert한다.
- `panels`를 `episode_images`로 변환한다.
- 공개 작품은 `publication_status=PUBLISHED`로 가져온다.
- 기획중 작품은 `PRIVATE` 또는 `DRAFT`로 가져온다.

### Phase 3. 공개 산출물 생성

- DB의 published 데이터에서 `data/catalog.js`를 생성한다.
- 생성된 catalog와 기존 catalog의 공개 결과를 비교한다.
- 정적 HTML을 생성한다.

### Phase 4. 작가 스튜디오 전환

- 작가 스튜디오는 DB 기준 데이터만 본다.
- 기존 초기 카탈로그 seed/upsert 로직은 제거한다.
- 작가별 작품/회차/이미지 관리 흐름을 정리한다.

### Phase 5. 운영 검증

- 빌드 검증
- 이미지 경로 검증
- 공개 URL smoke test
- 작가 권한 smoke test
- 검수/공개 상태 전환 smoke test

## 새 세션 시작 기준

새 세션은 다음 목표로 시작한다.

1. 이 문서를 기준으로 현재 repo를 재검토한다.
2. 기존 구현 중 유지할 것과 버릴 것을 구분한다.
3. API 모듈 분리 계획을 세운다.
4. `data/catalog.js`에서 DB로 가져가는 migration script를 만든다.
5. DB에서 public catalog를 생성하는 반대 방향 script를 만든다.
6. 두 script 결과를 검증하는 integrity check를 만든다.

새 세션에서는 바로 배포하지 않는다. 설계 기준, migration script, 검증 script를 먼저 만든 뒤 운영 반영 여부를 별도 결정한다.

## 의사결정 필요 항목

아래 항목은 구현 전에 결정이 필요하다.

| 항목 | 권장안 |
|---|---|
| 장기 source of truth | Webtoon DB/API |
| 공개 페이지 방식 | Published snapshot 기반 정적 페이지 |
| 기존 `data/catalog.js` 역할 | 마이그레이션 입력 및 생성 산출물 |
| 작가 스튜디오 기준 | DB 기준 운영 콘솔 |
| 이미지 저장 | 단기 static path, 중기 object storage + CDN |
| 상태 모델 | 제작 상태와 공개 상태 분리 |
| 배포 방식 | DB -> catalog -> static pages -> deploy |
| 자동 공개 | 초기에는 관리자 승인 후 수동/반자동 snapshot 생성 |

## 기존 문서와의 관계

- `docs/AUTH_FEEDBACK_AUTHOR_PLAN.md`: 인증, 작가신청, 피드백 정책의 기준으로 유지한다.
- `docs/CREATOR_STUDIO_DETAIL_DESIGN.md`: 작가 스튜디오 화면/기능 상세로 유지하되, source of truth와 공개 산출물 기준은 이 문서를 따른다.
- `docs/CREATOR_STUDIO_PERFORMANCE_PLAN.md`: API 호출 수 최적화 문서로 유지한다. 단, API 분리 이후 다시 갱신한다.
- `db/schema.sql`: 현재 구현된 운영 모델의 시작점이다. 새 세션에서 상태 분리와 asset/publication 테이블 보강 여부를 검토한다.
- `data/catalog.js`: 현재 운영 공개 상태의 스냅샷이다. 장기적으로는 사람이 직접 관리하는 원천 파일이 아니라 생성 산출물이 되어야 한다.

## Registry 참조

이 문서는 DreamLabs Skill Registry의 다음 문서를 참조해 작성한다.

- `README.md`
- `REGISTRY.md`
- `docs/WORKER_USAGE_GUIDE.md`
- `skills/general/atomic/repo-inspection`
- `skills/general/atomic/test-command-discovery`
