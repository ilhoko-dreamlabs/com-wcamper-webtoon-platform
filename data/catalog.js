const panelImage = (season, number) =>
  `assets/img/drive/season-${season}/s${season}-${String(number).padStart(2, "0")}.png`;

const season2DriveImage = (filename) => `assets/img/drive/season-2/${filename}`;

const bdCrewPanels = [
  {
    beat: "오프닝",
    caption: "새로운 차량 검사와 즐거운 만남으로 BD-Crew 단톡방 시즌이 열린다.",
    dialogue: "BD-Crew: 오늘도 출발 전 점검부터."
  },
  {
    beat: "아침 회의",
    caption: "웹툰 팀의 행복한 아침 회의가 캠핑 일정과 맞물린다.",
    dialogue: "봉달캠퍼: 회의도 캠핑처럼 역할 분담이 먼저죠."
  },
  {
    beat: "제작 모임",
    caption: "웹툰 제작 모임과 함께한 하루가 크루의 기록으로 남는다.",
    dialogue: "BD-Crew: 오늘 장면은 바로 업로드 갑시다."
  },
  {
    beat: "합동 캠핑",
    caption: "첫 합동 캠핑 대모험에서 각자의 장비와 농담이 한 자리에 모인다.",
    dialogue: "부라보: 이 정도면 대모험 맞습니다."
  },
  {
    beat: "먹거리",
    caption: "캠핑 이야기, 모임, 음식들이 단톡방의 속도를 올린다.",
    dialogue: "BD-Crew: 사진보다 먼저 젓가락이 나갔는데요?"
  },
  {
    beat: "아침 인사",
    caption: "따뜻한 아침 인사가 밤새 이어진 대화를 정리한다.",
    dialogue: "봉달캠퍼: 좋은 아침입니다. 커피부터 갑시다."
  },
  {
    beat: "꿈꾸는 크루",
    caption: "함께 꿈꾸는 캠핑 프로그래머들이 다음 장면을 상상한다.",
    dialogue: "BD-Crew: 캠핑도 개발도 결국 배포가 중요하죠."
  },
  {
    beat: "우정",
    caption: "축구와 우정, 일상 웹툰의 가벼운 리듬이 들어온다.",
    dialogue: "BD-Crew: 오늘의 MVP는 공보다 텐트팩입니다."
  },
  {
    beat: "금요일",
    caption: "금요일의 웹툰 이야기가 다음 업로드 기대감을 만든다.",
    dialogue: "봉달캠퍼: 금요일엔 한 컷이라도 올려야죠."
  },
  {
    beat: "따뜻한 하루",
    caption: "캠핑에서의 따뜻한 하루가 시즌의 정서를 잡는다.",
    dialogue: "BD-Crew: 장비보다 오래 남는 건 이 분위기네요."
  },
  {
    beat: "인터뷰",
    caption: "BD-Crew Weekly 독도인별 인터뷰가 캐릭터의 목소리를 더한다.",
    dialogue: "독도인별: 기록은 결국 사람 표정을 남기는 일이에요."
  },
  {
    beat: "일상",
    caption: "캠핑과 함께한 BD-Crew 일상이 시즌의 중심으로 이어진다.",
    dialogue: "BD-Crew: 별일 없는 날이 제일 웹툰 같을 때가 있죠."
  },
  {
    beat: "주의 환기",
    caption: "공무원 사칭 사기 경고가 단톡방의 현실감을 남기며 회차를 닫는다.",
    dialogue: "봉달캠퍼: 좋은 정보도 같이 공유해야 크루죠."
  }
];

const bravoCampCover = season2DriveImage("BRAVOCAMP-WEBTOON-작품페이지.png");
const bdCrewEpisodeThumbnail = (number) =>
  `assets/img/thumbnails/bd-crew-episode-${String(number).padStart(2, "0")}-thumbnail.webp`;
const bravoCampThumbnail = "assets/img/thumbnails/bravo-camp-thumbnail.webp";
const bravoCampEpisodeThumbnail = (number) =>
  `assets/img/thumbnails/bravo-camp-episode-${String(number).padStart(2, "0")}-thumbnail.webp`;

