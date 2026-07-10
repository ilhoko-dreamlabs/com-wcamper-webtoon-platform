# 작가모집 교육자료 페이지 설계

## 목적

`작가모집` 메뉴에 AI 웹툰 제작 교육자료를 독립 하위 페이지로 제공한다. 이 페이지의 목적은 자료를 단순 다운로드하게 만드는 것이 아니라, 작가 지원자가 WCAMPER Webtoon의 제작 기준을 이해하고 `작가신청`으로 이어지게 하는 것이다.

권장 경로는 `/creators/training`이다. 메뉴 노출명은 `교육자료`, 페이지 제목은 `AI 웹툰 제작 교육자료`로 둔다.

## 근거 자료

### DreamLabs registry

- `README.md`
- `REGISTRY.md`
- `docs/WORKER_USAGE_GUIDE.md`
- `skills/general/atomic/repo-inspection/SKILL.md`
- `skills/dreamlabs-specific/atomic/webtoon-maker/SKILL.md`

### Google Drive 자료

Drive folder: `https://drive.google.com/drive/u/1/folders/1ifLF1DaDMbzf9KLRbCl9-v7wiygBXXx3`

확인한 주요 구성:

- `교육자료/`
  - `AI_webtoon_production_training_v0.1.pdf`
  - `AI_webtoon_production_training_v0.1.pptx`
  - `README_PACKAGE.md`
  - `html/index.html`
  - `html/modules.html`
  - `html/workbook.html`
  - `html/source-package.html`
  - `html/qa-checklist.html`
  - `source_docs/`
- `캐릭터시트/`
  - 캐릭터 기준 이미지 5개
- 웹툰/캐릭터 이미지 10개
- `mobile-first-webtoon-production-skill-v0.1.md`

주의: `README_PACKAGE.md` 기준으로 교육자료는 `초안 작성 완료` 상태이며, 실제 강의 운영 반영, 최신 AI 도구 기능/요금/약관 검증, 저작권/초상권/disclosure 법률 검토는 미수행 상태다. 따라서 초기 공개 페이지에서는 원본 전체 공개보다 교육 흐름 소개와 신청 전 안내 중심으로 다룬다.

## 정보 구조

현재 메뉴 구조를 다음처럼 확장한다.

```text
작가모집 /creators
├─ 모집 안내
├─ 교육자료 /creators/training
│  ├─ AI 웹툰 제작 워크플로우
│  ├─ 8개 모듈 커리큘럼
│  ├─ 수강생 워크북
│  ├─ Source Package
│  └─ QA 체크리스트
└─ 작가신청
```

`/creators` 페이지에는 `교육자료 보기` CTA를 추가한다. `/creators/training` 페이지에는 `작가신청하기`, `커리큘럼 보기`, `워크북 보기` CTA를 둔다.

## 페이지 포지셔닝

핵심 메시지:

> AI로 그림 한 장을 만드는 법이 아니라, 같은 캐릭터와 세계관으로 한 편을 완성하고 다음 화까지 이어 만드는 제작 흐름을 배웁니다.

이 페이지는 다음 세 사용자를 대상으로 한다.

| 대상 | 니즈 | 페이지 역할 |
|---|---|---|
| 예비 작가 | AI 웹툰 제작을 어디서 시작할지 모름 | 제작 흐름과 산출물을 보여준다 |
| 기획/스토리형 지원자 | 그림 실력보다 기획력이 강함 | 기획서, storyboard, instruction sheet를 지원 기준으로 제시한다 |
| 기존 AI 이미지 사용자 | 단발 이미지에서 연재로 넘어가고 싶음 | 캐릭터 고정, QA, source package 필요성을 설명한다 |

## 권장 페이지 구성

### 1. Hero

- Eyebrow: `작가모집 교육자료`
- H1: `AI 웹툰 제작 교육자료`
- Body: `AI 이미지 생성이 아니라 연재 가능한 웹툰 제작 흐름을 배웁니다. 기준선, 캐릭터 고정, 컷 분해, QA, source package까지 작가 지원자가 알아야 할 제작 단계를 정리합니다.`
- CTA:
  - `커리큘럼 보기`
  - `워크북 보기`
  - `작가신청하기`

