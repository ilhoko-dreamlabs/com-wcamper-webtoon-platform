# 작가 스튜디오 조회 성능 분석 및 개선 설계

Date: 2026-07-11
Scope: `/creator-studio`, `/api/creator/*`, 작가 콘텐츠 DB 조회

## 목표

작가 스튜디오의 첫 조회 속도를 개선한다. 특히 작가페이지 첫 화면에서는 회차가 필요 없으므로 작품별 회차 API를 호출하지 않고, 작품페이지와 회차페이지에서도 현재 화면에 필요한 범위만 조회한다.

## 병목 결론

느린 주된 이유는 DB 테이블 구조 자체보다 초기 조회 API 흐름이 잘게 쪼개져 있기 때문이다.

기존 구조는 `/api/creator/summary`, `/api/creator/series`, `/api/creator/profile`를 병렬 호출한 뒤, 작품 수만큼 `/api/creator/series/{seriesId}/episodes`를 추가 호출했다. 각 API는 다시 외부 통합로그인 세션 확인, 작가 권한 확인, `authors` 레코드 보장, DB 조회를 반복했다.

작품이 10개면 작가페이지 첫 조회에서 최소 13개 작가 API 요청이 발생한다. `/api/me`까지 포함하면 통합 인증 확인도 여러 번 반복된다.

## 기존 API 구조

```text
/creator-studio
└─ refreshAuthState()
   └─ GET /api/me
      ├─ auth.wcamper.com 세션 확인
      ├─ activeAuthorFromSession()
      └─ author_applications 조회

└─ loadCreatorDashboard()
   ├─ GET /api/creator/summary
   │  ├─ auth.wcamper.com 세션 확인
   │  ├─ ensureAuthorRecord()
   │  └─ creator_dashboard_counts 조회 또는 재계산
   ├─ GET /api/creator/series
   │  ├─ auth.wcamper.com 세션 확인
   │  ├─ ensureAuthorRecord()
   │  └─ webtoon_series 목록 조회
   ├─ GET /api/creator/profile
   │  ├─ auth.wcamper.com 세션 확인
   │  ├─ ensureAuthorRecord()
   │  └─ authors 프로필 조회
   └─ 작품 수만큼 반복
      └─ GET /api/creator/series/{seriesId}/episodes
         ├─ auth.wcamper.com 세션 확인
         ├─ ensureAuthorRecord()
         ├─ webtoon_series 소유권 확인
         └─ webtoon_episodes 목록 조회
```

### 기존 요청 수

| 화면 | 기존 API 호출 |
|---|---:|
| 작가페이지 | `/api/me` 1회 + creator API 3회 + 작품 수 N회 |
| 작품페이지 | `/api/me` 1회 + creator API 3회 + 작품 수 N회 |
| 회차페이지 | `/api/me` 1회 + creator API 3회 + 작품 수 N회 + 이미지 1회 |

## 개선 API 구조

신규 `GET /api/creator/workspace`를 추가한다.

```text
GET /api/creator/workspace
GET /api/creator/workspace?series={seriesId}
GET /api/creator/workspace?episode={episodeId}
```

```text
/creator-studio
└─ refreshAuthState()
   └─ GET /api/me

└─ loadCreatorDashboard()
   └─ GET /api/creator/workspace[?series|episode]
      ├─ auth.wcamper.com 세션 확인 1회
      ├─ ensureAuthorRecord() 1회
      ├─ authors 프로필 조회
      ├─ creator_dashboard_counts 조회
      ├─ webtoon_series 목록 조회
      ├─ 화면에 필요한 webtoon_episodes 조회
      └─ 회차페이지인 경우 episode_images 조회
```

### 개선 요청 수

| 화면 | 개선 API 호출 |
|---|---:|
| 작가페이지 | `/api/me` 1회 + `/api/creator/workspace` 1회 |
| 작품페이지 | `/api/me` 1회 + `/api/creator/workspace?series={id}` 1회 |
| 회차페이지 | `/api/me` 1회 + `/api/creator/workspace?episode={id}` 1회 |

## DB 구조와 조회 방식

### 관계 구조

```text
authors
└─ webtoon_series
   └─ webtoon_episodes
      └─ episode_images

authors
└─ creator_dashboard_counts

feedback
└─ target_type + target_id로 AUTHOR, SERIES, EPISODE에 연결
```

### 현재 조회 방식

| 데이터 | 기존 방식 | 개선 방식 |
|---|---|---|
| 작가 프로필 | `/api/creator/profile` 단독 조회 | workspace 응답에 포함 |
| 집계 | `/api/creator/summary` 단독 조회 | workspace 응답에 포함 |
| 작품 목록 | `/api/creator/series` 단독 조회 | workspace 응답에 포함 |
| 회차 목록 | 작품 수만큼 API 호출 | `series` 파라미터가 있을 때 해당 작품만 조회 |
| 회차 상세 | 전체 작품 회차를 가져와 클라이언트에서 탐색 | `episode` 파라미터가 있을 때 해당 회차만 조회 |
| 이미지 목록 | 회차페이지에서 별도 API 호출 | `episode` 파라미터가 있을 때 workspace 응답에 포함 |

## 주요 테이블 스키마

### `authors`

작가 권한과 공개 프로필의 기준 테이블이다.

