# WCamper Webtoon MVP

`webtoon.wcamper.com` 캠핑 웹툰 MVP입니다. 1차 목표는 독자가 볼 수 있는 정적 연재 사이트와 AI 웹툰 제작 worker가 사용할 제한된 회차 작업공간을 함께 마련하는 것입니다.

## 구성

- `index.html`: 독자용 웹툰 사이트
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

- 메인
- 작품 목록
- 작품 상세
- 회차 목록
- 회차 뷰어
- 모바일 최적화
- 정적 데이터 기반 게시
- 회차별 제작 폴더 규칙
- worker 산출물 검수 체크리스트

## 1차에서 제외

- 회원가입
- 댓글
- 결제
- 작가 대시보드
- 자동 배포
- 외부 작가 자유 업로드

## Worker 운영 원칙

AI 웹툰 worker는 `webtoon/episodes/{episode-id}/`만 쓰기 대상으로 사용합니다. `characters/`, `world/`, `skills/`는 기준 문서이므로 읽기 전용으로 취급합니다. 실제 사이트 게시 반영은 사람이 검수한 뒤 `data/catalog.js`와 최종 이미지 자산을 업데이트합니다.
