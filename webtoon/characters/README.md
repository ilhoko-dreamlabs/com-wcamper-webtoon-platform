# 캐릭터 자산 구조

각 캐릭터 폴더는 다음 파일을 목표 구조로 사용한다.

```txt
character-id/
  master-sheet.png
  face-front.png
  face-side.png
  expressions.png
  pose-camping.png
  notes.md
  prompt.md
```

현재 MVP에는 `notes.md`와 `prompt.md`를 먼저 둔다. 실제 AI 이미지 생성 기준 컷이 확정되면 PNG 기준 이미지를 추가한다.

## 운영 원칙

- 기준 이미지는 worker가 직접 덮어쓰지 않는다.
- 기준 이미지 변경은 별도 검수 후 반영한다.
- 회차별 임시 이미지는 `webtoon/episodes/{episode-id}/drafts/`에 둔다.