### 2. 교육 핵심 4원칙

Drive `html/index.html`과 `mobile-first-webtoon-production-skill-v0.1.md`의 핵심을 다음 4개로 정리한다.

| 원칙 | 설명 |
|---|---|
| 기준선 우선 | 캐릭터 이름이나 프롬프트보다 character sheet, registry, style guide, 금지 변형을 먼저 고정한다 |
| 이야기 분해 | 소재를 바로 이미지로 보내지 않고 synopsis, scene, beat, panel, 컷별 instruction으로 나눈다 |
| 생성과 편집 분리 | 이미지는 source로 생성하고 말풍선, 대사, 여백, scroll rhythm은 편집 단계에서 완성한다 |
| 실패를 자산화 | 얼굴 변화, 복장 누락, 인원수 오류, 방향 오류를 QA와 수정 이력으로 남긴다 |

### 3. 8개 모듈 커리큘럼

Drive `html/modules.html` 기준으로 다음을 노출한다.

| Module | 학습 목표 | 결과물 |
|---|---|---|
| 1. 실제 구조 | AI 이미지 생성과 웹툰 production을 구분 | 작품 유형 정의서, pipeline map |
| 2. 작품 기획 | 작품 기준선과 세계관 범위 작성 | 1페이지 기획서, 세계관 기준표 |
| 3. 캐릭터 고정 | character sheet와 identity checklist 작성 | 주인공/보조 character sheet |
| 4. 컷 분해 | 소재를 scene, beat, panel로 분해 | 10컷 storyboard |
| 5. 이미지 instruction | 공통 block과 컷별 variable block 분리 | 컷별 instruction 10개 |
| 6. QA와 수정 | 오류 분류와 재생성 범위 판단 | QA checklist, 수정 이력 |
| 7. 모바일 편집 | 이미지를 세로 scroll 웹툰으로 편집 | 완성 episode 1편 |
| 8. Source package | 다음 episode 제작용 asset 정리 | 재사용 package, teaser |

예상 시간은 Drive 자료에 있지만 운영 추론값이므로, 공개 페이지에서는 시간표를 확정값처럼 강조하지 않는다. 필요하면 `운영 예시`로 표기한다.

### 4. Workbook

Drive `html/workbook.html`의 워크북을 웹 페이지 안에서 미리보기 형태로 제공한다.

주요 템플릿:

- 작품 기획서
  - 작품명
  - 한 줄 설명
  - 대상 독자
  - 장르/tone
  - episode당 컷 수
  - 실제 경험 기반 여부: `Confirmed / Inference / Fiction`
  - 공개 채널
- Character Brief
  - 얼굴
  - 헤어
  - 연령
  - 체형
  - 복장
  - 소품
  - 표정 범위
  - 고정값/허용 변형/금지 변형
- Storyboard
  - 컷 번호
  - 목적
  - 등장인물
  - 행동/표정
  - shot
  - 대사
  - 다음 컷 연결
- 컷별 Instruction Sheet
  - Common character block
  - Panel variable block
  - Negative constraints

초기 구현은 입력 가능한 양식이 아니라 읽기 전용 템플릿으로 충분하다. 이후 작가신청 폼과 연동할 때 작성/저장 기능을 붙인다.

### 5. Source Package

Drive `html/source-package.html`, `source_docs/00_BASELINE.md`, `source_docs/01_CHARACTER_USAGE_RULES.md`, `source_docs/03_PROJECT_UPLOAD_GUIDE.md`를 기반으로 구성한다.

설명해야 할 핵심:

- Source package는 다음 episode를 만들기 위한 재사용 기준이다.
- 캐릭터 기준선은 파일명/registry 기준으로 관리한다.
- character sheet는 연도별 외형과 복장 기준을 고정한다.
- 기준 문서와 작업 문서는 분리한다.
- 기존 기준선을 교체할 때는 기존 파일 삭제가 아니라 새 버전을 추가한다.

