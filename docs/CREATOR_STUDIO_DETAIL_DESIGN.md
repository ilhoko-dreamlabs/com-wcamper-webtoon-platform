# 작가페이지 상세설계

Date: 2026-07-10
Scope: `/creator-studio`, 작가 권한 API, 작가 운영 데이터 모델

## 목표

작가페이지는 승인 작가가 자신의 작품을 운영하는 콘솔이다. 단순 소개 화면이 아니라 작품 등록, 회차 제작, 검수 요청, 공개 예약, 독자 피드백 확인, 협업 문의 대응을 한 곳에서 처리하는 업무 화면으로 설계한다.

초기 목표는 다음이다.

- 승인 작가만 `/creator-studio`의 운영 화면에 진입한다.
- 작가는 자신에게 권한이 있는 작품과 회차만 조회/수정한다.
- 공개 전 모든 회차는 사이트관리자 검수 또는 정책 검사를 거친다.
- 독자 피드백은 원문 나열보다 회차별 반복 의견과 반영 상태 중심으로 보여준다.
- 협업/PPL 문의는 작품 단위로 연결하되, 결제/정산은 MVP 범위에서 제외한다.

## 사용자와 권한

| 사용자 | 진입 | 권한 | 화면 |
|---|---|---|---|
| 비로그인 | `/creator-studio` 직접 접근 | 없음 | 통합로그인 안내 |
| 일반회원 | 로그인 후 접근 | 없음 | 작가신청 안내, 신청 상태 |
| 승인 작가 | `Author.status=ACTIVE` 또는 서버 allowlist/role | 작가 | 작가 운영 콘솔 |
| 정지 작가 | `Author.status=SUSPENDED` | 제한 | 접근 제한, 운영 문의 안내 |
| 사이트관리자 | `/admin` | 관리자 | 작가 권한 부여/회수, 검수, 설정 관리 |

작가 권한은 클라이언트 상태로 확정하지 않는다. `/api/creator/me` 또는 `/api/me`가 서버에서 auth 세션을 검증하고, DB의 `authors` 또는 서버 측 role/email allowlist를 확인한 결과만 사용한다.

초기 승인 작가:

- `ilho.ko@dreamlabs.co.kr`

추가 작가는 `WEBTOON_AUTHOR_EMAILS` 또는 auth role `webtoonAuthor`/`creator`/`author`로 확장한다. 최종 운영에서는 이메일 allowlist보다 `authors.status=ACTIVE`와 auth role을 우선한다.

초기 공개 카탈로그 소유권:

- `ilho.ko@dreamlabs.co.kr`는 현재 공개 배포된 `봉달캠퍼 유니버스 코믹스` 작품의 운영 작가 계정이다.
- 작가 API는 이 계정의 인증 세션이 확인되면 정적 카탈로그의 `BD-Crew 단톡방`, `부라보캠프 단톡방`, `봉봉패미리 캠핑`을 DB의 `webtoon_series`에 연결한다.
- 해당 작품의 공개/기획 회차도 `webtoon_episodes`에 연결해 `/creator-studio`의 내 작품과 회차 목록에서 확인할 수 있게 한다.
- 이 연결은 idempotent upsert로 수행한다. 운영 DB에 같은 작품 id가 이미 있으면 해당 작가 소유권과 공개 메타데이터를 현재 카탈로그 기준으로 맞춘다.
- 추가 초기 카탈로그 소유자는 `WEBTOON_INITIAL_CATALOG_OWNER_EMAILS`로 확장할 수 있다.

## 정보 구조

```text
/creator-studio
├─ 대시보드
│  ├─ 오늘 할 일
│  ├─ 작품/회차 상태 요약
│  ├─ 최근 피드백
│  └─ 검수/공개 일정
├─ 작품
│  ├─ 작품 목록
│  ├─ 작품 기본정보
│  ├─ 공개 상태
│  └─ AI 사용 고지/권리 메모
├─ 회차
│  ├─ 회차 목록
│  ├─ 기획안
│  ├─ 콘티/패널
│  ├─ 원본 이미지/편집본
│  ├─ 검수 요청
│  └─ 공개 예약
├─ 피드백
│  ├─ 회차별 피드백
│  ├─ 반복 의견
│  ├─ 반영 상태
│  └─ 신고/숨김 상태
├─ 협업
│  ├─ 작품별 문의
│  ├─ 제안 상태
│  └─ 운영자 메모
└─ 작가 설정
   ├─ 표시명
   ├─ 소개
   ├─ 포트폴리오 링크
   └─ 알림 설정
```