| 컬럼 | 타입 | 역할 |
|---|---|---|
| `id` | `text primary key` | 작가 ID |
| `user_id` | `text unique` | 통합로그인 사용자 ID |
| `display_name` | `text` | 공개 작가명 |
| `bio` | `text` | 작가 소개 |
| `handle` | `text` | 공개 작가페이지 핸들 |
| `icon_url` | `text` | 작가 아이콘 |
| `public_page_enabled` | `boolean` | 공개 작가페이지 표시 여부 |
| `status` | `text` | `PENDING`, `ACTIVE`, `SUSPENDED`, `REJECTED` |
| `approved_at` | `timestamptz` | 승인 시각 |

### `webtoon_series`

작품 단위 테이블이다.

| 컬럼 | 타입 | 역할 |
|---|---|---|
| `id` | `text primary key` | 작품 ID |
| `author_id` | `text references authors(id)` | 소유 작가 |
| `title` | `text` | 작품명 |
| `summary` | `text` | 세계관/작품 소개 |
| `genre` | `text` | 장르 |
| `tags` | `jsonb` | 태그 목록 |
| `cover_url` | `text` | 표지 URL |
| `status` | `text` | 제작/검수/공개 상태 |
| `review_note` | `text` | 검수 메모 |

인덱스:

```sql
create index if not exists webtoon_series_author_updated_idx
  on webtoon_series (author_id, updated_at desc);
```

### `webtoon_episodes`

회차 단위 테이블이다.

| 컬럼 | 타입 | 역할 |
|---|---|---|
| `id` | `text primary key` | 회차 ID |
| `series_id` | `text references webtoon_series(id)` | 소속 작품 |
| `number` | `integer` | 회차 번호 |
| `title` | `text` | 회차명 |
| `summary` | `text` | 회차 요약 |
| `draft_body` | `text` | 원고/메모 |
| `content_url` | `text` | 대표 원고 또는 이미지 URL |
| `status` | `text` | 제작/검수/공개 상태 |
| `review_note` | `text` | 검수 메모 |
| `review_requested_at` | `timestamptz` | 검수 요청 시각 |
| `scheduled_at` | `timestamptz` | 공개 예약 시각 |
| `published_at` | `timestamptz` | 공개 시각 |

인덱스:

```sql
create index if not exists webtoon_episodes_series_number_idx
  on webtoon_episodes (series_id, number asc);
```

### `episode_images`

회차 이미지와 이미지 사이 처리 설정 테이블이다.

| 컬럼 | 타입 | 역할 |
|---|---|---|
| `id` | `text primary key` | 이미지 ID |
| `episode_id` | `text references webtoon_episodes(id)` | 소속 회차 |
| `sort_order` | `integer` | 표시 순서 |
| `image_url` | `text` | 이미지 URL |
| `alt_text` | `text` | 대체 텍스트 |
| `gap_after` | `integer` | 이미지 뒤 간격 |
| `background_color` | `text` | 사이 배경색 |

인덱스:

```sql
create index if not exists episode_images_episode_order_idx
  on episode_images (episode_id, sort_order asc);
```

### `creator_dashboard_counts`

대시보드 집계 캐시 테이블이다.

| 컬럼 | 타입 | 역할 |
|---|---|---|
| `author_id` | `text primary key references authors(id)` | 작가 ID |
| `series_counts` | `jsonb` | 작품 상태별 수 |
| `episode_counts` | `jsonb` | 회차 상태별 수 |
| `feedback_count` | `integer` | 독자 피드백 수 |
| `refreshed_at` | `timestamptz` | 갱신 시각 |

## 단계별 작업설계

| 단계 | 목표 | 적용 내용 | 상태 |
|---:|---|---|---|
| 1 | 병목 확인 | 기존 초기 조회 API와 반복 인증 흐름 분석 | 완료 |
| 2 | 통합 조회 설계 | `/api/creator/workspace` 응답 구조 설계 | 완료 |
| 3 | 서버 구현 | `creatorWorkspace()`와 `handleWorkspace()` 추가 | 완료 |
| 4 | 프론트 전환 | `loadCreatorDashboard()`를 workspace 1회 호출로 변경 | 완료 |
| 5 | 문서화 | API 흐름도, DB 방식, 스키마, 작업설계 작성 | 완료 |
| 6 | 검증 | 문법 검사, 빌드, 운영 smoke test | 진행 기준 |

## 적용 후 기대 효과

- 작가페이지 첫 화면에서 작품별 회차 API 호출 제거
- 작품 수가 늘어도 작가페이지 첫 조회 요청 수 고정
- 통합로그인 세션 확인 반복 감소
- `ensureAuthorRecord()` 반복 업데이트 감소
- 회차 이미지는 회차페이지 직접 진입 또는 이미지 변경 후에만 조회

## 남은 개선 후보

- `/api/me`와 `/api/creator/workspace`의 인증 확인 중복 제거 또는 세션 캐시 도입
- `ensureAuthorRecord()`가 매 조회마다 `updated_at`을 갱신하지 않도록 변경 검토
- `creator_dashboard_counts` 정합성 점검용 관리자 재계산 API 추가
- 작품 수가 매우 많아질 경우 workspace 작품 목록 페이지네이션 추가
- 회차 수가 매우 많아질 경우 작품페이지 회차 목록 페이지네이션 추가