const bravoCampPanels = [
  {
    title: "부라보캠프 첫 소개",
    beat: "부라보캠프 첫 소개",
    caption: "부라보캠프 시즌 2의 전체 캐릭터 로스터와 자기소개를 이어서 보여주는 첫 회차.",
    dialogue: "부라보캠프: 전체 멤버부터 정리하고 자기소개까지 갑니다.",
    sourceFilename: "BRAVOCAMP-WEBTOON-20260708-EP001-2-부라보캠프_전체_캐릭터_그리드.png / BRAVOCAMP-WEBTOON-20260708-EP001-3-부라보캠프_자기소개_타임.png",
    image: season2DriveImage("BRAVOCAMP-WEBTOON-20260708-EP001-2-부라보캠프_전체_캐릭터_그리드.png"),
    thumbnail: bravoCampEpisodeThumbnail(1),
    panels: [
      {
        beat: "전체 캐릭터 그리드",
        caption: "부라보캠프 시즌 2의 전체 캐릭터 로스터를 한눈에 보여준다.",
        dialogue: "부라보캠프: 전체 멤버부터 정리하고 갑니다.",
        sourceFilename: "BRAVOCAMP-WEBTOON-20260708-EP001-2-부라보캠프_전체_캐릭터_그리드.png",
        image: season2DriveImage("BRAVOCAMP-WEBTOON-20260708-EP001-2-부라보캠프_전체_캐릭터_그리드.png")
      },
      {
        beat: "자기소개 타임",
        caption: "부라보tv가 캠핑장 멤버들을 한 명씩 소개하며 시즌 2의 단톡방 톤을 연다.",
        dialogue: "부라보tv: 멤버로 부라보캠프 웹툰, 이제 시작합니다!",
        sourceFilename: "BRAVOCAMP-WEBTOON-20260708-EP001-3-부라보캠프_자기소개_타임.png",
        image: season2DriveImage("BRAVOCAMP-WEBTOON-20260708-EP001-3-부라보캠프_자기소개_타임.png")
      }
    ]
  },
  {
    title: "워킹데드",
    beat: "워킹데드",
    caption: "캠핑장의 농담이 좀비극 상상으로 번지며 부라보캠프식 코미디 장면을 만든다.",
    dialogue: "부라보캠프: 부라보캠프 단편 좀비극 - 워킹데드",
    sourceFilename: "BRAVOCAMP-WEBTOON-20260708-EP002-워킹데드.png.png",
    image: season2DriveImage("BRAVOCAMP-WEBTOON-20260708-EP002-워킹데드.png.png"),
    thumbnail: bravoCampEpisodeThumbnail(2)
  },
  {
    title: "데쓰노트",
    beat: "데쓰노트",
    caption: "수다방 평화 유지를 위해 데쓰노트를 꺼내는 장난스러운 캠핑 단톡방 회차.",
    dialogue: "부라보캠프: 수다방의 평화는 계속됩니다!",
    sourceFilename: "BRAVOCAMP-WEBTOON-20260708-EP003-데쓰노트.png",
    image: season2DriveImage("BRAVOCAMP-WEBTOON-20260708-EP003-데쓰노트.png"),
    thumbnail: bravoCampEpisodeThumbnail(3)
  }
];

const createSingleImageEpisode = ({
  seriesId,
  season,
  number,
  sourceFolder,
  likes,
  publishedAt = "2026-07-09"
}) => {
  const panel = season === 1 ? bdCrewPanels[number - 1] : bravoCampPanels[number - 1];
  const episodePanels = panel.panels || [panel];
  const image = panel.image || episodePanels[0].image || panelImage(season, number);
  const panelCount = episodePanels.length;
  return {
    id: `2026-07-09-season-${season}-${String(number).padStart(2, "0")}`,
    seriesId,
    number,
    title: panel.title || panel.beat,
    publishedAt,
    status: "공개",
    thumbnail: panel.thumbnail || (season === 1 ? bdCrewEpisodeThumbnail(number) : image),
    summary: panel.caption,
    readTime: "1분",
    likes: String(likes),
    completionRate: "집계중",
    production: {
      disclosure: `Google Drive 원본 이미지 ${panelCount}장을 1회차로 공개 게시`,
      review: panel.sourceFilename ? `Drive 파일명 기준 배치: ${panel.sourceFilename}` : "공개 가능 이미지 확인 및 정적 사이트 연결 완료",
      sourceFilename: panel.sourceFilename,
      panelCount
    },
    sourceFolder,
    panels: episodePanels.map((episodePanel) => ({
      image: episodePanel.image || image,
      beat: episodePanel.beat,
      shot: "세로 컷",
      caption: episodePanel.caption,
      dialogue: episodePanel.dialogue,
      sourceFilename: episodePanel.sourceFilename
    }))
  };
};