초기 공개 페이지에서는 Drive 원본의 character sheet gallery 전체를 그대로 노출하지 않는다. 이미지 권리/초상/공개 범위가 확정되기 전까지는 예시 썸네일 1~4장 또는 설명 중심으로 제한한다.

### 6. QA 체크리스트

Drive `html/qa-checklist.html`과 `mobile-first-webtoon-production-skill-v0.1.md`의 QA 항목을 통합한다.

노출 항목:

- 캐릭터 동일성
  - 얼굴 윤곽, 눈매, 인상 유지
  - episode 연도와 연령대 일치
  - 체형/키 비율 유지
  - 헤어/복장/소품 누락 여부
- Continuity
  - 전 컷과 다음 컷의 위치 관계
  - 시선 방향
  - 오른손/왼손, 차량 방향, 텐트 위치 반전 여부
  - 시간대/조명 변화
  - 대사와 행동 충돌 여부
- 모바일 가독성
  - 컷당 9:16 기준
  - 1컷 1메시지
  - 말풍선은 짧고 명확
  - 한 화면 정보 과밀 방지
- 게시 준비
  - 모바일 preview 확인
  - 권리/개인정보 검토
  - AI 사용 disclosure 확인

## 콘텐츠 공개 정책

초기 공개 범위는 `소개/요약형 공개`가 적합하다.

| 자료 | 초기 공개 | 이유 |
|---|---|---|
| 8개 모듈 커리큘럼 | 공개 | 작가 지원 전 이해에 필요 |
| Workbook 템플릿 | 공개 | 지원자의 준비 수준을 높임 |
| QA 체크리스트 | 공개 | 플랫폼 품질 기준 전달 |
| PDF | 제한 공개 또는 신청 후 제공 | 교육자료 초안이며 법률/도구 정책 검증 미완료 |
| PPTX | 비공개 | 강사용 원본이므로 외부 배포보다 내부 운영용 |
| Source docs 원문 | 제한 공개 | 캐릭터 asset과 운영 기준이 포함됨 |
| Character sheet 이미지 전체 | 제한 공개 | 권리/공개 범위 검토 전 전체 노출 비추천 |

## UX 흐름

```text
/creators
  -> 교육자료 보기
  -> /creators/training
  -> 커리큘럼 이해
  -> 워크북으로 제출 준비 항목 확인
  -> QA 기준 확인
  -> 작가신청하기
```

권장 CTA 배치:

- Hero 하단: `작가신청하기`
- Curriculum 섹션 하단: `워크북 보기`
- Workbook 섹션 하단: `작가신청하기`
- QA 섹션 하단: `작가모집으로 돌아가기`

## 구현 설계

### 라우팅

현재 SPA 라우터는 `assets/js/app.js`에서 path 기반으로 페이지를 렌더링한다. 다음 항목을 추가한다.

- route name: `creatorTraining`
- path: `/creators/training`
- title: `AI 웹툰 제작 교육자료 | WCAMPER Webtoon`
- description: `작가 지원자를 위한 AI 웹툰 제작 커리큘럼, 워크북, source package, QA 체크리스트 안내`

`scripts/generate-static-pages.js`에도 정적 생성 route를 추가한다.

### Navigation

상단 주요 메뉴를 늘리기보다 `/creators` 페이지 내부 CTA와 섹션 링크로 연결한다. 상단 메뉴가 과밀해지는 것을 피하고, 교육자료가 작가모집의 하위 맥락임을 유지하기 위해서다.

모바일에서는 `/creators` 하단 또는 hero 직후에 `교육자료` 버튼을 배치한다.

### Component Structure

`assets/js/app.js`에 `renderCreatorTrainingPage()`를 추가한다.

섹션 구성:

```text
renderCreatorTrainingPage
├─ hero
├─ training principles
├─ curriculum table/cards
├─ workbook templates
├─ source package overview
├─ QA checklist
└─ final CTA
```

