# 봉달캠퍼 유니버스 코믹스

`webtoon.wcamper.com` 캠핑 웹툰 MVP입니다. 현재는 Google Drive에 업로드된 실제 웹툰 컷을 정적 사이트에 연결해 `봉달캠퍼 유니버스 코믹스` 공개연재 형태로 제공합니다. 다음 백엔드 단계에서는 작가가 GPT 등 자신이 쓰는 AI 도구에서 제작한 웹툰을 API, MCP, GPT Actions로 제출할 수 있게 하는 구조를 우선합니다.

## 구성

- `index.html`: 독자용 웹툰 사이트
- `docs/DESIGN.md`: 제품 구성, 통합인증, 피드백, 방문/조회 데이터, 스코어링 설계
- `data/catalog.js`: 작품/회차 카탈로그 데이터
- `assets/`: CSS, JS, 이미지 자산
- `webtoon/characters/`: 캐릭터 기준 자산과 프롬프트
- `webtoon/world/`: BD크루 세계관, 관계, 말투 기준
- `webtoon/skills/`: worker 제작 규칙
- `webtoon/episodes/`: 회차별 worker 작업공간

## 로컬 실행

```bash
cd /workspace/github/com-wcamper-webtoon-platform
python -m http.server 5174
```

브라우저에서 `http://localhost:5174/`로 확인합니다.

## 1차 MVP 범위

- 작가 프로필: `봉달캠퍼 유니버스 코믹스`
- 공개연재 시즌 1: `BD-Crew 단톡방` 13컷
- 공개연재 시즌 2: `부라보캠프 단톡방` 5컷
- 기획중: `봉봉패미리 캠핑`
- Google Drive에서 내려받은 정적 이미지 기반 회차 뷰어
- 메인
- 작품 목록
- 작품 상세
- 회차 목록
- 회차 뷰어
- 작가 프로필
- 작가의 여러 작품, 연재 준비작, 기획작
- 작가/작품/회차별 피드백 설계 화면
- `auth.wcamper.com` 통합인증 연결 자리
- 익명/인증 회원 피드백 스코어링 기준 표시
- 백그라운드 방문/조회/완독/재방문 데이터 축적 설계
- 작가/작품/회차별 목표 설정 및 달성률 설계 화면
- 작가/작품/회차별 스코어링 설계
- 작가 제출 API 설계
- 작가용 MCP 서버 설계
- GPT Actions용 OpenAPI 계약 방향
- AI 도구 사용 고지와 검수 상태 설계
- Vercel 기반 무료 MVP/베타 운영 기준
- 유료 전환 트리거 기준
- 모바일 최적화
- 정적 데이터 기반 게시
- 회차별 제작 폴더 규칙
- worker 산출물 검수 체크리스트

## 1차에서 제외

- 회원가입
- 실제 회원 로그인 처리
- 실제 피드백 저장/댓글 운영
- 실제 방문/조회 이벤트 저장 API
- 실제 목표 설정/수정 API
- 실제 목표 달성률 집계 작업
- 실제 스코어링 배치/집계 작업
- 실제 작가 제출 API
- 실제 MCP 서버
- 실제 GPT Actions 배포
- 실제 자산 업로드 저장소
- 결제
- 작가 대시보드
- AI 웹툰작가 저작도구 worker production 서비스
- 자동 배포
- 외부 작가 자유 즉시 공개

## Worker 운영 원칙

AI 웹툰 worker는 `webtoon/episodes/{episode-id}/`만 쓰기 대상으로 사용합니다. `characters/`, `world/`, `skills/`는 기준 문서이므로 읽기 전용으로 취급합니다. 실제 사이트 게시 반영은 사람이 검수한 뒤 `data/catalog.js`와 최종 이미지 자산을 업데이트합니다.

향후 AI 웹툰작가 저작도구는 독자 서비스와 분리된 별도 worker 서비스로 구성합니다. 이 worker는 콘티/컷/이미지 생성과 제출 패키지 생성을 맡고, 본 플랫폼은 인증, 제출 API, 검수, 공개, 독자 데이터 축적을 담당합니다.

## MVP/베타 운영 판단

초기 운영은 `Vercel 정적 프론트 + Vercel Functions API + Postgres + object storage` 구조를 기준으로 설계합니다. GitHub 정적 사이트나 Git 저장소는 코드와 샘플 자산용으로만 사용하고, 작가 업로드 이미지와 회차 자산은 별도 object storage에 저장합니다.

무료 구간에서는 이미지 전송량, Blob/storage 사용량, DB 크기, API 호출 수, 이벤트 row 수를 월별로 확인합니다. 무료 한도 70%에 접근하거나 외부 작가 모집/상업적 베타를 시작하면 유료 전환 또는 별도 인프라 전환을 검토합니다.