const bdCrewEpisodeIds = bdCrewPanels.map((_, index) =>
  `2026-07-09-season-1-${String(index + 1).padStart(2, "0")}`
);

const bravoCampEpisodeIds = bravoCampPanels.map((_, index) =>
  `2026-07-09-season-2-${String(index + 1).padStart(2, "0")}`
);

window.WCAMPER_WEBTOON = {
  series: [
    {
      id: "bd-crew-chat-season-1",
      authorId: "bongdal-universe-comics",
      title: "BD-Crew 단톡방",
      status: "공개 연재",
      summary: "BD-Crew의 캠핑, 차량, 웹툰 제작, 일상 대화가 단톡방처럼 이어지는 봉달캠퍼 유니버스 시즌 1.",
      cover: panelImage(1, 1),
      thumbnail: bdCrewEpisodeThumbnail(1),
      tags: ["캠핑", "BD-Crew", "단톡방", "일상 코미디"],
      schedule: "시즌 1 공개중",
      ageRating: "전체 이용가",
      stats: {
        likes: "312",
        views: "5.8천",
        favorites: "146"
      },
      highlights: [
        "Google Drive 원본 이미지 13장을 각 1회차로 분리 공개",
        "캠핑, 차량 점검, 아침 회의, 웹툰 제작 모임을 짧은 단독 회차로 연결",
        "봉달캠퍼 유니버스 코믹스 작가 프로필 기준으로 공개 연재 편성"
      ],
      episodes: bdCrewEpisodeIds
    },
    {
      id: "bravo-camp-chat-season-2",
      authorId: "bongdal-universe-comics",
      title: "부라보캠프 단톡방",
      status: "공개 연재",
      summary: "부라보캠프 멤버들이 캠핑장에서 주고받는 밝은 리액션과 소동을 짧은 컷으로 묶은 시즌 2.",
      cover: bravoCampCover,
      thumbnail: bravoCampThumbnail,
      tags: ["부라보캠프", "캠핑", "단톡방", "시즌 2"],
      schedule: "시즌 2 공개중",
      ageRating: "전체 이용가",
      stats: {
        likes: "94",
        views: "1.7천",
        favorites: "52"
      },
      highlights: [
        "Google Drive 원본 파일명 기준으로 작품페이지 1장과 공개 회차 3장을 분리 배치",
        "EP001-2, EP001-3 이미지는 1화 안에서 연속 스크롤로 노출",
        "시즌 1과 같은 유니버스 안에서 별도 단톡방 톤으로 전개",
        "짧은 모바일 스크롤에 맞춘 이미지 회차 편성"
      ],
      episodes: bravoCampEpisodeIds
    },
    {
      id: "bongbong-family-camping",
      authorId: "bongdal-universe-comics",
      title: "봉봉패미리 캠핑",
      status: "기획중",
      summary: "가족 캠핑의 작은 준비와 현장 리듬을 봉봉패미리 중심으로 풀어낼 예정작.",
      cover: "assets/img/hero-panel-3.svg",
      tags: ["봉봉패미리", "가족 캠핑", "기획중"],
      schedule: "기획 정리중",
      ageRating: "전체 이용가",
      stats: {
        likes: "예정",
        views: "예정",
        favorites: "예정"
      },
      highlights: [
        "캐릭터와 회차 구조 기획중",
        "공개 연재 시즌 1, 2 반응을 보고 편성",
        "가족 캠핑과 생활형 코미디 중심"
      ],
      episodes: ["2026-07-23-bongbong-family-planning"]
    }
  ],
  authors: [
    {
      id: "bongdal-universe-comics",
      name: "봉달캠퍼 유니버스 코믹스",
      title: "캠핑 단톡방 유니버스 작가",
      avatar: "BU",
      image: "assets/img/authors/bongdal-universe-comics-logo.png",
      bio: "캠핑 크루와 가족, 모임의 대화를 웹툰 컷으로 엮어 공개 연재하는 봉달캠퍼 기반 코믹스 레이블입니다.",
      debut: "2026년 WCAMPER Webtoon 공개연재",
      keywords: ["캠핑 유니버스", "단톡방 코미디", "크루 일상", "공개 연재"],
      links: [
        { label: "시즌 1", href: "#episodes" },
        { label: "시즌 2", href: "#episodes" }
      ],
      works: [
        {
          title: "BD-Crew 단톡방",
          status: "공개 연재 시즌 1",
          description: "BD-Crew의 캠핑과 제작 모임, 차량 점검, 아침 인사를 이미지별 단독 회차로 공개한 메인 시즌.",
          meta: "13화 공개"
        },
        {
          title: "부라보캠프 단톡방",
          status: "공개 연재 시즌 2",
          description: "부라보캠프의 캐릭터 소개, 워킹데드, 데쓰노트 에피소드를 Drive 파일명 기준으로 구성한 두 번째 시즌.",
          meta: "3화 공개"
        },
        {
          title: "봉봉패미리 캠핑",
          status: "기획중",
          description: "가족 캠핑의 준비, 이동, 현장 대화를 중심으로 확장할 봉달캠퍼 유니버스 예정작.",
          meta: "기획 개발"
        }
      ]
    }
  ],
  crew: [
    {
      name: "봉달캠퍼",
      role: "유니버스 진행자",
      description: "크루와 가족, 캠핑 모임을 연결하는 중심 인물. 단톡방의 흐름을 현장 이야기로 바꾼다."
    },
    {
      name: "BD-Crew",
      role: "시즌 1 메인 크루",
      description: "캠핑 준비, 차량 점검, 웹툰 제작 회의까지 여러 일상 에피소드를 함께 만든다."
    },
    {
      name: "부라보캠프",
      role: "시즌 2 메인 크루",
      description: "밝은 반응과 빠른 농담으로 캠핑장의 작은 사건을 가볍게 밀어 올린다."
    },
    {
      name: "봉봉패미리",
      role: "기획중 가족 라인",
      description: "가족 캠핑의 준비와 생활형 장면을 담당할 다음 유니버스 후보."
    }
  ],
  episodes: [
    ...bdCrewPanels.map((_, index) => createSingleImageEpisode({
      seriesId: "bd-crew-chat-season-1",
      season: 1,
      number: index + 1,
      sourceFolder: "https://drive.google.com/drive/u/1/folders/1GOzAIjrGRVsMAeaF5eam25zVKZ-Ba2ar",
      likes: 86 - index
    })),
    ...bravoCampPanels.map((_, index) => createSingleImageEpisode({
      seriesId: "bravo-camp-chat-season-2",
      season: 2,
      number: index + 1,
      sourceFolder: "https://drive.google.com/drive/u/1/folders/1ZJJXx_JAFD-CQPNzvKEbtakCzScTnopo",
      likes: 39 - index
    })),
    {
      id: "2026-07-23-bongbong-family-planning",
      seriesId: "bongbong-family-camping",
      number: 1,
      title: "기획중 - 봉봉패미리 캠핑",
      publishedAt: "2026-07-23",
      status: "기획중",
      thumbnail: "assets/img/hero-panel-3.svg",
      summary: "봉봉패미리 캠핑은 캐릭터와 첫 에피소드 구조를 기획중입니다.",
      readTime: "예정",
      likes: "예정",
      panels: []
    }
  ],
  notes: [
    {
      title: "Drive 원본 공개 반영",
      body: "시즌 1 BD-Crew 단톡방 13장과 시즌 2 부라보캠프 단톡방 4장을 Google Drive 파일명 기준으로 연결했습니다. 시즌 2는 EP001-2, EP001-3 두 이미지를 1화에 함께 배치하고, 작품페이지 이미지는 작품 표지로 분리했습니다.",
      meta: "2026.07.09 업데이트"
    },
    {
      title: "작가 프로필",
      body: "작가명은 봉달캠퍼 유니버스 코믹스로 통일하고, 공개연재 시즌 1, 시즌 2, 기획중 작품을 같은 레이블 안에 배치했습니다.",
      meta: "작가/작품 편성"
    },
    {
      title: "다음 기획",
      body: "봉봉패미리 캠핑은 시즌 1, 2 반응을 확인한 뒤 가족 캠핑 중심의 회차 구조와 캐릭터 톤을 확정합니다.",
      meta: "기획중"
    }
  ],
  feedback: {
    authProvider: {
      name: "WCAMPER 통합인증",
      loginUrl: "https://auth.wcamper.com/login",
      description: "인증 회원 피드백은 auth.wcamper.com 계정과 연결해 작성자 신뢰도, 반복 참여, 신고 이력을 스코어링에 반영합니다."
    },
    scoring: {
      anonymousWeight: 0.35,
      memberWeight: 1,
      signals: ["공감", "완독", "재방문", "신고", "운영자 검수"],
      note: "익명 피드백은 초반 반응 수집에 쓰고, 인증 회원 피드백은 작가/작품/회차 점수의 주 신호로 사용합니다."
    },
    targets: [
      {
        id: "author-bongdal-universe-comics",
        type: "author",
        label: "작가",
        title: "봉달캠퍼 유니버스 코믹스",
        prompt: "작가의 유니버스, 단톡방 톤, 시즌 확장에 대한 의견",
        score: 90,
        anonymousCount: 16,
        memberCount: 11,
        samples: [
          { mode: "member", body: "캠핑 단톡방처럼 읽혀서 연재 콘셉트가 명확합니다." },
          { mode: "anonymous", body: "시즌별 캐릭터 소개가 조금 더 있으면 좋겠습니다." }
        ]
      },
      {
        id: "series-bd-crew-chat-season-1",
        type: "series",
        label: "작품",
        title: "BD-Crew 단톡방",
        prompt: "시즌 1의 컷 흐름, 캠핑 정서, 다음 화 기대감에 대한 의견",
        score: 88,
        anonymousCount: 24,
        memberCount: 13,
        samples: [
          { mode: "member", body: "실제 이미지가 들어오니 사이트가 연재물처럼 보입니다." },
          { mode: "anonymous", body: "컷 사이에 짧은 대사가 붙어서 읽기 편합니다." }
        ]
      },
      {
        id: "series-bravo-camp-chat-season-2",
        type: "series",
        label: "작품",
        title: "부라보캠프 단톡방",
        prompt: "시즌 2의 짧은 회차감, 리액션, 캐릭터 톤에 대한 의견",
        score: 81,
        anonymousCount: 9,
        memberCount: 5,
        samples: [
          { mode: "member", body: "시즌 1과 구분되는 빠른 톤이 좋습니다." },
          { mode: "anonymous", body: "다음 회차에는 컷 수가 조금 더 늘면 좋겠습니다." }
        ]
      }
    ]
  },
  goals: {
    summary: {
      title: "공개연재 운영 목표",
      description: "Drive 원본 컷을 실제 사이트에 연결한 뒤, 시즌별 조회, 완독, 피드백을 분리해 다음 기획과 공개 우선순위를 판단합니다.",
      scoringLink: "시즌별 반응은 공개 뱃지와 내부 편성 점수로 분리해 사용합니다."
    },
    rules: [
      "목표는 작가, 작품, 회차 단위로 설정한다.",
      "방문/조회/완독/피드백 이벤트가 백그라운드에서 목표 진행률을 갱신한다.",
      "인증 회원의 달성 기여도는 익명 사용자보다 높은 신뢰도로 반영한다.",
      "달성 여부는 공개 숫자보다 단계, 뱃지, 운영자 리포트로 먼저 노출한다."
    ],
    items: [
      {
        id: "goal-author-universe-feedback",
        targetType: "author",
        targetLabel: "작가",
        targetTitle: "봉달캠퍼 유니버스 코믹스",
        title: "유니버스 톤 검증",
        metric: "인증 회원 작가 피드백",
        current: 11,
        target: 15,
        unit: "건",
        status: "진행중",
        due: "2026-07-31",
        events: ["author_page_view", "feedback_created", "feedback_reacted"],
        achievement: "유니버스 연재 유지 기준"
      },
      {
        id: "goal-season-1-readers",
        targetType: "series",
        targetLabel: "작품",
        targetTitle: "BD-Crew 단톡방",
        title: "시즌 1 관심 전환",
        metric: "관심 등록",
        current: 146,
        target: 200,
        unit: "명",
        status: "진행중",
        due: "2026-08-01",
        events: ["series_view", "favorite_added", "return_visit"],
        achievement: "시즌 1 추가 회차 제작 기준"
      },
      {
        id: "goal-season-2-completion",
        targetType: "episode",
        targetLabel: "회차",
        targetTitle: "부라보캠프 단톡방 1화",
        title: "시즌 2 완독 확인",
        metric: "완독률",
        current: 0,
        target: 65,
        unit: "%",
        status: "집계중",
        due: "2026-07-31",
        events: ["episode_view", "panel_impression", "episode_complete"],
        achievement: "부라보캠프 추가 편성 후보"
      }
    ]
  }
};
