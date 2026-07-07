# Worker 제한 정책

## 목적

AI 웹툰 작가 worker가 회차 제작에 필요한 산출물만 만들고, 기준 자산과 게시 시스템을 임의로 변경하지 못하게 한다.

## 읽기 대상

- `webtoon/characters/`
- `webtoon/world/`
- `webtoon/skills/`
- 현재 회차의 `input/`

## 쓰기 대상

- `webtoon/episodes/{episode-id}/planning/`
- `webtoon/episodes/{episode-id}/storyboard/`
- `webtoon/episodes/{episode-id}/prompts/`
- `webtoon/episodes/{episode-id}/drafts/`
- `webtoon/episodes/{episode-id}/review/`
- `webtoon/episodes/{episode-id}/final/`

## 직접 수정 금지

- `data/catalog.js`
- `index.html`
- `assets/`
- `webtoon/characters/`
- `webtoon/world/`
- `webtoon/skills/`

## 게시 흐름

1. worker가 `final/publish.md`와 `final/episode.json`을 만든다.
2. 사람이 `review/`와 `final/`을 검수한다.
3. 승인 후 운영자가 사이트 데이터와 최종 자산에 반영한다.
4. 배포는 별도 승인 후 진행한다.

## 민감정보

worker 산출물에는 토큰, 비밀번호, API 키, 비공개 계약 조건, 개인정보를 포함하지 않는다.