상단 공개 메뉴에는 `/creator-studio`를 텍스트 메뉴로 노출하지 않고, 현재처럼 작가 아이콘 버튼의 목적지만 로그인/권한 상태에 따라 전환한다.

## 핵심 화면

### 1. 대시보드

목적: 작가가 지금 처리해야 할 일을 바로 파악한다.

구성:

- 권한 배지: `승인 작가`, `검수 중`, `제한됨`
- 오늘 할 일
  - 임시저장 회차
  - 검수 반려 회차
  - 공개 예약 대기
  - 답변 또는 반영 표시가 필요한 피드백
- 작품 상태 요약
  - 연재중
  - 준비중
  - 검수중
  - 비공개
- 최근 피드백
  - 회차명
  - 요약
  - 상태: `새 피드백`, `확인`, `반영 예정`, `반영 완료`
- 빠른 작업
  - `작품 만들기`
  - `회차 초안 작성`
  - `검수 요청`
  - `피드백 보기`

### 2. 작품 관리

작품은 작가가 직접 공개하지 않고, 상태를 변경해 운영 검수 흐름으로 보낸다.

작품 필드:

- 제목
- 슬러그
- 한 줄 소개
- 장르/태그
- 대상 독자
- 연재 상태: `DRAFT`, `IN_REVIEW`, `READY`, `PUBLISHED`, `PAUSED`, `ARCHIVED`
- 공개 범위: `PRIVATE`, `UNLISTED`, `PUBLIC`
- 표지/썸네일
- AI 사용 고지
- 권리/출처 메모

작가가 가능한 작업:

- 초안 생성/수정
- 공개 검수 요청
- 비공개 전환 요청
- 표지/썸네일 교체 요청

관리자만 가능한 작업:

- 공개 승인
- 공개 중지
- 작가 소유권 변경
- 권리 이슈 플래그 처리

### 3. 회차 제작

회차는 제작 단계가 명확해야 한다. AI 웹툰 제작 특성상 결과 이미지만 저장하면 다음 회차 재현성이 떨어지므로 기획/패널/자산/QA를 함께 관리한다.

회차 상태:

| 상태 | 의미 | 다음 작업 |
|---|---|---|
| `DRAFT` | 작가 초안 | 콘티/패널 작성 |
| `ASSET_READY` | 이미지/편집 자산 준비 | QA 체크 |
| `SUBMITTED` | 검수 요청 | 관리자 검수 |
| `CHANGES_REQUESTED` | 보완 요청 | 작가 수정 |
| `APPROVED` | 공개 가능 | 공개 예약 |
| `SCHEDULED` | 공개 예약됨 | 공개 대기 |
| `PUBLISHED` | 공개됨 | 피드백 확인 |
| `WITHHELD` | 공개 보류 | 운영자 확인 |

회차 필드:

- 작품 ID
- 회차 번호
- 제목
- 요약
- 작가 노트
- 기획안
- 패널 목록
- 원본 이미지 목록
- 편집본 URL
- AI 사용 고지
- QA 체크리스트 결과
- 검수 상태와 반려 사유
- 예약 공개 시각

패널 필드:

- 번호
- 장면 목적
- 등장인물
- 대사
- 이미지 instruction
- 이미지 URL
- 모바일 표시 순서
- QA 메모

### 4. 피드백 보드

피드백 보드는 댓글 관리 화면이 아니라 제작 의사결정 보드로 둔다.

기본 필터:

- 작품
- 회차
- 상태
- 기간
- 키워드

피드백 상태:

- `NEW`
- `READ`
- `ACTION_PLANNED`
- `ACTIONED`
- `DISMISSED`
- `HIDDEN`

작가가 가능한 작업:

- 확인 처리
- 반영 예정 표시
- 반영 완료 표시
- 운영자 검토 요청

작가가 할 수 없는 작업:

- 피드백 원문 삭제
- 신고 피드백 복구
- 다른 작가 작품의 피드백 조회

삭제/숨김은 사이트관리자 API에서 처리한다.

