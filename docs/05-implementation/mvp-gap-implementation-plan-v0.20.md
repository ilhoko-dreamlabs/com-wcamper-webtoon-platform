# MVP Gap Implementation Plan v0.20

기준일: 2026-07-17

이 문서는 설계에는 있으나 미구현/부분구현이던 MVP 항목의 실행 계획과 이번 구현 기준을 고정한다.

## Decision

| 항목 | 결정 |
|---|---|
| 관리자 콘솔 | `/admin`을 운영자 콘솔의 기준 화면으로 사용한다. |
| 작가신청 | 목록/상세/승인/반려를 관리자 API와 UI에서 처리한다. |
| 피드백 검수 | 기본 정책은 `post`로 두고, 신고/숨김/복구/삭제를 관리자 검수로 처리한다. |
| 공개 catalog | 현재 generated artifact를 유지하되 DB source 전환 준비 테이블과 검수 흐름을 먼저 구축한다. |
| 자산 업로드 | object storage 직접 업로드 전 단계로 `asset_objects` URL 등록 API를 제공한다. |
| 독자 지표 | 개인정보 최소화를 위해 익명 ID와 로그인 user_id를 분리하고 일별 집계를 저장한다. |
| 목표/스코어링 | `content_goals`, `content_scores` schema를 먼저 열고 공개 노출은 보류한다. |
| 관심작 | 로그인 사용자 전용 `favorites` API와 작품 상세 토글을 MVP로 둔다. |

## Plan Table

| 우선순위 | 항목 | 현재 상태 | 승인여부 | 의사결정사항 | 권고안 | 수행상태 | 검증방법 |
|---:|---|---|---|---|---|---|---|
| 1 | 관리자 작가신청 목록/상세/승인/반려 | 승인 API만 부분 존재 | 승인됨 | `/admin` 기준 | 목록/상세/승인/반려 API와 UI 구현 | 완료 | `readiness:mvp-gap`, build |
| 2 | 관리자 피드백 검수/신고 처리 | 공개 피드백만 존재 | 승인됨 | `post` 기본 | 신고 API, 관리자 숨김/복구/삭제 구현 | 완료 | `readiness:mvp-gap`, build |
| 3 | DB source catalog 전환 준비 | generated artifact 중심 | 승인됨 | 단계 전환 | review/snapshot schema 먼저 구축 | 완료 | schema/readiness |
| 4 | publication review / snapshot | 작가 검수 요청만 존재 | 승인됨 | episode 중심 MVP | 요청 저장, 관리자 승인/보완/공개 구현 | 완료 | `readiness:mvp-gap` |
| 5 | asset object / 업로드 | URL 등록만 가능 | 승인됨 | signed upload 후속 | `asset_objects` 등록 API 제공 | 완료 | `node --check`, schema |
| 6 | 독자 조회/완독/재방문 이벤트 | 미구현 | 승인됨 | 익명 ID 최소 저장 | event API와 일별 집계 구현 | 완료 | `readiness:mvp-gap` |
| 7 | 목표/달성률/스코어링 | 화면 설계만 있음 | 승인됨 | 내부 지표 우선 | goal/score schema 우선 | 부분완료 | schema/readiness |
| 8 | 관심작/Favorite | schema만 존재 | 승인됨 | 로그인 전용 | API와 작품 상세 버튼 구현 | 완료 | `readiness:mvp-gap`, build |
| 9 | 작가 스튜디오 미완성 | CRUD/검수요청 부분 구현 | 승인됨 | object storage 후속 | asset 등록 API와 review 연결 | 부분완료 | `readiness:mvp-gap` |
| 10 | 관리자 콘솔 미완성 화면 | 설정만 구현 | 승인됨 | 운영 작업 중심 | 신청/피드백/검수 섹션 추가 | 완료 | browser smoke/build |

## Remaining Deferred Items

| 항목 | 보류 사유 | 다음 조치 |
|---|---|---|
| 실제 object storage signed upload | 저장소 provider/env 필요 | `WEBTOON_ASSET_BUCKET` 계열 env 확정 후 signed URL 구현 |
| DB catalog를 generated artifact의 기본 source로 전환 | 운영 데이터 import와 diff 검증 필요 | import/export dry-run 후 production migration |
| 정확한 scroll-depth 완독 | 현재는 time-on-page heuristic | IntersectionObserver 기반 reader completion으로 보완 |
| 목표/스코어링 UI | 지표 정책 확정 전 공개 위험 | 관리자 내부 지표 화면부터 구현 |

## Evidence

검증 리포트: `reports/mvp-gap-implementation-v0.20.json`

사용 registry 문서:

- `/workspace/dreamlabs-skill-registry/README.md`
- `/workspace/dreamlabs-skill-registry/REGISTRY.md`
- `/workspace/dreamlabs-skill-registry/docs/WORKER_USAGE_GUIDE.md`
- `/workspace/dreamlabs-skill-registry/docs/EVIDENCE_POLICY.md`
- `/workspace/dreamlabs-skill-registry/docs/OPERATIONS.md`

사용 registry skill:

- `repo-inspection`
- `secret-scan-review`
- `test-command-discovery`
- `dreamlabs-deployment-readiness`
- `dreamlabs-release-handoff`