데이터가 많아지면 `const trainingModules = [...]`, `const workbookTemplates = [...]` 같은 정적 배열로 분리한다.

### Static Assets

초기 구현은 Drive 원본을 iframe/embed하지 않는다. Drive 직접 embed는 권한, 로딩, UI 노출, 추적/캐시 제어 문제가 있다.

권장 방식:

```text
assets/creator-training/
├─ docs/
│  └─ ai-webtoon-production-training-v0.1.pdf
└─ images/
   └─ approved-preview-*.png
```

단, PDF와 character sheet 이미지는 공개 승인 후 repo asset으로 반영한다. 승인 전에는 텍스트 요약만 구현한다.

### CSS

기존 사이트 톤을 유지한다. 별도 랜딩처럼 과도한 hero를 만들지 않고 작가모집의 확장 페이지로 설계한다.

필요 클래스 예시:

- `.training-hero`
- `.training-principles`
- `.training-module-grid`
- `.training-workbook`
- `.training-checklist`
- `.training-cta-band`

## 데이터/운영 설계

초기 정적 MVP:

- 페이지 내용은 `assets/js/app.js` 정적 데이터로 관리한다.
- PDF/PPTX 원본 다운로드는 제공하지 않거나, 승인 후 PDF만 제공한다.
- 작가신청 CTA는 기존 `/creators` 또는 인증 흐름으로 연결한다.

운영 확장:

- 교육자료 버전: `v0.1`, `v0.2` 등으로 관리한다.
- 최신 AI 도구 정책 검증 일자를 페이지 하단에 표시한다.
- 법률/권리 검토 완료 전에는 `초안`, `내부 검토중`, `공개 가능` 상태를 분리한다.
- 작가신청 폼에 `교육자료 확인 여부`, `워크북 작성 여부`, `샘플 컷 제출 여부`를 연결한다.

## 품질 기준

페이지 구현 후 확인할 항목:

- `/creators`에서 `/creators/training`으로 진입 가능
- `/creators/training` 직접 접근 시 200 응답
- 정적 생성 결과에 meta title/description 반영
- 모바일에서 curriculum table이 깨지지 않음
- CTA가 인증/작가신청 흐름과 충돌하지 않음
- Drive 비공개 URL이나 권한이 필요한 asset을 운영 HTML에 직접 노출하지 않음
- PDF/PPTX 공개 여부가 승인 상태와 일치

## 리스크와 결정 필요 항목

| 항목 | 리스크 | 권장 결정 |
|---|---|---|
| PDF 공개 | 초안, 도구 정책/법률 검증 미완료 | 초기에는 요약만 공개하고 PDF는 승인 후 공개 |
| PPTX 공개 | 강사용 원본 유출 가능 | 비공개 유지 |
| 캐릭터 이미지 전체 공개 | 권리/초상/캐릭터 기준 노출 범위 미확정 | 승인된 preview만 노출 |
| Source docs 원문 공개 | 내부 제작 기준 과다 노출 | 페이지에는 요약, 원문은 내부 관리 |
| Drive embed | 권한/로딩/외부 UI 문제 | repo asset 또는 텍스트 요약 사용 |

## 구현 순서

1. `/creators/training` 라우트와 정적 생성 route 추가
2. `/creators` 페이지에 `교육자료 보기` CTA 추가
3. 교육자료 페이지 텍스트 섹션 구현
4. 모바일/데스크톱 CSS 보강
5. `npm run build` 검증
6. 승인된 PDF 또는 preview asset만 별도 반영

## 결론

`작가모집` 메뉴의 교육자료는 독립 하위 페이지 `/creators/training`으로 구성하는 것이 적합하다. 초기 공개는 교육자료 원본 전체 배포보다 `커리큘럼 + 워크북 + Source Package 개념 + QA 기준` 중심의 요약 페이지로 시작한다. PDF, PPTX, 캐릭터 시트 전체 공개는 최신 도구 정책과 권리 검토가 끝난 뒤 단계적으로 반영한다.