### 5. 협업 문의

협업 문의는 `/partnership`에서 들어온 브랜드/PPL/캠핑장 제안을 작품 또는 작가에게 연결하는 뷰다.

MVP에서는 조회 중심으로 둔다.

- 문의 제목
- 문의자 조직
- 연결 작품
- 상태: `NEW`, `REVIEWING`, `AUTHOR_REVIEW`, `ACCEPTED`, `DECLINED`, `CLOSED`
- 희망 일정
- 운영자 메모 요약

작가는 수락/거절 최종 처리를 직접 하지 않고, `관심 있음`, `검토 어려움`, `운영자와 논의` 정도의 응답만 남긴다.

## 데이터 모델 확장안

기존 테이블:

- `authors`
- `author_applications`
- `feedback`
- `favorites`
- `feedback_reports`

추가 후보:

```sql
create table if not exists webtoon_series (
  id text primary key,
  author_id text not null,
  title text not null,
  slug text not null unique,
  summary text not null default '',
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'IN_REVIEW', 'READY', 'PUBLISHED', 'PAUSED', 'ARCHIVED')),
  visibility text not null default 'PRIVATE'
    check (visibility in ('PRIVATE', 'UNLISTED', 'PUBLIC')),
  cover_url text,
  thumbnail_url text,
  ai_disclosure text not null default '',
  rights_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists webtoon_episodes (
  id text primary key,
  series_id text not null,
  episode_number integer not null,
  title text not null,
  summary text not null default '',
  status text not null default 'DRAFT'
    check (status in ('DRAFT', 'ASSET_READY', 'SUBMITTED', 'CHANGES_REQUESTED', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'WITHHELD')),
  planned_publish_at timestamptz,
  published_at timestamptz,
  ai_disclosure text not null default '',
  review_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (series_id, episode_number)
);

create table if not exists episode_panels (
  id text primary key,
  episode_id text not null,
  panel_number integer not null,
  scene_goal text not null default '',
  characters text not null default '',
  dialogue text not null default '',
  image_instruction text not null default '',
  image_url text,
  qa_note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (episode_id, panel_number)
);

create table if not exists creator_feedback_actions (
  id text primary key,
  feedback_id text not null,
  author_id text not null,
  status text not null default 'READ'
    check (status in ('READ', 'ACTION_PLANNED', 'ACTIONED', 'DISMISSED')),
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (feedback_id, author_id)
);
```

강한 FK는 auth DB와 분리 원칙 때문에 auth user에는 두지 않는다. 웹툰 서비스 내부 테이블 간 FK는 운영 migration 시점에 적용 여부를 결정한다.

## API 계약

### 현재 구현된 API

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| `GET` | `/api/creator/me` | 작가 | 작가 권한 확인 |
| `GET` | `/api/me` | 선택 | 회원/작가/신청 상태 조회 |
| `GET` | `/api/creator/summary` | 작가 | 대시보드 요약 |
| `GET` | `/api/creator/series` | 작가 | 내 작품 목록 |
| `POST` | `/api/creator/series` | 작가 | 작품 초안 생성 |
| `GET` | `/api/creator/series/:id` | 작가 | 작품 상세 |
| `PATCH` | `/api/creator/series/:id` | 작가 | 작품 초안 수정 |
| `GET` | `/api/creator/series/:id/episodes` | 작가 | 작품 회차 목록 |
| `POST` | `/api/creator/series/:id/episodes` | 작가 | 회차 초안 생성 |
| `PATCH` | `/api/creator/episodes/:id` | 작가 | 회차 초안 수정 |
| `POST` | `/api/creator/episodes/:id/request-review` | 작가 | 회차 검수 요청 |

### 후속 API

| Method | Path | 인증 | 설명 |
|---|---|---|---|
| `GET` | `/api/creator/episodes/:id` | 작가 | 회차 상세 |
| `GET` | `/api/creator/feedback` | 작가 | 내 작품/회차 피드백 목록 |
| `PATCH` | `/api/creator/feedback/:id/action` | 작가 | 피드백 반영 상태 변경 |
| `GET` | `/api/creator/partnership-inquiries` | 작가 | 연결된 협업 문의 목록 |
| `PATCH` | `/api/creator/profile` | 작가 | 작가 표시정보 수정 |

