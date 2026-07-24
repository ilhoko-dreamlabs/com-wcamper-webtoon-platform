# Creator Studio Refactor Plan v0.30

Date: 2026-07-24
Status: Implementation baseline

## Goal

작가페이지의 느린 초기 로딩과 화면/API 결합을 해소한다. 공개 사이트는 DB 직접 조회가 아니라 검수 완료 snapshot artifact를 원천으로 사용하고, 작가/관리자 운영 화면은 DB 기반 read model을 화면 단위로 조회한다.

## Registry References

이 계획은 DreamLabs skill registry의 다음 문서를 기준으로 작성했다.

| Registry document | Applied rule |
|---|---|
| `README.md` | registry를 DreamLabs 작업 source of truth로 취급 |
| `REGISTRY.md` | `repo-inspection`, `test-command-discovery`, `dreamlabs-deployment-readiness` 적용 |
| `docs/WORKER_USAGE_GUIDE.md` | production-impacting 작업은 별도 승인/검증 경계로 분리 |
| `skills/general/atomic/repo-inspection/SKILL.md` | 변경 전 저장소 구조와 git 상태 확인 |
| `skills/general/atomic/test-command-discovery/SKILL.md` | 로컬 검증 command 확인 |
| `skills/dreamlabs-specific/workflows/dreamlabs-deployment-readiness/workflow.md` | 배포 준비는 build/test/secret/rollback/handoff 관점으로 정리 |

## 단계별 계획표

| 단계 | 작업 | 설계 결정 | 구현 상태 | 검증 |
|---:|---|---|---|---|
| 1 | 현황 분석 | 작가 UI는 `/creator-studio` 단일 route와 `/api/creator/workspace` 의존이 병목 | 완료 | 코드 inspection |
| 2 | 네비게이션 반영 | dashboard, works, work detail, episode detail, feedback, settings를 URL 경로로 분리 | 완료 | SPA route parser/build 검증 |
| 3 | 화면 단위 API 분리 | dashboard/feedback endpoint 추가, 기존 series/episodes/images/profile endpoint 재사용 | 완료 | Node syntax/build 검증 |
| 4 | 초기 로딩 최적화 | dashboard 첫 화면은 `/api/creator/dashboard`만 호출하고 작품/회차 상세는 lazy load | 완료 | 코드 경로 검증 |
| 5 | DB 상태 모델 보강 | `status`는 호환 필드, `draft_status`/`publication_status`를 새 기준으로 추가 | 완료 | schema/bootstrap 검증 |
| 6 | 검수 흐름 정리 | 작가 검수 요청은 draft 상태만 변경하고 review row를 append | 완료 | API transaction 검토 |
| 7 | snapshot/release 설계 | snapshot, static artifact, release 기록을 분리 | 완료 | schema 문서 및 SQL 검증 |
| 8 | preview/promote/rollback | production deploy는 실행하지 않고 release 테이블과 운영 절차 문서화 | 부분 완료 | 로컬 readiness 한정 |
| 9 | `data/catalog.js` 경계 | 공개 runtime은 generated catalog, 운영 원천은 DB/snapshot으로 분리 | 기존 구현 유지, 문서 보완 | public catalog 검증 script |
| 10 | 테스트/검증 | build, artifact, runtime smoke, asset validation 수행 | 완료 | `npm run ...` |

## Target Navigation

| 화면 | URL | Primary API | 추가 API |
|---|---|---|---|
| 대시보드 | `/creator-studio/dashboard` | `GET /api/creator/dashboard` | 없음 |
| 작품 목록 | `/creator-studio/works` | `GET /api/creator/series` | 없음 |
| 작품 상세 | `/creator-studio/works/:seriesId` | `GET /api/creator/series/:id` | `GET /api/creator/series/:id/episodes` |
| 회차 상세 | `/creator-studio/episodes/:episodeId` | `GET /api/creator/episodes/:id` | `GET /api/creator/episodes/:id/images`, series detail |
| 피드백 | `/creator-studio/feedback` | `GET /api/creator/feedback` | 없음 |
| 설정 | `/creator-studio/settings` | `GET /api/creator/profile` | 없음 |

`GET /api/creator/workspace`는 호환 endpoint로 유지하되 신규 UI의 기본 로딩 경로에서는 사용하지 않는다.

## Publication Boundary

```text
작가 DB 원천
→ 검수 요청
→ publication_reviews append
→ 관리자 승인
→ publication_snapshots 생성
→ static_artifacts 생성
→ preview release
→ smoke 검증
→ production promote
→ publication_releases 기록
```

검수 승인과 production promote는 다른 운영 판단이다. 승인된 콘텐츠라도 artifact 검증 전에는 production 공개 상태로 간주하지 않는다.

## Rollback Note

| 항목 | 내용 |
|---|---|
| rollback target | creator route/API/schema additive 변경 |
| rollback method | 이전 commit으로 revert, DB는 additive 컬럼/테이블 유지 가능 |
| approval required | production rollback 또는 DB 변경 제거는 운영자 승인 필요 |
| verification after rollback | build, public catalog smoke, creator route smoke |
| residual risk | 이미 생성된 review/release row는 rollback으로 자동 삭제되지 않음 |

## Acceptance Criteria

- `/creator-studio`와 `/creator-studio/dashboard`는 dashboard API만 필요로 한다.
- `/creator-studio/works`는 작품 목록 API만 필요로 한다.
- 작품/회차 상세는 선택한 리소스 범위만 조회한다.
- 작가 피드백은 별도 API와 화면으로 분리된다.
- series/episode 응답은 기존 `status`와 신규 `draftStatus`, `publicationStatus`를 함께 제공한다.
- static build와 public catalog 검증이 통과한다.

## v0.31 Release Readiness Update

Date: 2026-07-24

| Item | Result |
|---|---|
| Repeatable readiness script | `npm run readiness:creator-studio` added |
| Readiness report | `reports/creator-studio-readiness-v0.31.json` |
| DB runbook | `docs/06-operations/creator-studio-db-migration-runbook-v0.31.md` |
| Release handoff | `docs/06-operations/creator-studio-release-handoff-v0.31.md` |
| UI status logic | Creator edit/review controls now use `draftStatus` before legacy `status`; publication status is shown separately when relevant |
| External state | No remote push, deployment, production migration, or production promote performed |