모든 API는 서버에서 작가 소유권을 확인한다. `authorId`, `seriesId`, `episodeId`를 클라이언트가 보냈더라도 해당 리소스가 현재 작가에게 속하지 않으면 접근을 허용하지 않는다.

## 화면 상태

`/creator-studio`는 다음 상태를 분리한다.

| 상태 | 표시 |
|---|---|
| 권한 확인 전 | 작가 권한 확인 중 |
| 비로그인 | 통합로그인 CTA |
| 일반회원 | 작가신청 CTA와 신청 상태 |
| 승인 작가, 데이터 없음 | 첫 작품 만들기 |
| 승인 작가, 데이터 있음 | 대시보드 |
| 작가 정지 | 접근 제한 안내 |
| API 실패 | 재시도 가능한 오류 |

API 실패 화면은 상세 오류나 내부 상태를 노출하지 않는다. 사용자가 할 수 있는 행동은 `다시 시도`, `마이페이지`, `운영 문의`로 제한한다.

## UI 원칙

- 대시보드는 카드 남발보다 작업 목록과 상태표 중심으로 구성한다.
- 작품/회차 목록은 표 또는 밀도 있는 리스트로 만든다.
- 모바일에서는 탭을 상단 고정하지 않고 섹션 이동 버튼과 접힘 영역을 사용한다.
- 위험한 작업은 확인 모달을 둔다.
- 공개/검수/반려 상태는 색상만으로 구분하지 않고 텍스트 라벨을 함께 표시한다.
- 저장/검수요청/공개예약은 명확한 버튼으로 분리한다.

## 관리자 연동

작가페이지에서 요청한 검수는 사이트관리자 `/admin`의 콘텐츠 관리 또는 운영 현황에 표시된다.

연동 항목:

- 작품 검수 요청
- 회차 검수 요청
- 반려 사유
- 공개 승인
- 공개 보류
- 신고 피드백 처리
- 작가 권한 정지/복구

관리자 액션은 `admin_audit_logs`에 남기고, 작가 액션은 별도 `creator_activity_logs` 추가를 검토한다.

## 구현 순서

1. 상세설계 확정
2. DB 확장안 확정: 작품/회차/패널/피드백 액션
3. 작가 소유권 helper 추가
4. `GET /api/creator/summary` 구현
5. 작품 목록/초안 생성 API 구현
6. 회차 목록/초안 생성 API 구현
7. `/creator-studio` 탭형 운영 UI 구현
8. 검수 요청 API와 관리자 화면 연동
9. 피드백 액션 API 구현
10. 협업 문의 조회 연동

## 현재 포함/제외

현재 포함:

- 작가 권한 게이트
- allowlist/role 작가의 `authors` row 자동 upsert
- 대시보드 요약
- 내 작품 목록
- 작품 초안 생성/수정
- 회차 초안 생성
- 회차 검수 요청
- `/creator-studio` 화면에서 위 API 직접 사용

현재 제외:

- 관리자 콘텐츠 검수 화면 연동
- 피드백 목록과 반영 상태
- 작가 직접 공개
- 결제/정산
- 대용량 이미지 업로드 UI
- AI 이미지 생성 엔진 내장
- 실시간 공동 편집
- 외부 작가 자유 가입/즉시 공개

## 검증 기준

- 비로그인은 `/creator-studio`에서 통합로그인 안내를 본다.
- 로그인 일반회원은 작가신청 안내 또는 신청 상태를 본다.
- 승인 작가는 작가 운영 콘솔을 본다.
- 작가는 자기 작품/회차만 조회한다.
- 검수 요청 후 관리자 화면에서 대기 상태로 확인 가능하다.
- 반려 사유는 작가페이지에서 확인 가능하다.
- 공개 승인 전 회차는 공개 웹툰 목록에 노출되지 않는다.
- `npm run build`로 정적 페이지 생성이 통과한다.

## 운영 판단

이 설계는 문서와 코드 구현 방향을 정하는 단계다. 운영 DB migration, production 환경변수 변경, production 배포, 기존 공개 데이터 구조 변경은 별도 승인 후 수행한다.

## 참조한 DreamLabs registry

- `README.md`
- `REGISTRY.md`
- `docs/WORKER_USAGE_GUIDE.md`
- `skills/general/atomic/repo-inspection/SKILL.md`
