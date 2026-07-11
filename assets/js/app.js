(function () {
  const data = window.WCAMPER_WEBTOON;
  const main = document.querySelector("#main");
  const siteOrigin = "https://webtoon.wcamper.com";
  const defaultOgImage = "assets/img/thumbnails/bd-crew-episode-01-thumbnail.webp";
  const homeMainImage = "assets/img/home/wcamper-home-main-20260709.png";
  const homeMainVideo = "assets/video/home/wcamper-home-main-20260710.mp4";
  const authConfig = data.feedback.authProvider;
  const authState = {
    checked: false,
    authenticated: false,
    profileComplete: false,
    user: null,
    author: null,
    authorApplication: null
  };
  const creatorState = {
    loaded: false,
    loading: false,
    author: null,
    profile: null,
    summary: null,
    series: [],
    episodesBySeries: {},
    episodeImagesByEpisode: {},
    error: null
  };
  const publicSettings = {
    checked: false,
    values: {
      "creatorApplications.enabled": true,
      "feedback.enabled": true,
      "feedback.moderationMode": "post",
      "creatorTraining.visible": true,
      siteNotice: null,
      maintenanceBanner: null,
      "partnership.enabled": true
    }
  };

  const pathForAuthor = (author) => `/@${author.id}`;
  const pathForSeries = (series) => {
    const author = getAuthor(series.authorId);
    return `${pathForAuthor(author)}/works/${series.id}`;
  };
  const pathForEpisode = (episode) => {
    const series = getSeries(episode.seriesId);
    return `${pathForSeries(series)}/episodes/${episode.number}`;
  };

  function getSeries(id) {
    return data.series.find((series) => series.id === id);
  }

  function getAuthor(id) {
    return data.authors.find((author) => author.id === id);
  }

  function getEpisodesForSeries(seriesId) {
    const series = getSeries(seriesId);
    if (!series) return [];
    return series.episodes
      .map((id) => data.episodes.find((episode) => episode.id === id))
      .filter(Boolean);
  }

  function getPublishedEpisodes() {
    return data.episodes
      .filter((episode) => episode.status === "공개")
      .slice()
      .sort((a, b) => `${b.publishedAt}-${b.number}`.localeCompare(`${a.publishedAt}-${a.number}`));
  }

  function firstPanelImage(episode) {
    return episode.panels && episode.panels[0] && episode.panels[0].image;
  }

  function absoluteUrl(path) {
    return `${siteOrigin}${path}`;
  }

  function absoluteAssetUrl(assetPath) {
    if (!assetPath) return absoluteAssetUrl(defaultOgImage);
    if (/^https?:\/\//.test(assetPath)) return assetPath;
    const cleanPath = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
    return encodeURI(`${siteOrigin}${cleanPath}`);
  }

  function setMetaAttribute(selector, attribute, value) {
    let meta = document.head.querySelector(selector);
    if (!meta) {
      meta = document.createElement("meta");
      const propertyMatch = selector.match(/meta\[property="([^"]+)"\]/);
      const nameMatch = selector.match(/meta\[name="([^"]+)"\]/);
      if (propertyMatch) meta.setAttribute("property", propertyMatch[1]);
      if (nameMatch) meta.setAttribute("name", nameMatch[1]);
      document.head.append(meta);
    }
    meta.setAttribute(attribute, value);
  }

  function setCanonical(url) {
    let linkElement = document.head.querySelector('link[rel="canonical"]');
    if (!linkElement) {
      linkElement = document.createElement("link");
      linkElement.setAttribute("rel", "canonical");
      document.head.append(linkElement);
    }
    linkElement.setAttribute("href", url);
  }

  function getRouteMeta(route) {
    if (route.name === "author") {
      const author = getAuthor(route.authorId);
      if (author) {
        return {
          title: `${author.name} | WCAMPER Webtoon`,
          description: author.bio,
          image: author.image || defaultOgImage,
          path: pathForAuthor(author),
          type: "profile"
        };
      }
    }

    if (route.name === "series") {
      const series = getSeries(route.seriesId);
      const author = getAuthor(route.authorId);
      if (author && series && series.authorId === author.id) {
        return {
          title: `${series.title} | WCAMPER Webtoon`,
          description: series.summary,
          image: series.thumbnail || series.cover || defaultOgImage,
          path: pathForSeries(series),
          type: "website"
        };
      }
    }

    if (route.name === "episode") {
      const series = getSeries(route.seriesId);
      const author = getAuthor(route.authorId);
      const episodes = getEpisodesForSeries(route.seriesId);
      const episode = episodes.find((item) => String(item.number) === String(route.number));
      if (author && series && series.authorId === author.id && episode) {
        return {
          title: `${series.title} ${episode.number}화. ${episode.title} | WCAMPER Webtoon`,
          description: episode.summary,
          image: episode.thumbnail || firstPanelImage(episode) || series.thumbnail || series.cover || defaultOgImage,
          path: pathForEpisode(episode),
          type: "article"
        };
      }
    }

    if (route.name === "notFound") {
      return {
        title: "페이지를 찾을 수 없습니다 | WCAMPER Webtoon",
        description: "WCAMPER Webtoon에서 작가, 작품, 회차 순서로 다시 이동해주세요.",
        image: defaultOgImage,
        path: "/404.html",
        type: "website"
      };
    }

    if (route.name === "webtoons") {
      return {
        title: "웹툰 | WCAMPER Webtoon",
        description: "WCAMPER에서 공개 중인 AI 웹툰과 기획작을 최신 회차, 작가, 인기 작품 기준으로 탐색합니다.",
        image: defaultOgImage,
        path: "/webtoons",
        type: "website"
      };
    }

    if (route.name === "creators") {
      return {
        title: "작가모집 | WCAMPER Webtoon",
        description: "웹툰기획력과 AI 제작 도구를 활용해 캠핑, 여행, 일상 이야기를 웹툰으로 연재할 작가를 모집합니다.",
        image: "assets/img/creators/ai-webtoon-creator-call-16x9.png",
        path: "/creators",
        type: "website"
      };
    }

    if (route.name === "creatorTraining") {
      return {
        title: "AI 웹툰 제작 교육자료 | WCAMPER Webtoon",
        description: "작가 지원자를 위한 AI 웹툰 제작 커리큘럼, 워크북, source package, QA 체크리스트 안내입니다.",
        image: "assets/img/authors/bongdal-universe-comics-logo.png",
        path: "/creators/training",
        type: "website"
      };
    }

    if (route.name === "partnership") {
      return {
        title: "협업문의 | WCAMPER Webtoon",
        description: "브랜드 웹툰, PPL, 캠핑장 협업, 작가 협의형 광고 캠페인 제안을 받습니다.",
        image: defaultOgImage,
        path: "/partnership",
        type: "website"
      };
    }

    if (route.name === "mypage") {
      return {
        title: "마이페이지 | WCAMPER Webtoon",
        description: "회원의 웹툰 보기, 관심작, 피드백, 활동 내역을 확인하는 독자용 마이페이지 설계 화면입니다.",
        image: defaultOgImage,
        path: "/mypage",
        type: "website"
      };
    }

    if (route.name === "creatorStudio") {
      return {
        title: "작가페이지 | WCAMPER Webtoon",
        description: "작가의 작품 관리, 회차 제작, 독자 피드백, 광고 협의 현황을 확인하는 작가페이지 설계 화면입니다.",
        image: "assets/img/authors/bongdal-universe-comics-logo.png",
        path: "/creator-studio",
        type: "website"
      };
    }

    if (route.name === "admin") {
      return {
        title: "사이트관리자 | WCAMPER Webtoon",
        description: "작가신청, 피드백 검수, 사이트 설정을 관리하는 운영자 전용 콘솔입니다.",
        image: defaultOgImage,
        path: "/admin",
        type: "website"
      };
    }

    return {
      title: "AI로 만드는 캠핑 웹툰 플랫폼 | WCAMPER Webtoon",
      description: "캠핑, 크루, 가족 여행, 브랜드 이야기를 AI 웹툰으로 제작하고 공개 연재하는 WCAMPER 웹툰 플랫폼입니다.",
      image: homeMainImage,
      path: "/",
      type: "website"
    };
  }

  function updateDocumentMeta(route) {
    const meta = getRouteMeta(route);
    const url = absoluteUrl(meta.path);
    const image = absoluteAssetUrl(meta.image);

    document.title = meta.title;
    setCanonical(url);
    setMetaAttribute('meta[name="description"]', "content", meta.description);
    setMetaAttribute('meta[property="og:title"]', "content", meta.title);
    setMetaAttribute('meta[property="og:description"]', "content", meta.description);
    setMetaAttribute('meta[property="og:type"]', "content", meta.type);
    setMetaAttribute('meta[property="og:url"]', "content", url);
    setMetaAttribute('meta[property="og:image"]', "content", image);
    setMetaAttribute('meta[property="og:site_name"]', "content", "WCAMPER Webtoon");
    setMetaAttribute('meta[name="twitter:card"]', "content", "summary_large_image");
    setMetaAttribute('meta[name="twitter:title"]', "content", meta.title);
    setMetaAttribute('meta[name="twitter:description"]', "content", meta.description);
    setMetaAttribute('meta[name="twitter:image"]', "content", image);
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function link(href, label, className = "button ghost") {
    return `<a class="${className}" href="${href}" data-link>${label}</a>`;
  }

  function settingValue(key) {
    return publicSettings.values[key];
  }

  function isActiveAuthor(author = authState.author) {
    return String(author?.status || "").toUpperCase() === "ACTIVE";
  }

  function creatorStatusLabel(status) {
    return {
      DRAFT: "초안",
      REVIEW_REQUESTED: "검수요청",
      REVISION_REQUESTED: "보완요청",
      APPROVED: "승인",
      SCHEDULED: "예약",
      PUBLISHED: "공개",
      ARCHIVED: "보관"
    }[status] || status || "미정";
  }

  const trainingPrinciples = [
    ["기준선 우선", "캐릭터 이름이나 프롬프트보다 character sheet, registry, style guide, 금지 변형을 먼저 고정합니다."],
    ["이야기 분해", "소재를 바로 이미지로 보내지 않고 synopsis, scene, beat, panel, 컷별 instruction으로 나눕니다."],
    ["생성과 편집 분리", "이미지는 source로 생성하고 말풍선, 대사, 여백, scroll rhythm은 편집 단계에서 완성합니다."],
    ["실패를 자산화", "얼굴 변화, 복장 누락, 인원수 오류, 방향 오류를 QA와 수정 이력으로 남깁니다."]
  ];

  const trainingModules = [
    ["1. 실제 구조", "AI 이미지 생성과 웹툰 production을 구분", "작품 유형 정의서, pipeline map"],
    ["2. 작품 기획", "작품 기준선과 세계관 범위 작성", "1페이지 기획서, 세계관 기준표"],
    ["3. 캐릭터 고정", "character sheet와 identity checklist 작성", "주인공/보조 character sheet"],
    ["4. 컷 분해", "소재를 scene, beat, panel로 분해", "10컷 storyboard"],
    ["5. 이미지 instruction", "공통 block과 컷별 variable block 분리", "컷별 instruction 10개"],
    ["6. QA와 수정", "오류 분류와 재생성 범위 판단", "QA checklist, 수정 이력"],
    ["7. 모바일 편집", "이미지를 세로 scroll 웹툰으로 편집", "완성 episode 1편"],
    ["8. Source package", "다음 episode 제작용 asset 정리", "재사용 package, teaser"]
  ];

  const workbookTemplates = [
    ["작품 기획서", ["작품명", "한 줄 설명", "대상 독자", "장르/tone", "episode당 컷 수", "공개 채널"]],
    ["Character Brief", ["얼굴", "헤어", "연령", "체형", "복장", "소품", "고정값/허용 변형/금지 변형"]],
    ["Storyboard", ["컷 번호", "목적", "등장인물", "행동/표정", "shot", "대사", "다음 컷 연결"]],
    ["Instruction Sheet", ["Common character block", "Panel variable block", "Negative constraints"]]
  ];

  const qaGroups = [
    ["캐릭터 동일성", ["얼굴 윤곽, 눈매, 인상 유지", "episode 연도와 연령대 일치", "체형/키 비율 유지", "헤어/복장/소품 누락 여부"]],
    ["Continuity", ["전 컷과 다음 컷의 위치 관계", "시선 방향", "오른손/왼손, 차량 방향, 텐트 위치 반전 여부", "대사와 행동 충돌 여부"]],
    ["모바일 가독성", ["컷당 9:16 기준", "1컷 1메시지", "말풍선은 짧고 명확", "한 화면 정보 과밀 방지"]],
    ["게시 준비", ["모바일 preview 확인", "권리/개인정보 검토", "AI 사용 disclosure 확인"]]
  ];

  function currentReturnTo() {
    return `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
  }

  function buildAuthUrl(pathname = "/login", returnTo = currentReturnTo()) {
    const url = new URL(pathname, authConfig.loginUrl);
    url.searchParams.set("service", authConfig.service);
    url.searchParams.set("returnTo", returnTo);
    return url.toString();
  }

  function buildLoginUrl(returnTo) {
    return buildAuthUrl("/login", returnTo);
  }

  function buildSignupUrl(returnTo) {
    return buildAuthUrl("/signup", returnTo);
  }

  async function apiJson(path, options = {}) {
    const response = await fetch(path, {
      credentials: "include",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      },
      ...options
    });
    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(payload.message || "요청을 처리하지 못했습니다.");
    }

    return payload;
  }

  async function refreshPublicSettings() {
    try {
      const payload = await apiJson("/api/site-settings/public");
      Object.values(payload.settings || {}).forEach((setting) => {
        publicSettings.values[setting.key] = setting.value;
      });
    } catch {
      publicSettings.values = { ...publicSettings.values };
    } finally {
      publicSettings.checked = true;
    }
  }

  function renderEpisodeNav(series, episodes, episode, label) {
    const currentIndex = episodes.findIndex((item) => item.id === episode.id);
    const previousEpisode = currentIndex > 0 ? episodes[currentIndex - 1] : null;
    const nextEpisode = currentIndex < episodes.length - 1 ? episodes[currentIndex + 1] : null;
    const seriesEpisodesPath = `${pathForSeries(series)}#episodes`;

    return `
      <nav class="episode-nav" aria-label="${escapeHtml(label)}">
        ${previousEpisode
          ? link(pathForEpisode(previousEpisode), `이전회차 ${previousEpisode.number}화`, "button ghost")
          : `<span class="button ghost is-disabled" aria-disabled="true">이전회차</span>`}
        ${link(seriesEpisodesPath, "목록보기", "button primary")}
        ${nextEpisode
          ? link(pathForEpisode(nextEpisode), `다음회차 ${nextEpisode.number}화`, "button ghost")
          : `<span class="button ghost is-disabled" aria-disabled="true">다음회차</span>`}
      </nav>
    `;
  }

  function renderFeedbackBox(targetType, title) {
    const base = data.feedback;
    const target = base.targets.find((item) => item.type === targetType && item.title === title) || {
      label: targetType === "author" ? "작가" : targetType === "series" ? "작품" : "회차",
      title,
      prompt: `${title}에 대한 의견을 남겨주세요.`,
      score: "집계중",
      memberCount: 0,
      samples: []
    };
    const returnTo = currentReturnTo();
    const loginUrl = buildLoginUrl(returnTo);
    const signupUrl = buildSignupUrl(returnTo);
    const feedbackOpen = settingValue("feedback.enabled") && settingValue("feedback.moderationMode") !== "closed";
    const canWriteFeedback = authState.authenticated && authState.profileComplete && feedbackOpen;
    const feedbackAuthMessage = feedbackOpen
      ? base.authProvider.description
      : "현재 운영자 설정으로 피드백 작성이 일시 중지되었습니다.";

    return `
      <section class="feedback-panel" aria-label="${escapeHtml(target.title)} 피드백">
        <div class="section-heading compact">
          <p class="eyebrow">Feedback</p>
          <h2>${escapeHtml(target.label)} 피드백</h2>
        </div>
        <div class="feedback-layout">
          <article class="score-card">
            <span>${escapeHtml(target.title)}</span>
            <strong>${escapeHtml(target.score)}</strong>
            <p>${escapeHtml(target.prompt)}</p>
            <div class="feedback-counts">
              <span>회원 피드백 ${target.memberCount}</span>
              <span>익명 작성 불가</span>
            </div>
          </article>
          <form class="feedback-form" data-feedback-form data-target-type="${escapeHtml(targetType)}" data-target-id="${escapeHtml(target.id || title)}">
            <label>
              <span>작성 권한</span>
              <input type="text" value="${escapeHtml(base.authProvider.name)} 로그인 회원" readonly>
            </label>
            <label class="feedback-text">
              <span>의견</span>
              <textarea rows="4" placeholder="${escapeHtml(target.label)}에 대한 의견을 남겨주세요" ${canWriteFeedback ? "" : "disabled"}></textarea>
            </label>
            ${canWriteFeedback
              ? `<button class="button primary" type="button" data-feedback-submit>피드백 남기기</button>`
              : `<div class="feedback-auth-cta">
                  <p>${escapeHtml(feedbackAuthMessage)}</p>
                  ${feedbackOpen ? `<a class="button primary" href="${escapeHtml(loginUrl)}">통합로그인</a>
                  <a class="button ghost" href="${escapeHtml(signupUrl)}">통합회원가입</a>` : ""}
                </div>`}
            <p class="form-status" data-feedback-status role="status" aria-live="polite"></p>
          </form>
        </div>
        ${target.samples.length ? `
          <div class="feedback-samples">
            ${target.samples.map((sample) => `
              <blockquote>
                <span>로그인 회원</span>
                <p>${escapeHtml(sample.body)}</p>
              </blockquote>
            `).join("")}
          </div>
        ` : ""}
      </section>
    `;
  }

  function renderEpisodeTile(episode) {
    const series = getSeries(episode.seriesId);
    const disabled = episode.panels.length === 0 ? " is-disabled" : "";
    return `
      <article class="episode-tile${disabled}">
        <a href="${pathForEpisode(episode)}" data-link aria-label="${escapeHtml(episode.title)} 보기">
          <img src="/${episode.thumbnail}" alt="${escapeHtml(episode.title)} 썸네일">
        </a>
        <div>
          <div class="meta-row">
            <span>${escapeHtml(series.title)}</span>
            <span>${escapeHtml(episode.status)}</span>
            <span>${escapeHtml(episode.readTime)}</span>
          </div>
          <h3><a href="${pathForEpisode(episode)}" data-link>${episode.number}화. ${escapeHtml(episode.title)}</a></h3>
          <p>${escapeHtml(episode.summary)}</p>
        </div>
      </article>
    `;
  }

  function renderSeriesCard(series) {
    const author = getAuthor(series.authorId);
    const episodes = getEpisodesForSeries(series.id);
    const image = series.thumbnail || series.cover;
    return `
      <article class="webtoon-card">
        <a href="${pathForSeries(series)}" data-link>
          <img src="/${image}" alt="${escapeHtml(series.title)} 썸네일">
        </a>
        <div class="webtoon-card-body">
          <div class="meta-row">
            <span>${escapeHtml(series.status)}</span>
            <span>${escapeHtml(series.schedule)}</span>
          </div>
          <h3><a href="${pathForSeries(series)}" data-link>${escapeHtml(series.title)}</a></h3>
          <p>${escapeHtml(series.summary)}</p>
          <a class="text-link" href="${pathForAuthor(author)}" data-link>${escapeHtml(author.name)}</a>
          <div class="stat-strip">
            <span>조회 ${escapeHtml(series.stats.views)}</span>
            <span>관심 ${escapeHtml(series.stats.favorites)}</span>
            <span>${episodes.length}화</span>
          </div>
        </div>
      </article>
    `;
  }

  function renderAuthorAvatar(author, className = "author-avatar") {
    const label = `${author.name} 로고`;
    const content = author.image
      ? `<img src="/${author.image}" alt="${escapeHtml(label)}">`
      : escapeHtml(author.avatar);
    return `<a class="${className}" href="${pathForAuthor(author)}" data-link>${content}</a>`;
  }

  function renderAuthorCard(author) {
    const works = data.series.filter((series) => series.authorId === author.id);
    const published = works.reduce((sum, series) => (
      sum + getEpisodesForSeries(series.id).filter((episode) => episode.status === "공개").length
    ), 0);
    return `
      <article class="author-tile">
        ${renderAuthorAvatar(author)}
        <div>
          <div class="meta-row">
            <span>${escapeHtml(author.title)}</span>
            <span>${escapeHtml(author.debut)}</span>
          </div>
          <h3><a href="${pathForAuthor(author)}" data-link>${escapeHtml(author.name)}</a></h3>
          <p>${escapeHtml(author.bio)}</p>
          <div class="stat-strip">
            <span>작품 ${works.length}</span>
            <span>공개 ${published}화</span>
          </div>
        </div>
      </article>
    `;
  }

  function renderHome() {
    const popularSeries = data.series.slice().sort((a, b) => Number.parseFloat(b.stats.views) - Number.parseFloat(a.stats.views));

    main.innerHTML = `
      <section class="hero">
        <div class="hero-cover">
          <video autoplay muted loop playsinline preload="metadata" poster="/${homeMainImage}" aria-label="WCAMPER AI 웹툰 대표 영상">
            <source src="/${homeMainVideo}" type="video/mp4">
          </video>
        </div>
        <div class="hero-content">
          <p class="eyebrow">AI Webtoon Platform</p>
          <h1>AI로 만드는 캠핑 웹툰 플랫폼</h1>
          <p>캠핑, 크루, 가족 여행, 브랜드 이야기를 웹툰 회차로 기획하고 모바일 스크롤 연재로 공개합니다.</p>
          <div class="hero-meta">
            <span>기획</span>
            <span>콘티/대사</span>
            <span>AI 이미지</span>
            <span>공개 연재</span>
          </div>
          <div class="hero-actions">
            ${link("/webtoons", "웹툰 보러가기", "button primary")}
            ${link("/creators", "작가로 참여하기")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">About</p>
          <h2>사진, 대화, 아이디어를 웹툰 회차로</h2>
        </div>
        <div class="feature-grid">
          <article class="feature-card">
            <span>01</span>
            <h3>현장 기록 기반</h3>
            <p>캠핑 사진, 단톡방 분위기, 커뮤니티 에피소드를 회차 단위 이야기로 정리합니다.</p>
          </article>
          <article class="feature-card">
            <span>02</span>
            <h3>AI 제작 협업</h3>
            <p>작가의 기획, 캐릭터, 대사 감각에 AI 이미지 제작 도구를 연결해 제작 속도를 높입니다.</p>
          </article>
          <article class="feature-card">
            <span>03</span>
            <h3>모바일 연재</h3>
            <p>짧은 스크롤 회차로 공개하고 조회, 완독, 피드백을 다음 기획에 반영합니다.</p>
          </article>
        </div>
      </section>

      <section class="section muted-band">
        <div class="section-heading">
          <p class="eyebrow">Now Streaming</p>
          <h2>현재 공개 연재</h2>
        </div>
        <div class="webtoon-grid">
          ${popularSeries.slice(0, 3).map(renderSeriesCard).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Workflow</p>
          <h2>제작 흐름</h2>
        </div>
        <div class="process-grid">
          ${["기획", "콘티/대사", "AI 이미지 제작", "검수", "공개 연재"].map((step, index) => `
            <article class="process-step">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(step)}</strong>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="contact-band">
        <article class="contact-card">
          <p class="eyebrow">Creator Call</p>
          <h2>작가모집</h2>
          <p>그림 실력만이 아니라 캐릭터, 에피소드, 세계관, 대사 감각을 가진 창작자를 모집합니다.</p>
          ${link("/creators", "작가모집 보기", "button primary")}
        </article>
        <article class="contact-card">
          <p class="eyebrow">Partnership</p>
          <h2>협업문의</h2>
          <p>캠핑 브랜드, 로컬 캠핑장, 장비 리뷰, 시즌 캠페인을 웹툰형 콘텐츠로 제안받습니다.</p>
          ${link("/partnership", "협업문의 보기", "button ghost")}
        </article>
      </section>
    `;
  }

  function renderWebtoonsPage() {
    const query = new URLSearchParams(window.location.search).get("q")?.trim() || "";
    const normalizedQuery = query.toLowerCase();
    const latestEpisodes = getPublishedEpisodes().slice(0, 6);
    const popularSeries = data.series.slice().sort((a, b) => Number.parseFloat(b.stats.views) - Number.parseFloat(a.stats.views));
    const authors = data.authors;
    const filteredEpisodes = query
      ? getPublishedEpisodes().filter((episode) => {
        const series = getSeries(episode.seriesId);
        return [episode.title, episode.summary, series?.title].join(" ").toLowerCase().includes(normalizedQuery);
      })
      : latestEpisodes;
    const filteredSeries = query
      ? popularSeries.filter((series) => [series.title, series.summary, series.tags.join(" ")].join(" ").toLowerCase().includes(normalizedQuery))
      : popularSeries;
    const filteredAuthors = query
      ? authors.filter((author) => [author.name, author.bio, author.keywords.join(" ")].join(" ").toLowerCase().includes(normalizedQuery))
      : authors;

    main.innerHTML = `
      <section class="page-hero">
        <div class="section-heading">
          <p class="eyebrow">Webtoons</p>
          <h1>웹툰</h1>
          <p>${query
            ? `검색어 "${escapeHtml(query)}"에 맞는 작품, 회차, 작가를 보여줍니다.`
            : "WCAMPER에서 공개 중인 AI 웹툰과 기획작을 최신 회차, 작가, 인기 작품 기준으로 탐색합니다."}</p>
        </div>
      </section>

      <section id="latest" class="section">
        <div class="section-heading">
          <p class="eyebrow">Latest</p>
          <h2>${query ? "검색된 회차" : "최신웹툰"}</h2>
        </div>
        <div class="episode-grid">
          ${filteredEpisodes.map(renderEpisodeTile).join("") || `
            <article class="empty-state"><h2>검색된 회차가 없습니다.</h2><p>다른 검색어로 다시 찾아보세요.</p></article>
          `}
        </div>
      </section>

      <section id="rookies" class="section muted-band">
        <div class="section-heading">
          <p class="eyebrow">Rookie Creators</p>
          <h2>${query ? "검색된 작가" : "신인작가"}</h2>
        </div>
        <div class="author-grid">
          ${filteredAuthors.map(renderAuthorCard).join("") || `
            <article class="empty-state"><h2>검색된 작가가 없습니다.</h2><p>작가명이나 키워드를 바꿔보세요.</p></article>
          `}
        </div>
      </section>

      <section id="popular-webtoons" class="section">
        <div class="section-heading">
          <p class="eyebrow">Popular Webtoons</p>
          <h2>${query ? "검색된 작품" : "인기웹툰"}</h2>
        </div>
        <div class="webtoon-grid">
          ${filteredSeries.map(renderSeriesCard).join("") || `
            <article class="empty-state"><h2>검색된 작품이 없습니다.</h2><p>작품명, 장르, 설명 기준으로 검색합니다.</p></article>
          `}
        </div>
      </section>

      <section id="popular-authors" class="section muted-band">
        <div class="section-heading">
          <p class="eyebrow">Popular Authors</p>
          <h2>인기작가</h2>
        </div>
        <div class="author-grid">
          ${authors.map(renderAuthorCard).join("")}
        </div>
      </section>
    `;
  }

  function renderCreatorsPage() {
    const returnTo = currentReturnTo();
    const loginUrl = buildLoginUrl(returnTo);
    const signupUrl = buildSignupUrl(returnTo);
    const applicationsOpen = settingValue("creatorApplications.enabled");
    const trainingVisible = settingValue("creatorTraining.visible");

    main.innerHTML = `
      <section class="page-hero creator-call-hero">
        <h1 class="sr-only">AI 웹툰 작가 모집</h1>
        <a class="creator-call-visual" href="${applicationsOpen ? authState.authenticated ? "#author-application" : escapeHtml(loginUrl) : "#author-application"}" aria-label="AI 웹툰 작가 모집 지원하기">
          <img src="/assets/img/creators/ai-webtoon-creator-call-16x9.png" alt="AI 웹툰 작가 모집. AI를 배우고, 스토리를 만들고, 웹툰으로 연재하세요.">
        </a>
        <div class="creator-call-actions">
          <div class="hero-actions">
            ${applicationsOpen
              ? authState.authenticated
                ? `<a class="button primary" href="#author-application">작가신청 작성</a>`
                : `<a class="button primary" href="${escapeHtml(loginUrl)}">통합로그인 후 신청</a>`
              : `<span class="button is-disabled" aria-disabled="true">작가모집 일시중지</span>`}
            ${trainingVisible ? link("/creators/training", "교육자료 보기", "button ghost") : ""}
            <a class="button ghost" href="${escapeHtml(signupUrl)}">통합회원가입</a>
            ${link("/webtoons", "연재작 보기", "button ghost")}
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Who</p>
          <h2>모집 대상</h2>
        </div>
        <div class="feature-grid">
          ${[
            ["캠핑/여행/일상 에피소드가 있는 사람", "실제 경험과 커뮤니티 이야기를 회차 소재로 확장합니다."],
            ["브랜드나 커뮤니티 이야기를 웹툰화하고 싶은 사람", "상품 소개보다 캐릭터와 상황 중심의 연재를 기획합니다."],
            ["AI 도구로 웹툰 제작을 배우고 싶은 사람", "기획안, 콘티, 이미지 제작, 검수 흐름을 함께 익힙니다."],
            ["스토리/기획/대사에 강한 예비 작가", "작화보다 이야기의 리듬과 캐릭터 목소리를 우선합니다."]
          ].map(([title, body]) => `
            <article class="feature-card">
              <h3>${escapeHtml(title)}</h3>
              <p>${escapeHtml(body)}</p>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="section muted-band">
        <div class="section-heading">
          <p class="eyebrow">Support</p>
          <h2>제공 내용</h2>
        </div>
        <div class="offer-list">
          ${["AI로 웹툰 만들기 교재", "작품 기획 템플릿", "캐릭터/세계관 정리 가이드", "회차 구성/콘티 가이드", "공개 연재 페이지 제공"].map((item) => `
            <article><span>지원</span><strong>${escapeHtml(item)}</strong></article>
          `).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Training</p>
          <h2>교육자료로 먼저 준비하기</h2>
        </div>
        <div class="account-layout">
          <article class="account-panel">
            <h3>AI 웹툰 제작 교육자료</h3>
            <p>기획서, 캐릭터 기준선, 컷 분해, instruction sheet, QA 체크리스트까지 작가신청 전에 준비할 항목을 정리했습니다.</p>
            <div class="hero-actions">
              ${trainingVisible ? link("/creators/training", "교육자료 보기", "button primary") : `<span class="button is-disabled" aria-disabled="true">교육자료 비공개</span>`}
            </div>
          </article>
          <article class="account-panel">
            <h3>자료 추가 방식</h3>
            <p>새 PDF, 워크북, 예시자료는 커리큘럼, 워크북, Source Package, QA 영역에 승인 상태별로 단계적으로 반영합니다.</p>
            <div class="tag-row">
              <span>커리큘럼</span>
              <span>워크북</span>
              <span>QA</span>
            </div>
          </article>
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Process</p>
          <h2>참여 흐름</h2>
        </div>
        <div class="process-grid">
          ${["지원/문의", "기획안 정리", "샘플 회차 제작", "검수 및 피드백", "공개 연재"].map((step, index) => `
            <article class="process-step">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(step)}</strong>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="section muted-band" id="author-application">
        <div class="section-heading">
          <p class="eyebrow">Application</p>
          <h2>작가신청</h2>
        </div>
        <div class="account-layout">
          <form class="feedback-form" data-author-application-form>
            <label>
              <span>작가명</span>
              <input name="displayName" type="text" maxlength="80" placeholder="연재에 사용할 작가명" ${authState.authenticated && applicationsOpen ? "" : "disabled"}>
            </label>
            <label>
              <span>포트폴리오 URL</span>
              <input name="portfolioUrl" type="url" maxlength="500" placeholder="https://..." ${authState.authenticated && applicationsOpen ? "" : "disabled"}>
            </label>
            <label class="feedback-text">
              <span>자기소개</span>
              <textarea name="introduction" rows="5" maxlength="2000" placeholder="경험, 관심 주제, 연재하고 싶은 이유를 적어주세요." ${authState.authenticated && applicationsOpen ? "" : "disabled"}></textarea>
            </label>
            <label class="feedback-text">
              <span>샘플 기획</span>
              <textarea name="samplePlan" rows="5" maxlength="3000" placeholder="첫 작품 또는 첫 회차 아이디어를 적어주세요." ${authState.authenticated && applicationsOpen ? "" : "disabled"}></textarea>
            </label>
            ${authState.authenticated && applicationsOpen
              ? `<button class="button primary" type="submit">작가신청 제출</button>`
              : `<div class="feedback-auth-cta">
                  <p>${applicationsOpen ? "작가신청은 auth.wcamper.com 통합회원 로그인 후 제출할 수 있습니다." : "현재 운영자 설정으로 작가신청 접수가 일시 중지되었습니다."}</p>
                  ${applicationsOpen ? `<a class="button primary" href="${escapeHtml(loginUrl)}">통합로그인</a>
                  <a class="button ghost" href="${escapeHtml(signupUrl)}">통합회원가입</a>` : ""}
                </div>`}
            <p class="form-status" data-author-application-status role="status" aria-live="polite"></p>
          </form>
          <article class="account-panel">
            <h3>승인 기준</h3>
            <p>운영자는 제출된 소개, 샘플 기획, 플랫폼 주제 적합성, 저작권/AI 사용 고지 가능 여부를 검토한 뒤 작가 권한을 부여합니다.</p>
            <div class="tag-row">
              <span>통합회원</span>
              <span>운영 검수</span>
              <span>승인 후 작가페이지</span>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function renderCreatorTrainingPage() {
    if (!settingValue("creatorTraining.visible")) {
      main.innerHTML = `
        <section class="empty-state page">
          <p class="eyebrow">Training</p>
          <h1>교육자료가 현재 비공개입니다.</h1>
          <p>운영자 설정에 따라 작가모집 교육자료 노출이 일시 중지되었습니다.</p>
          ${link("/creators", "작가모집으로", "button primary")}
        </section>
      `;
      return;
    }

    main.innerHTML = `
      <section class="page-hero split training-hero">
        <div>
          <p class="eyebrow">작가모집 교육자료</p>
          <h1>AI 웹툰 제작 교육자료</h1>
          <p>AI 이미지 생성이 아니라 연재 가능한 웹툰 제작 흐름을 배웁니다. 기준선, 캐릭터 고정, 컷 분해, QA, source package까지 작가 지원자가 알아야 할 제작 단계를 정리합니다.</p>
          <div class="hero-actions">
            <a class="button primary" href="#curriculum">커리큘럼 보기</a>
            <a class="button ghost" href="#workbook">워크북 보기</a>
            ${link("/creators#author-application", "작가신청하기", "button ghost")}
          </div>
        </div>
        <div class="info-panel">
          <strong>그림 한 장에서 연재 가능한 한 편으로</strong>
          <p>작품 기준선, 컷별 instruction, 모바일 검수 기준을 고정해 다음 화까지 이어지는 제작 패키지를 만듭니다.</p>
          <div class="tag-row">
            <span>기준선</span>
            <span>컷 분해</span>
            <span>QA</span>
            <span>Source Package</span>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Principles</p>
          <h2>교육 핵심 4원칙</h2>
        </div>
        <div class="feature-grid">
          ${trainingPrinciples.map(([title, body], index) => `
            <article class="feature-card">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <h3>${escapeHtml(title)}</h3>
              <p>${escapeHtml(body)}</p>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="section muted-band" id="curriculum">
        <div class="section-heading">
          <p class="eyebrow">Curriculum</p>
          <h2>8개 모듈 커리큘럼</h2>
        </div>
        <div class="training-module-grid">
          ${trainingModules.map(([module, goal, output]) => `
            <article class="training-module">
              <h3>${escapeHtml(module)}</h3>
              <dl>
                <div>
                  <dt>학습 목표</dt>
                  <dd>${escapeHtml(goal)}</dd>
                </div>
                <div>
                  <dt>결과물</dt>
                  <dd>${escapeHtml(output)}</dd>
                </div>
              </dl>
            </article>
          `).join("")}
        </div>
        <div class="training-note">
          <strong>자료 확장 기준</strong>
          <p>새 강의자료와 예시자료는 각 모듈 하단에 승인 상태를 확인한 뒤 추가합니다. Drive 원본이나 강사용 PPTX는 공개 검토 전까지 직접 배포하지 않습니다.</p>
        </div>
      </section>

      <section class="section" id="workbook">
        <div class="section-heading">
          <p class="eyebrow">Workbook</p>
          <h2>수강생 워크북 템플릿</h2>
        </div>
        <div class="workbook-grid">
          ${workbookTemplates.map(([title, fields]) => `
            <article class="workbook-card">
              <h3>${escapeHtml(title)}</h3>
              <ul>
                ${fields.map((field) => `<li>${escapeHtml(field)}</li>`).join("")}
              </ul>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="section muted-band">
        <div class="section-heading">
          <p class="eyebrow">Source Package</p>
          <h2>다음 화까지 이어지는 제작 기준</h2>
        </div>
        <div class="account-layout">
          <article class="account-panel">
            <h3>Source package란?</h3>
            <p>다음 episode를 만들기 위한 재사용 기준입니다. 캐릭터 기준선, style guide, 금지 변형, 컷별 instruction, QA 이력을 분리해 관리합니다.</p>
          </article>
          <article class="account-panel">
            <h3>초기 공개 범위</h3>
            <p>현재는 개념과 체크 항목 중심으로 공개합니다. PDF, 캐릭터 시트, source docs 원문은 권리/정책 검토 후 승인된 자료만 단계적으로 추가합니다.</p>
          </article>
        </div>
        <div class="process-grid training-source-flow">
          ${["기준 문서", "캐릭터 기준선", "컷별 instruction", "QA 이력", "재사용 package"].map((step, index) => `
            <article class="process-step">
              <span>${String(index + 1).padStart(2, "0")}</span>
              <strong>${escapeHtml(step)}</strong>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">QA Checklist</p>
          <h2>검수 체크리스트</h2>
        </div>
        <div class="qa-grid">
          ${qaGroups.map(([title, items]) => `
            <article class="qa-card">
              <h3>${escapeHtml(title)}</h3>
              <ul>
                ${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
              </ul>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="contact-band training-cta-band">
        <article class="contact-card">
          <p class="eyebrow">Creator Call</p>
          <h2>워크북을 바탕으로 작가신청하기</h2>
          <p>작품 기획서, 캐릭터 기준, 샘플 회차 아이디어를 정리한 뒤 작가신청으로 이어갑니다.</p>
          ${link("/creators#author-application", "작가신청하기", "button primary")}
        </article>
        <article class="contact-card">
          <p class="eyebrow">Back</p>
          <h2>작가모집 안내로 돌아가기</h2>
          <p>모집 대상, 제공 내용, 참여 흐름을 확인하고 지원 준비 상태를 점검합니다.</p>
          ${link("/creators", "작가모집 보기", "button ghost")}
        </article>
      </section>
    `;
  }

  function renderPartnershipPage() {
    main.innerHTML = `
      <section class="page-hero split">
        <div>
          <p class="eyebrow">Partnership</p>
          <h1>웹툰으로 브랜드 이야기를 제안하세요</h1>
          <p>캠핑 브랜드, 캠핑장, 장비, 로컬 여행 콘텐츠를 웹툰 회차와 캐릭터 상황 안에 자연스럽게 연결합니다.</p>
          <div class="hero-actions">
            <a class="button primary" href="mailto:ads@wcamper.com">협업 제안하기</a>
            ${link("/webtoons", "웹툰 사례 보기", "button ghost")}
          </div>
        </div>
        <div class="info-panel">
          <strong>협업 범위</strong>
          <div class="tag-row">
            <span>PPL</span>
            <span>장소 협업</span>
            <span>작가 협의</span>
            <span>광고 의뢰</span>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Types</p>
          <h2>협업 유형</h2>
        </div>
        <div class="feature-grid">
          ${[
            ["PPL/제품 노출", "장비, 식품, 캠핑 소품을 회차 장면 안에 자연스럽게 배치합니다."],
            ["캠핑장/장소 협업", "공간의 특징을 캐릭터 방문, 사건, 리뷰형 에피소드로 구성합니다."],
            ["작가 협의형 브랜드 에피소드", "작가의 톤을 유지하면서 브랜드 메시지와 고지 조건을 조율합니다."],
            ["광고 캠페인 웹툰 제작", "시즌 캠페인, 출시 일정, 프로모션을 짧은 웹툰 시리즈로 만듭니다."]
          ].map(([title, body]) => `
            <article class="feature-card">
              <h3>${escapeHtml(title)}</h3>
              <p>${escapeHtml(body)}</p>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="section muted-band">
        <div class="section-heading">
          <p class="eyebrow">Proposal</p>
          <h2>제안 시 필요한 정보</h2>
        </div>
        <div class="offer-list">
          ${["브랜드/담당자", "제품 또는 장소", "희망 노출 방식", "일정과 예산 범위", "필수 고지/검수 조건"].map((item) => `
            <article><span>필수</span><strong>${escapeHtml(item)}</strong></article>
          `).join("")}
        </div>
      </section>

      <section class="contact-band">
        <article class="contact-card">
          <p class="eyebrow">Principle</p>
          <h2>운영 원칙</h2>
          <p>독자 경험을 해치지 않는 자연스러운 노출, 광고/협찬 고지, 작가와 브랜드 간 사전 협의를 기준으로 진행합니다.</p>
        </article>
        <article class="contact-card">
          <p class="eyebrow">Contact</p>
          <h2>제안받기</h2>
          <p>PPL, 작가 협의, 광고 의뢰 내용을 정리해 보내주시면 회차 구성과 가능 범위를 검토합니다.</p>
          <a class="button primary" href="mailto:ads@wcamper.com">협업 제안하기</a>
        </article>
      </section>
    `;
  }

  function renderMypage() {
    main.innerHTML = `
      <section class="page-hero split">
        <div>
          <p class="eyebrow">Member</p>
          <h1>마이페이지</h1>
          <p>통합회원이 웹툰 감상, 관심작 관리, 피드백 작성, 활동 내역을 확인하는 독자용 공간입니다. 피드백 작성은 auth.wcamper.com 로그인과 프로필 완료 후 허용됩니다.</p>
          <div class="hero-actions">
            ${link("/webtoons", "웹툰 보러가기", "button primary")}
            ${link("/creators", "작가로 참여하기", "button ghost")}
          </div>
        </div>
        <div class="info-panel">
          <strong>회원 상태</strong>
          <p>${authState.authenticated ? "통합로그인 세션이 확인되었습니다." : "통합로그인이 필요합니다. 로그인 완료 시 최근 본 웹툰과 피드백 현황을 개인 데이터로 표시합니다."}</p>
        </div>
      </section>

      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Dashboard</p>
          <h2>회원 활동 요약</h2>
        </div>
        <div class="dashboard-grid">
          ${[
            ["최근 본 웹툰", "마지막으로 읽은 회차와 이어보기 진입점을 제공합니다."],
            ["관심작", "구독/관심 등록한 작품의 새 회차와 공지 상태를 보여줍니다."],
            ["내 피드백", "작성한 피드백, 반영 상태, 작가 답변 여부를 확인합니다."],
            ["완독/조회 기록", "회차별 감상 진행률과 재방문 기록을 정리합니다."]
          ].map(([title, body]) => `
            <article class="dashboard-card">
              <h3>${escapeHtml(title)}</h3>
              <p>${escapeHtml(body)}</p>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="section muted-band">
        <div class="section-heading">
          <p class="eyebrow">Feedback</p>
          <h2>피드백 활동</h2>
        </div>
        <div class="account-layout">
          <article class="account-panel">
            <h3>작성 가능한 피드백</h3>
            <p>작품, 회차, 작가 단위로 감상 의견을 남기고 인증 회원 피드백으로 집계합니다.</p>
            <div class="tag-row">
              <span>회차 의견</span>
              <span>작품 평가</span>
              <span>작가 응원</span>
            </div>
          </article>
          <article class="account-panel">
            <h3>내 활동 기준</h3>
            <p>로그인 회원 활동으로 완독률, 재방문, 관심작 데이터를 개인화에 활용합니다.</p>
            <div class="tag-row">
              <span>인증 회원</span>
              <span>관심작</span>
              <span>활동 이력</span>
            </div>
          </article>
        </div>
      </section>
    `;
  }

  function creatorSummaryNumber(group, status) {
    return Number(creatorState.summary?.[group]?.[status] || 0);
  }

  function creatorViewParams() {
    const params = new URLSearchParams(window.location.search);
    return {
      seriesId: params.get("series") || "",
      episodeId: params.get("episode") || ""
    };
  }

  function navigateCreatorStudio(params = {}) {
    const url = new URL("/creator-studio", window.location.origin);
    if (params.seriesId) url.searchParams.set("series", params.seriesId);
    if (params.episodeId) url.searchParams.set("episode", params.episodeId);
    window.history.pushState({}, "", `${url.pathname}${url.search}`);
    render();
  }

  function creatorSeriesHref(seriesId) {
    return `/creator-studio?series=${encodeURIComponent(seriesId)}`;
  }

  function creatorEpisodeHref(episodeId) {
    return `/creator-studio?episode=${encodeURIComponent(episodeId)}`;
  }

  function findCreatorSeries(seriesId) {
    return creatorState.series.find((series) => series.id === seriesId);
  }

  function findCreatorEpisode(episodeId) {
    return Object.values(creatorState.episodesBySeries).flat().find((episode) => episode.id === episodeId);
  }

  function renderCreatorBreadcrumb(items) {
    const visibleItems = items.filter(Boolean);
    const previous = visibleItems.length > 1 ? visibleItems[visibleItems.length - 2] : null;
    return `
      <nav class="creator-breadcrumb" aria-label="작가페이지 위치">
        <ol>
          ${visibleItems.map((item, index) => {
            const isCurrent = index === visibleItems.length - 1;
            if (isCurrent || !item.href) {
              return `<li aria-current="${isCurrent ? "page" : "false"}">${escapeHtml(item.label)}</li>`;
            }
            return `<li><a href="${escapeHtml(item.href)}" data-link>${escapeHtml(item.label)}</a></li>`;
          }).join("")}
        </ol>
      </nav>
      ${previous?.href ? `<a class="creator-mobile-back" href="${escapeHtml(previous.href)}" data-link>${escapeHtml(previous.label)}</a>` : ""}
    `;
  }

  function renderCreatorTabs(tabs) {
    if (!tabs?.length) return "";
    return `
      <nav class="creator-subnav" aria-label="작가페이지 하위 메뉴">
        ${tabs.map((tab) => `<a href="${escapeHtml(tab.href)}">${escapeHtml(tab.label)}</a>`).join("")}
      </nav>
    `;
  }

  function renderCreatorPageHeader({ breadcrumbs, eyebrow, title, description = "", status = "", actions = "", tabs = [] }) {
    return `
      <header class="creator-page-nav">
        ${renderCreatorBreadcrumb(breadcrumbs)}
        <div class="creator-page-title">
          <div>
            <p class="eyebrow">${escapeHtml(eyebrow)}</p>
            <h2>${escapeHtml(title)}</h2>
            ${description ? `<p>${escapeHtml(description)}</p>` : ""}
          </div>
          <div class="creator-page-actions">
            ${status ? `<span class="creator-status">${escapeHtml(status)}</span>` : ""}
            ${actions}
          </div>
        </div>
        ${renderCreatorTabs(tabs)}
      </header>
    `;
  }

  function renderCreatorEpisodeRow(episode) {
    const canRequestReview = ["DRAFT", "REVISION_REQUESTED"].includes(episode.status);
    return `
      <article class="creator-episode-row">
        <div>
          <span class="creator-status">${escapeHtml(creatorStatusLabel(episode.status))}</span>
          <strong><a href="${creatorEpisodeHref(episode.id)}" data-link>${episode.number}화. ${escapeHtml(episode.title)}</a></strong>
          <p>${escapeHtml(episode.summary || "요약 없음")}</p>
        </div>
        <div class="creator-row-actions">
          <a class="button ghost" href="${creatorEpisodeHref(episode.id)}" data-link>회차상태</a>
          <button class="button ghost" type="button" data-creator-review-episode="${escapeHtml(episode.id)}" ${canRequestReview ? "" : "disabled"}>검수요청</button>
        </div>
      </article>
    `;
  }

  function renderCreatorSeriesList() {
    if (creatorState.loading) {
      return `<article class="empty-state"><h2>작품 데이터를 불러오고 있습니다.</h2><p>작가 권한과 저장소 상태를 확인합니다.</p></article>`;
    }

    if (creatorState.error) {
      return `<article class="empty-state"><h2>작가페이지를 사용할 수 없습니다.</h2><p>${escapeHtml(creatorState.error)}</p></article>`;
    }

    if (!creatorState.series.length) {
      return `<article class="empty-state"><h2>등록된 작품이 없습니다.</h2><p>첫 작품을 등록하면 회차 작성과 검수 요청을 진행할 수 있습니다.</p></article>`;
    }

    return creatorState.series.map((series) => `
      <article class="creator-work-card">
        <div class="creator-work-head">
          <div>
            <span class="creator-status">${escapeHtml(creatorStatusLabel(series.status))}</span>
            <h3><a href="${creatorSeriesHref(series.id)}" data-link>${escapeHtml(series.title)}</a></h3>
            <p>${escapeHtml(series.summary || "작품 소개 없음")}</p>
          </div>
          <div class="creator-row-actions">
            <a class="button ghost" href="${creatorSeriesHref(series.id)}" data-link>작품페이지</a>
          </div>
        </div>
      </article>
    `).join("");
  }

  function renderCreatorProfileForm() {
    const profile = creatorState.profile || {};
    return `
      <form class="feedback-form creator-console-form" data-creator-profile-form>
        <span>작가 정보 설정</span>
        <label>공개 작가명<input name="displayName" required minlength="2" maxlength="80" value="${escapeHtml(profile.displayName || creatorState.author?.displayName || "")}"></label>
        <label>작가 아이디<input name="handle" maxlength="48" value="${escapeHtml(profile.handle || "")}" placeholder="public-id"></label>
        <label>작가 아이콘 URL<input name="iconUrl" value="${escapeHtml(profile.iconUrl || "")}" placeholder="/assets/... 또는 https://..."></label>
        <label>공개 표시
          <select name="publicPageEnabled">
            <option value="true" ${profile.publicPageEnabled === false ? "" : "selected"}>공개</option>
            <option value="false" ${profile.publicPageEnabled === false ? "selected" : ""}>비공개</option>
          </select>
        </label>
        <label class="creator-form-wide">작가 소개<textarea name="bio" maxlength="1000">${escapeHtml(profile.bio || "")}</textarea></label>
        <p class="form-status" data-creator-profile-status role="status" aria-live="polite"></p>
        <button class="button primary" type="submit">작가정보 저장</button>
      </form>
    `;
  }

  function renderCreatorNewSeriesDialog() {
    return `
      <dialog class="creator-dialog" data-creator-series-dialog>
        <form class="feedback-form creator-console-form" data-creator-new-series-form method="dialog">
          <div class="creator-dialog-head">
            <span>작품 등록</span>
            <button class="button ghost" type="button" data-creator-close-dialog>닫기</button>
          </div>
          <label>작품명<input name="title" required minlength="2" maxlength="120" placeholder="예: 봉봉 패밀리 캠핑"></label>
          <p class="creator-empty-line">제목만 등록하면 작품 ID가 생성되고 작품페이지로 이동합니다. 장르, 세계관, 표지는 작품페이지에서 이어서 입력합니다.</p>
          <p class="form-status" data-creator-new-series-status role="status" aria-live="polite"></p>
          <button class="button primary" type="submit">등록 후 작품페이지로 이동</button>
        </form>
      </dialog>
    `;
  }

  function renderCreatorDashboardContent() {
    const container = document.querySelector("[data-creator-content]");
    if (!container) return;
    const view = creatorViewParams();

    if (creatorState.error || creatorState.loading) {
      container.innerHTML = `<section class="section creator-console-section"><div class="creator-work-list">${renderCreatorSeriesList()}</div></section>`;
      return;
    }

    if (view.episodeId) {
      renderCreatorEpisodePage(container, view.episodeId);
      return;
    }

    if (view.seriesId) {
      renderCreatorSeriesPage(container, view.seriesId);
      return;
    }

    container.innerHTML = `
      <section class="section creator-console-section">
        ${renderCreatorPageHeader({
          breadcrumbs: [{ label: "작가 스튜디오" }],
          eyebrow: "Creator Studio",
          title: "작가페이지",
          description: "대시보드, 작가 정보, 작품 목록을 한 화면에서 관리합니다.",
          actions: `<button class="button primary" type="button" data-creator-open-series-dialog>작품 등록</button>`,
          tabs: [
            { label: "대시보드", href: "#creator-dashboard" },
            { label: "작가 정보", href: "#creator-profile" },
            { label: "작품 목록", href: "#creator-works" }
          ]
        })}
      </section>

      <section class="section creator-console-section" id="creator-dashboard">
        <div class="dashboard-grid creator-dashboard-grid">
          ${[
            ["작품", creatorState.series.length],
            ["검수 대기 회차", creatorSummaryNumber("episodes", "REVIEW_REQUESTED")],
            ["보완 요청", creatorSummaryNumber("episodes", "REVISION_REQUESTED")],
            ["독자 피드백", Number(creatorState.summary?.feedbackCount || 0)]
          ].map(([label, value]) => `
            <article class="dashboard-card">
              <h3>${escapeHtml(label)}</h3>
              <strong class="creator-metric">${escapeHtml(value)}</strong>
            </article>
          `).join("")}
        </div>
      </section>

      <section class="section muted-band creator-console-section" id="creator-profile">
        <div class="creator-console-layout">
          ${renderCreatorProfileForm()}
        </div>
      </section>

      <section class="section creator-console-section" id="creator-works">
        <div class="section-heading">
          <p class="eyebrow">Works</p>
          <h2>내 작품</h2>
        </div>
        <div class="creator-work-list">${renderCreatorSeriesList()}</div>
      </section>
      ${renderCreatorNewSeriesDialog()}
    `;
  }

  function renderCreatorSeriesPage(container, seriesId) {
    const series = findCreatorSeries(seriesId);
    if (!series) {
      container.innerHTML = `<section class="empty-state page"><h2>작품을 찾지 못했습니다.</h2>${link("/creator-studio", "작가페이지", "button primary")}</section>`;
      return;
    }
    const episodes = creatorState.episodesBySeries[series.id] || [];
    const editable = ["DRAFT", "REVISION_REQUESTED"].includes(series.status);

    container.innerHTML = `
      <section class="section creator-console-section">
        ${renderCreatorPageHeader({
          breadcrumbs: [
            { label: "작가 스튜디오", href: "/creator-studio" },
            { label: "내 작품", href: "/creator-studio#creator-works" },
            { label: series.title }
          ],
          eyebrow: "Work",
          title: series.title,
          description: "작품 설정과 세계관을 정리하고 회차 목록을 관리합니다.",
          status: creatorStatusLabel(series.status),
          actions: link("/creator-studio", "작가페이지", "button ghost"),
          tabs: [
            { label: "작품 설정", href: "#series-settings" },
            { label: "세계관/기획", href: "#series-settings" },
            { label: "회차 목록", href: "#series-episodes" }
          ]
        })}
      </section>

      <section class="section creator-console-section" id="series-settings">
        <div class="creator-console-layout">
          <form class="creator-inline-form" data-creator-series-form data-series-id="${escapeHtml(series.id)}">
            <label><span>작품명</span><input name="title" value="${escapeHtml(series.title)}" ${editable ? "" : "readonly"}></label>
            <label><span>장르</span><input name="genre" value="${escapeHtml(series.genre || "")}" ${editable ? "" : "readonly"}></label>
            <label><span>태그</span><input name="tags" value="${escapeHtml((series.tags || []).join(", "))}" ${editable ? "" : "readonly"}></label>
            <label><span>표지 URL</span><input name="coverUrl" value="${escapeHtml(series.coverUrl || "")}" ${editable ? "" : "readonly"}></label>
            <label class="creator-form-wide"><span>세계관/작품 소개</span><textarea name="summary" ${editable ? "" : "disabled"}>${escapeHtml(series.summary)}</textarea></label>
            <div class="creator-form-actions">
              <p class="form-status" data-creator-series-status role="status" aria-live="polite">${editable ? "" : "검수 중이거나 공개 단계인 작품은 수정할 수 없습니다."}</p>
              <button class="button primary" type="submit" ${editable ? "" : "disabled"}>작품 저장</button>
            </div>
          </form>
          <form class="feedback-form creator-console-form" data-creator-new-episode-form data-series-id="${escapeHtml(series.id)}">
            <span>회차 추가</span>
            <label>회차 번호<input name="number" type="number" min="1" max="9999" placeholder="비우면 자동"></label>
            <label>회차명<input name="title" required minlength="2" maxlength="120"></label>
            <p class="form-status" data-creator-new-episode-status role="status" aria-live="polite"></p>
            <button class="button primary" type="submit">추가 후 회차페이지로 이동</button>
          </form>
        </div>
      </section>
      <section class="section creator-console-section" id="series-episodes">
        <div class="section-heading">
          <p class="eyebrow">Episodes</p>
          <h2>회차목록</h2>
        </div>
        <div class="creator-episode-list">${episodes.length ? episodes.map(renderCreatorEpisodeRow).join("") : `<p class="creator-empty-line">아직 등록된 회차가 없습니다.</p>`}</div>
      </section>
    `;
  }

  function renderCreatorImageRow(image) {
    return `
      <article class="creator-image-row">
        <img src="${escapeHtml(image.imageUrl)}" alt="${escapeHtml(image.altText || "회차 이미지")}">
        <form class="creator-inline-form" data-creator-image-form data-image-id="${escapeHtml(image.id)}">
          <label><span>순서</span><input name="sortOrder" type="number" min="1" value="${escapeHtml(image.sortOrder)}"></label>
          <label><span>간격(px)</span><input name="gapAfter" type="number" min="0" max="240" value="${escapeHtml(image.gapAfter)}"></label>
          <label><span>사이 색상</span><input name="backgroundColor" value="${escapeHtml(image.backgroundColor)}"></label>
          <label class="creator-form-wide"><span>이미지 URL</span><input name="imageUrl" type="url" value="${escapeHtml(image.imageUrl)}"></label>
          <label class="creator-form-wide"><span>대체 텍스트</span><input name="altText" maxlength="300" value="${escapeHtml(image.altText)}"></label>
          <div class="creator-form-actions">
            <p class="form-status" data-creator-image-status role="status" aria-live="polite"></p>
            <button class="button primary" type="submit">이미지 설정 저장</button>
          </div>
        </form>
      </article>
    `;
  }

  function renderCreatorEpisodePage(container, episodeId) {
    const episode = findCreatorEpisode(episodeId);
    if (!episode) {
      container.innerHTML = `<section class="empty-state page"><h2>회차를 찾지 못했습니다.</h2>${link("/creator-studio", "작가페이지", "button primary")}</section>`;
      return;
    }
    const series = findCreatorSeries(episode.seriesId);
    const images = creatorState.episodeImagesByEpisode[episode.id] || [];
    const editable = ["DRAFT", "REVISION_REQUESTED"].includes(episode.status);

    container.innerHTML = `
      <section class="section creator-console-section">
        ${renderCreatorPageHeader({
          breadcrumbs: [
            { label: "작가 스튜디오", href: "/creator-studio" },
            { label: "내 작품", href: "/creator-studio#creator-works" },
            series ? { label: series.title, href: creatorSeriesHref(series.id) } : null,
            { label: `${episode.number}화. ${episode.title}` }
          ],
          eyebrow: "Episode",
          title: `${episode.number}화. ${episode.title}`,
          description: "회차 상태, 원고, 이미지 등록과 사이 처리 설정을 관리합니다.",
          status: creatorStatusLabel(episode.status),
          actions: `
            ${series ? link(creatorSeriesHref(series.id), "작품페이지", "button ghost") : ""}
            ${link("/creator-studio", "작가페이지", "button ghost")}
          `,
          tabs: [
            { label: "회차 상태", href: "#episode-status" },
            { label: "이미지 관리", href: "#episode-images" },
            { label: "이미지 사이 처리", href: "#episode-processing" },
            { label: "검수", href: "#episode-status" }
          ]
        })}
      </section>

      <section class="section creator-console-section" id="episode-status">
        <div class="creator-console-layout">
          <form class="creator-inline-form" data-creator-episode-form data-episode-id="${escapeHtml(episode.id)}">
            <label><span>회차 번호</span><input name="number" type="number" min="1" max="9999" value="${escapeHtml(episode.number)}" ${editable ? "" : "readonly"}></label>
            <label><span>회차명</span><input name="title" value="${escapeHtml(episode.title)}" ${editable ? "" : "readonly"}></label>
            <label class="creator-form-wide"><span>원고/대표 이미지 URL</span><input name="contentUrl" type="url" value="${escapeHtml(episode.contentUrl || "")}" ${editable ? "" : "readonly"}></label>
            <label class="creator-form-wide"><span>회차 요약</span><textarea name="summary" ${editable ? "" : "disabled"}>${escapeHtml(episode.summary || "")}</textarea></label>
            <label class="creator-form-wide"><span>원고 메모</span><textarea name="draftBody" ${editable ? "" : "disabled"}>${escapeHtml(episode.draftBody || "")}</textarea></label>
            <div class="creator-form-actions">
              <p class="form-status" data-creator-episode-status role="status" aria-live="polite">${editable ? "" : "검수 중이거나 공개 단계인 회차는 수정할 수 없습니다."}</p>
              <button class="button primary" type="submit" ${editable ? "" : "disabled"}>회차 저장</button>
            </div>
          </form>
          <article class="creator-work-card">
            <span class="creator-status">${escapeHtml(creatorStatusLabel(episode.status))}</span>
            <h3>회차 상태</h3>
            <p>${escapeHtml(episode.reviewNote || "검수 메모가 없습니다.")}</p>
            <button class="button ghost" type="button" data-creator-review-episode="${escapeHtml(episode.id)}" ${editable ? "" : "disabled"}>검수요청</button>
          </article>
        </div>
      </section>
      <section class="section muted-band creator-console-section" id="episode-processing">
        <div class="creator-console-layout">
          <form class="feedback-form creator-console-form" data-creator-new-image-form data-episode-id="${escapeHtml(episode.id)}">
            <span>회차 이미지 등록</span>
            <label>이미지 URL<input name="imageUrl" type="url" required placeholder="https://..."></label>
            <label>대체 텍스트<input name="altText" maxlength="300"></label>
            <label>이미지 뒤 간격(px)<input name="gapAfter" type="number" min="0" max="240" value="0"></label>
            <label>사이 색상<input name="backgroundColor" value="#ffffff"></label>
            <p class="form-status" data-creator-new-image-status role="status" aria-live="polite"></p>
            <button class="button primary" type="submit">이미지 추가</button>
          </form>
          <article class="creator-work-card">
            <span class="creator-status">계획</span>
            <h3>이미지 사이 처리</h3>
            <p>현재는 간격과 배경색 데이터를 저장합니다. 자동 여백 합성, 일괄 색상 보정, 다중 파일 업로드는 후속 구현 범위입니다.</p>
          </article>
        </div>
      </section>
      <section class="section creator-console-section" id="episode-images">
        <div class="section-heading">
          <p class="eyebrow">Images</p>
          <h2>등록 이미지</h2>
        </div>
        <div class="creator-image-list">${images.length ? images.map(renderCreatorImageRow).join("") : `<p class="creator-empty-line">등록된 이미지가 없습니다.</p>`}</div>
      </section>
    `;
  }

  async function loadCreatorEpisodes(seriesId) {
    const payload = await apiJson(`/api/creator/series/${encodeURIComponent(seriesId)}/episodes`);
    creatorState.episodesBySeries[seriesId] = payload.episodes || [];
  }

  async function loadCreatorEpisodeImages(episodeId) {
    const payload = await apiJson(`/api/creator/episodes/${encodeURIComponent(episodeId)}/images`);
    creatorState.episodeImagesByEpisode[episodeId] = payload.images || [];
  }

  async function loadCreatorDashboard() {
    if (creatorState.loading) return;
    creatorState.loading = true;
    creatorState.error = null;
    renderCreatorDashboardContent();

    try {
      const view = creatorViewParams();
      const params = new URLSearchParams();
      if (view.seriesId) params.set("series", view.seriesId);
      if (view.episodeId) params.set("episode", view.episodeId);
      const payload = await apiJson(`/api/creator/workspace${params.toString() ? `?${params}` : ""}`);
      creatorState.author = payload.author || null;
      creatorState.profile = payload.profile || null;
      creatorState.summary = payload.summary || null;
      creatorState.series = payload.series || [];
      creatorState.episodesBySeries = payload.episodesBySeries || {};
      creatorState.episodeImagesByEpisode = payload.episodeImagesByEpisode || {};
      creatorState.loaded = true;
    } catch (error) {
      creatorState.error = error.message;
    } finally {
      creatorState.loading = false;
      renderCreatorDashboardContent();
    }
  }

  function renderCreatorStudio() {
    const loginUrl = buildLoginUrl(currentReturnTo());
    const author = authState.author;

    if (!authState.checked) {
      main.innerHTML = `
        <section class="page-hero split">
          <div>
            <p class="eyebrow">Creator Studio</p>
            <h1>작가페이지</h1>
            <p>승인 작가 권한을 확인하고 있습니다.</p>
          </div>
          <div class="info-panel">
            <strong>권한 확인</strong>
            <p>통합로그인 세션과 웹툰 작가 권한을 서버 기준으로 확인합니다.</p>
          </div>
        </section>
      `;
      return;
    }

    if (!authState.authenticated) {
      main.innerHTML = `
        <section class="page-hero split">
          <div>
            <p class="eyebrow">Creator Studio</p>
            <h1>작가페이지</h1>
            <p>작가페이지는 통합로그인 후 승인 작가 권한이 확인된 계정만 사용할 수 있습니다.</p>
            <div class="hero-actions">
              <a class="button primary" href="${escapeHtml(loginUrl)}">통합로그인</a>
              ${link("/creators", "작가신청 안내", "button ghost")}
            </div>
          </div>
          <div class="info-panel">
            <strong>로그인 필요</strong>
            <p>로그인 후 작가 권한을 다시 확인합니다.</p>
          </div>
        </section>
      `;
      return;
    }

    if (!isActiveAuthor(author)) {
      const applicationStatus = authState.authorApplication?.status
        ? `현재 작가신청 상태는 ${escapeHtml(authState.authorApplication.status)}입니다.`
        : "작가신청을 제출하면 운영 검수 후 작가 권한이 부여됩니다.";
      main.innerHTML = `
        <section class="page-hero split">
          <div>
            <p class="eyebrow">Creator Studio</p>
            <h1>작가 권한 필요</h1>
            <p>이 계정은 아직 승인 작가 권한이 없습니다. ${applicationStatus}</p>
            <div class="hero-actions">
              ${link("/creators", authState.authorApplication ? "작가신청 상태 보기" : "작가신청 안내", "button primary")}
              ${link("/mypage", "마이페이지", "button ghost")}
            </div>
          </div>
          <div class="info-panel">
            <strong>권한 기준</strong>
            <p>작가페이지는 서버 API에서 승인 작가 상태 또는 승인된 작가 role/email allowlist를 확인한 경우에만 표시합니다.</p>
          </div>
        </section>
      `;
      return;
    }

    main.innerHTML = `
      <section class="page-hero split">
        <div>
          <p class="eyebrow">Creator Studio</p>
          <h1>작가페이지</h1>
          <p>${escapeHtml(author.displayName || "승인 작가")} 계정의 작가 권한이 확인되었습니다. 작품 등록, 회차 작성, 검수 요청을 실제 서버 API 기준으로 처리합니다.</p>
          <div class="hero-actions">
            ${link("/mypage", "마이페이지", "button primary")}
            ${link("/partnership", "협업문의 보기", "button ghost")}
          </div>
        </div>
        <div class="info-panel">
          <strong>작가 운영 범위</strong>
          <div class="tag-row">
            <span>작가신청</span>
            <span>피드백</span>
            <span>웹툰 관리</span>
            <span>회차 제작</span>
            <span>광고 협의</span>
          </div>
        </div>
      </section>

      <div data-creator-content></div>
    `;

    loadCreatorDashboard();
  }

  function renderSettingControl(setting) {
    const key = setting.key;
    const value = setting.value;

    if (key === "feedback.moderationMode") {
      return `
        <select name="value" data-setting-type="string">
          ${["post", "pre", "closed"].map((option) => `
            <option value="${option}" ${value === option ? "selected" : ""}>${option}</option>
          `).join("")}
        </select>
      `;
    }

    if (typeof value === "boolean") {
      return `
        <select name="value" data-setting-type="boolean">
          <option value="true" ${value ? "selected" : ""}>활성</option>
          <option value="false" ${!value ? "selected" : ""}>비활성</option>
        </select>
      `;
    }

    if (key === "siteNotice" || key === "maintenanceBanner") {
      return `
        <textarea name="value" rows="5" data-setting-type="json" placeholder='{"enabled":true,"title":"공지","body":"내용"}'>${escapeHtml(value === null ? "" : JSON.stringify(value, null, 2))}</textarea>
      `;
    }

    return `<input name="value" type="email" data-setting-type="nullable-string" value="${escapeHtml(value || "")}" placeholder="ops@example.com">`;
  }

  function renderSettingsList(settings) {
    return Object.values(settings).map((setting) => `
      <form class="admin-setting-row" data-admin-setting-form data-setting-key="${escapeHtml(setting.key)}">
        <div>
          <strong>${escapeHtml(setting.label)}</strong>
          <span>${escapeHtml(setting.key)}</span>
          <small>${setting.public ? "공개 설정" : "관리자 전용"} · ${escapeHtml(setting.source || "default")}</small>
        </div>
        <label>
          <span class="sr-only">${escapeHtml(setting.label)} 값</span>
          ${renderSettingControl(setting)}
        </label>
        <button class="button ghost" type="submit">저장</button>
        <p class="form-status" data-admin-setting-status role="status" aria-live="polite"></p>
      </form>
    `).join("");
  }

  function parseSettingFormValue(form) {
    const field = form.elements.value;
    const type = field.dataset.settingType;
    const rawValue = field.value.trim();

    if (type === "boolean") return rawValue === "true";
    if (type === "json") return rawValue ? JSON.parse(rawValue) : null;
    if (type === "nullable-string") return rawValue || null;
    return rawValue;
  }

  async function loadAdminDashboard() {
    const status = document.querySelector("[data-admin-status]");
    const content = document.querySelector("[data-admin-content]");
    if (!status || !content) return;

    status.textContent = "관리자 권한을 확인하는 중입니다.";

    try {
      const adminResult = await apiJson("/api/admin/me");
      const settingsResult = await apiJson("/api/admin/site-settings");
      status.textContent = `${adminResult.admin.authType === "session" ? "통합로그인 role" : "운영 토큰"} 기준으로 관리자 권한이 확인되었습니다.`;
      content.innerHTML = `
        <section class="section admin-section">
          <div class="section-heading">
            <p class="eyebrow">Site Settings</p>
            <h2>사이트 설정</h2>
            <p>공개 페이지가 사용하는 운영 플래그와 관리자 전용 알림 설정입니다.</p>
          </div>
          ${settingsResult.warning ? `<p class="admin-warning">DB 설정 저장소가 준비되지 않아 기본값으로 표시합니다. 저장하려면 site_settings 테이블이 필요합니다.</p>` : ""}
          <div class="admin-settings-list">
            ${renderSettingsList(settingsResult.settings)}
          </div>
        </section>
      `;
    } catch (error) {
      const returnTo = currentReturnTo();
      status.textContent = error.message;
      content.innerHTML = `
        <section class="section">
          <div class="account-layout">
            <article class="account-panel">
              <h3>관리자 접근 필요</h3>
              <p>이 화면은 사이트관리자 권한이 확인된 계정만 사용할 수 있습니다. 서버 API가 최종 권한을 다시 검증합니다.</p>
              <div class="hero-actions">
                <a class="button primary" href="${escapeHtml(buildLoginUrl(returnTo))}">통합로그인</a>
                ${link("/", "홈으로", "button ghost")}
              </div>
            </article>
            <article class="account-panel">
              <h3>운영 준비 상태</h3>
              <p>초기 운영은 WEBTOON_ADMIN_API_TOKEN 또는 auth role 기반으로 보호되며, 토큰과 secret 값은 화면에 저장하지 않습니다.</p>
              <div class="tag-row">
                <span>서버 검증</span>
                <span>감사 로그</span>
                <span>Allowlist 설정</span>
              </div>
            </article>
          </div>
        </section>
      `;
    }
  }

  function renderAdminPage() {
    main.innerHTML = `
      <section class="page-hero split admin-hero">
        <div>
          <p class="eyebrow">Site Admin</p>
          <h1>사이트관리자</h1>
          <p>작가신청, 피드백 검수, 공개 페이지 운영 플래그를 조정하는 운영자 전용 콘솔입니다. 권한은 서버 API에서 재검증합니다.</p>
          <div class="hero-actions">
            ${link("/mypage", "마이페이지", "button ghost")}
            ${link("/creator-studio", "작가페이지", "button ghost")}
          </div>
        </div>
        <div class="info-panel">
          <strong>관리자 상태</strong>
          <p data-admin-status>관리자 권한 확인을 준비하고 있습니다.</p>
        </div>
      </section>

      <section class="section">
        <div class="dashboard-grid admin-dashboard-grid">
          ${[
            ["작가신청", "신청 목록, 승인, 반려 API를 단계적으로 연결합니다."],
            ["피드백 검수", "신고/숨김 상태와 사전검수 모드를 관리합니다."],
            ["사이트 설정", "작가모집, 피드백, 교육자료, 공지 노출을 제어합니다."],
            ["운영 로그", "관리자 변경 액션을 감사 로그로 남깁니다."]
          ].map(([title, body]) => `
            <article class="dashboard-card">
              <h3>${escapeHtml(title)}</h3>
              <p>${escapeHtml(body)}</p>
            </article>
          `).join("")}
        </div>
      </section>

      <div data-admin-content></div>
    `;

    loadAdminDashboard();
  }

  function updateAuthLinks() {
    const memberLink = document.querySelector('[data-auth-label="member"]');
    const creatorLink = document.querySelector('[data-auth-label="creator"]');
    const returnTo = currentReturnTo();

    if (memberLink) {
      memberLink.setAttribute("href", authState.authenticated ? "/mypage" : buildLoginUrl(returnTo));
      memberLink.toggleAttribute("data-link", authState.authenticated);
      memberLink.setAttribute("title", authState.authenticated ? "마이페이지" : "통합로그인");
      memberLink.setAttribute("aria-label", authState.authenticated ? "마이페이지" : "통합로그인");
    }

    if (creatorLink) {
      const activeAuthor = isActiveAuthor();
      const href = !authState.authenticated ? buildLoginUrl(returnTo) : activeAuthor ? "/creator-studio" : "/creators";
      const label = !authState.authenticated
        ? "통합로그인 후 작가신청"
        : activeAuthor
          ? "작가페이지"
          : authState.authorApplication
            ? "작가신청 상태"
            : "작가신청";
      creatorLink.setAttribute("href", href);
      creatorLink.toggleAttribute("data-link", authState.authenticated);
      creatorLink.setAttribute("title", label);
      creatorLink.setAttribute("aria-label", label);
    }
  }

  async function refreshAuthState() {
    try {
      const response = await fetch(authConfig.meUrl || "/api/me", {
        credentials: "include",
        headers: {
          Accept: "application/json"
        }
      });

      if (response.ok) {
        const payload = await response.json();
        authState.authenticated = Boolean(payload.authenticated);
        authState.profileComplete = Boolean(payload.profileComplete);
        authState.user = payload.user || null;
        authState.author = payload.author || null;
        authState.authorApplication = payload.authorApplication || null;
        if (!authState.authenticated) {
          throw new Error("webtoon auth state unauthenticated");
        }
      } else {
        throw new Error("webtoon auth state unavailable");
      }
    } catch {
      try {
        const response = await fetch(authConfig.sessionUrl, {
          credentials: "include",
          headers: {
            Accept: "application/json"
          }
        });

        if (!response.ok) throw new Error("auth session unavailable");
        const session = await response.json();
        authState.authenticated = Boolean(session.authenticated);
        authState.profileComplete = Boolean(session.profileComplete);
        authState.user = session.user || null;
        authState.author = null;
        authState.authorApplication = null;
      } catch {
        authState.authenticated = false;
        authState.profileComplete = false;
        authState.user = null;
        authState.author = null;
        authState.authorApplication = null;
      }
    } finally {
      authState.checked = true;
      updateAuthLinks();
    }
  }

  function renderAuthorPage(authorId) {
    const author = getAuthor(authorId);
    if (!author) return renderNotFound();
    const works = data.series.filter((series) => series.authorId === author.id);

    main.innerHTML = `
      <section class="profile-hero">
        ${renderAuthorAvatar(author, "author-avatar large")}
        <div>
          <p class="eyebrow">Author</p>
          <h1>${escapeHtml(author.name)}</h1>
          <p>${escapeHtml(author.bio)}</p>
          <div class="tag-row">
            ${author.keywords.map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join("")}
          </div>
        </div>
      </section>
      <section class="section">
        <div class="section-heading">
          <p class="eyebrow">Works</p>
          <h2>작품목록</h2>
        </div>
        <div class="webtoon-grid">
          ${works.map(renderSeriesCard).join("")}
        </div>
      </section>
      ${renderFeedbackBox("author", author.name)}
    `;
  }

  function renderSeriesPage(authorId, seriesId) {
    const author = getAuthor(authorId);
    const series = getSeries(seriesId);
    if (!author || !series || series.authorId !== author.id) return renderNotFound();
    const episodes = getEpisodesForSeries(series.id);

    main.innerHTML = `
      <section class="work-hero">
        <img src="/${series.cover}" alt="${escapeHtml(series.title)} 표지">
        <div>
          <p class="eyebrow">Webtoon</p>
          <h1>${escapeHtml(series.title)}</h1>
          <p>${escapeHtml(series.summary)}</p>
          <div class="meta-row large">
            <span>${escapeHtml(series.status)}</span>
            <span>${escapeHtml(series.schedule)}</span>
            <span>${escapeHtml(series.ageRating)}</span>
          </div>
          <div class="tag-row">
            ${series.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
          </div>
          <div class="hero-actions">
            ${link(pathForAuthor(author), `작가 ${author.name}`, "button ghost")}
            ${episodes[0] ? link(pathForEpisode(episodes[0]), "1화 보기", "button primary") : ""}
          </div>
        </div>
      </section>
      <section id="episodes" class="section muted-band">
        <div class="section-heading">
          <p class="eyebrow">Episodes</p>
          <h2>회차</h2>
        </div>
        <div class="episode-list">
          ${episodes.map(renderEpisodeTile).join("")}
        </div>
      </section>
      ${renderFeedbackBox("series", series.title)}
    `;
  }

  function renderEpisodePage(authorId, seriesId, number) {
    const author = getAuthor(authorId);
    const series = getSeries(seriesId);
    const episodes = getEpisodesForSeries(seriesId);
    const episode = episodes.find((item) => String(item.number) === String(number));
    if (!author || !series || series.authorId !== author.id || !episode) return renderNotFound();

    main.innerHTML = `
      <section class="reader">
        <div class="reader-head">
          <div>
            <p class="eyebrow">${escapeHtml(series.title)}</p>
            <h1>${episode.number}화. ${escapeHtml(episode.title)}</h1>
            <p>${escapeHtml(episode.summary)}</p>
          </div>
        </div>
        ${renderEpisodeNav(series, episodes, episode, "회차 상단 이동")}
        <div class="reader-panels">
          <aside class="reader-production" aria-label="회차 제작 정보">
            <span>${escapeHtml(episode.status)}</span>
            <span>${escapeHtml(episode.publishedAt)}</span>
            <span>${episode.production ? episode.production.panelCount : episode.panels.length}컷</span>
            <span>${escapeHtml(episode.production ? episode.production.review : "제작 정보 준비중")}</span>
          </aside>
          ${episode.panels.map((panel, index) => `
            <figure class="panel-frame">
              <img src="/${panel.image}" alt="${escapeHtml(episode.title)} ${index + 1}컷">
              <figcaption>
                <span>${String(index + 1).padStart(2, "0")} · ${escapeHtml(panel.beat || "장면")} · ${escapeHtml(panel.shot || "웹툰 컷")}</span>
                <strong>${escapeHtml(panel.dialogue || "")}</strong>
                <p>${escapeHtml(panel.caption)}</p>
              </figcaption>
            </figure>
          `).join("") || `
            <article class="empty-state">
              <h2>준비중인 회차입니다.</h2>
              <p>이미지와 회차 정보가 확정되면 공개됩니다.</p>
            </article>
          `}
        </div>
        ${renderEpisodeNav(series, episodes, episode, "회차 하단 이동")}
      </section>
      ${renderFeedbackBox("episode", `${series.title} ${episode.number}화`)}
    `;
  }

  function renderNotFound() {
    main.innerHTML = `
      <section class="empty-state page">
        <p class="eyebrow">Not Found</p>
        <h1>페이지를 찾을 수 없습니다.</h1>
        <p>메인에서 작가, 작품, 회차 순서로 다시 이동해주세요.</p>
        ${link("/", "메인으로", "button primary")}
      </section>
    `;
  }

  function parseRoute() {
    const cleanPath = window.location.pathname.replace(/\/+$/, "") || "/";
    if (cleanPath === "/") return { name: "home" };
    if (cleanPath === "/webtoons") return { name: "webtoons" };
    if (cleanPath === "/creators/training") return { name: "creatorTraining" };
    if (cleanPath === "/creators") return { name: "creators" };
    if (cleanPath === "/partnership") return { name: "partnership" };
    if (cleanPath === "/mypage") return { name: "mypage" };
    if (cleanPath === "/creator-studio") return { name: "creatorStudio" };
    if (cleanPath === "/admin") return { name: "admin" };
    const parts = cleanPath.split("/").filter(Boolean);
    if (parts[0] && parts[0].startsWith("@") && parts.length === 1) {
      return { name: "author", authorId: parts[0].slice(1) };
    }
    if (parts[0] && parts[0].startsWith("@") && parts[1] === "works" && parts[2] && parts.length === 3) {
      return { name: "series", authorId: parts[0].slice(1), seriesId: parts[2] };
    }
    if (parts[0] && parts[0].startsWith("@") && parts[1] === "works" && parts[2] && parts[3] === "episodes" && parts[4]) {
      return { name: "episode", authorId: parts[0].slice(1), seriesId: parts[2], number: parts[4] };
    }
    return { name: "notFound" };
  }

  function render() {
    const route = parseRoute();
    updateDocumentMeta(route);

    if (route.name === "home") renderHome();
    if (route.name === "webtoons") renderWebtoonsPage();
    if (route.name === "creatorTraining") renderCreatorTrainingPage();
    if (route.name === "creators") renderCreatorsPage();
    if (route.name === "partnership") renderPartnershipPage();
    if (route.name === "mypage") renderMypage();
    if (route.name === "creatorStudio") renderCreatorStudio();
    if (route.name === "admin") renderAdminPage();
    if (route.name === "author") renderAuthorPage(route.authorId);
    if (route.name === "series") renderSeriesPage(route.authorId, route.seriesId);
    if (route.name === "episode") renderEpisodePage(route.authorId, route.seriesId, route.number);
    if (route.name === "notFound") renderNotFound();

    if (window.location.hash) {
      requestAnimationFrame(() => {
        document.querySelector(window.location.hash)?.scrollIntoView({ block: "start" });
      });
    } else {
      window.scrollTo({ top: 0 });
    }

    updateAuthLinks();
  }

  document.addEventListener("click", (event) => {
    const anchor = event.target.closest("a[data-link]");
    if (!anchor) return;
    const url = new URL(anchor.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    window.history.pushState({}, "", `${url.pathname}${url.search}${url.hash}`);
    render();
  });

  document.addEventListener("submit", (event) => {
    const form = event.target.closest("form[data-search-form]");
    if (!form) return;
    event.preventDefault();
    const query = new FormData(form).get("q")?.toString().trim() || "";
    const nextPath = query ? `/webtoons?q=${encodeURIComponent(query)}` : "/webtoons";
    window.history.pushState({}, "", nextPath);
    render();
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-author-application-form]");
    if (!form) return;
    event.preventDefault();

    const status = form.querySelector("[data-author-application-status]");
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const payload = {
      displayName: formData.get("displayName")?.toString() || "",
      portfolioUrl: formData.get("portfolioUrl")?.toString() || "",
      introduction: formData.get("introduction")?.toString() || "",
      samplePlan: formData.get("samplePlan")?.toString() || ""
    };

    status.textContent = "작가신청을 저장하는 중입니다.";
    button?.setAttribute("disabled", "disabled");

    try {
      await apiJson("/api/author-applications", {
        method: "POST",
        body: JSON.stringify(payload)
      });
      form.reset();
      status.textContent = "작가신청이 접수되었습니다. 운영 검수 후 상태가 갱신됩니다.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button?.removeAttribute("disabled");
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-admin-setting-form]");
    if (!form) return;
    event.preventDefault();

    const key = form.dataset.settingKey;
    const status = form.querySelector("[data-admin-setting-status]");
    const button = form.querySelector('button[type="submit"]');

    status.textContent = "설정을 저장하는 중입니다.";
    button?.setAttribute("disabled", "disabled");

    try {
      const value = parseSettingFormValue(form);
      await apiJson(`/api/admin/site-settings/${encodeURIComponent(key)}`, {
        method: "PATCH",
        body: JSON.stringify({ value })
      });
      status.textContent = "저장되었습니다.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button?.removeAttribute("disabled");
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-creator-new-series-form]");
    if (!form) return;
    event.preventDefault();

    const status = form.querySelector("[data-creator-new-series-status]");
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    status.textContent = "작품을 등록하는 중입니다.";
    button?.setAttribute("disabled", "disabled");

    try {
      const payload = await apiJson("/api/creator/series", {
        method: "POST",
        body: JSON.stringify({
          title: formData.get("title")?.toString() || ""
        })
      });
      form.reset();
      status.textContent = "작품이 등록되었습니다.";
      await loadCreatorDashboard();
      navigateCreatorStudio({ seriesId: payload.series.id });
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button?.removeAttribute("disabled");
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-creator-profile-form]");
    if (!form) return;
    event.preventDefault();

    const status = form.querySelector("[data-creator-profile-status]");
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    status.textContent = "작가정보를 저장하는 중입니다.";
    button?.setAttribute("disabled", "disabled");

    try {
      const payload = await apiJson("/api/creator/profile", {
        method: "PATCH",
        body: JSON.stringify({
          displayName: formData.get("displayName")?.toString() || "",
          handle: formData.get("handle")?.toString() || "",
          iconUrl: formData.get("iconUrl")?.toString() || "",
          bio: formData.get("bio")?.toString() || "",
          publicPageEnabled: formData.get("publicPageEnabled")?.toString() !== "false"
        })
      });
      creatorState.profile = payload.profile || creatorState.profile;
      status.textContent = "저장되었습니다.";
      renderCreatorDashboardContent();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button?.removeAttribute("disabled");
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-creator-series-form]");
    if (!form) return;
    event.preventDefault();

    const status = form.querySelector("[data-creator-series-status]");
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const seriesId = form.dataset.seriesId;

    status.textContent = "작품을 저장하는 중입니다.";
    button?.setAttribute("disabled", "disabled");

    try {
      await apiJson(`/api/creator/series/${encodeURIComponent(seriesId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: formData.get("title")?.toString() || "",
          genre: formData.get("genre")?.toString() || "",
          tags: formData.get("tags")?.toString() || "",
          coverUrl: formData.get("coverUrl")?.toString() || "",
          summary: formData.get("summary")?.toString() || ""
        })
      });
      status.textContent = "저장되었습니다.";
      await loadCreatorDashboard();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button?.removeAttribute("disabled");
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-creator-new-episode-form]");
    if (!form) return;
    event.preventDefault();

    const status = form.querySelector("[data-creator-new-episode-status]");
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const seriesId = form.dataset.seriesId || formData.get("seriesId")?.toString() || "";

    if (!seriesId) {
      status.textContent = "회차를 등록할 작품을 선택해주세요.";
      return;
    }

    status.textContent = "회차를 등록하는 중입니다.";
    button?.setAttribute("disabled", "disabled");

    try {
      const payload = await apiJson(`/api/creator/series/${encodeURIComponent(seriesId)}/episodes`, {
        method: "POST",
        body: JSON.stringify({
          number: formData.get("number")?.toString() || "",
          title: formData.get("title")?.toString() || ""
        })
      });
      form.reset();
      status.textContent = "회차가 등록되었습니다.";
      await loadCreatorDashboard();
      navigateCreatorStudio({ episodeId: payload.episode.id });
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button?.removeAttribute("disabled");
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-creator-episode-form]");
    if (!form) return;
    event.preventDefault();

    const status = form.querySelector("[data-creator-episode-status]");
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const episodeId = form.dataset.episodeId;

    status.textContent = "회차를 저장하는 중입니다.";
    button?.setAttribute("disabled", "disabled");

    try {
      await apiJson(`/api/creator/episodes/${encodeURIComponent(episodeId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          number: formData.get("number")?.toString() || "",
          title: formData.get("title")?.toString() || "",
          contentUrl: formData.get("contentUrl")?.toString() || "",
          summary: formData.get("summary")?.toString() || "",
          draftBody: formData.get("draftBody")?.toString() || ""
        })
      });
      status.textContent = "저장되었습니다.";
      await loadCreatorDashboard();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button?.removeAttribute("disabled");
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-creator-new-image-form]");
    if (!form) return;
    event.preventDefault();

    const status = form.querySelector("[data-creator-new-image-status]");
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const episodeId = form.dataset.episodeId;

    status.textContent = "이미지를 등록하는 중입니다.";
    button?.setAttribute("disabled", "disabled");

    try {
      await apiJson(`/api/creator/episodes/${encodeURIComponent(episodeId)}/images`, {
        method: "POST",
        body: JSON.stringify({
          imageUrl: formData.get("imageUrl")?.toString() || "",
          altText: formData.get("altText")?.toString() || "",
          gapAfter: formData.get("gapAfter")?.toString() || "0",
          backgroundColor: formData.get("backgroundColor")?.toString() || "#ffffff"
        })
      });
      form.reset();
      await loadCreatorEpisodeImages(episodeId);
      renderCreatorDashboardContent();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button?.removeAttribute("disabled");
    }
  });

  document.addEventListener("submit", async (event) => {
    const form = event.target.closest("form[data-creator-image-form]");
    if (!form) return;
    event.preventDefault();

    const status = form.querySelector("[data-creator-image-status]");
    const button = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);
    const imageId = form.dataset.imageId;

    status.textContent = "이미지 설정을 저장하는 중입니다.";
    button?.setAttribute("disabled", "disabled");

    try {
      const payload = await apiJson(`/api/creator/images/${encodeURIComponent(imageId)}`, {
        method: "PATCH",
        body: JSON.stringify({
          sortOrder: formData.get("sortOrder")?.toString() || "",
          imageUrl: formData.get("imageUrl")?.toString() || "",
          altText: formData.get("altText")?.toString() || "",
          gapAfter: formData.get("gapAfter")?.toString() || "0",
          backgroundColor: formData.get("backgroundColor")?.toString() || "#ffffff"
        })
      });
      await loadCreatorEpisodeImages(payload.image.episodeId);
      renderCreatorDashboardContent();
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button?.removeAttribute("disabled");
    }
  });

  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-creator-open-series-dialog]");
    if (!openButton) return;
    const dialog = document.querySelector("[data-creator-series-dialog]");
    if (dialog?.showModal) dialog.showModal();
  });

  document.addEventListener("click", (event) => {
    const closeButton = event.target.closest("[data-creator-close-dialog]");
    if (!closeButton) return;
    closeButton.closest("dialog")?.close();
  });

  document.addEventListener("click", async (event) => {
    const refreshButton = event.target.closest("[data-creator-load-episodes]");
    if (!refreshButton) return;
    const seriesId = refreshButton.dataset.creatorLoadEpisodes;
    refreshButton.setAttribute("disabled", "disabled");
    try {
      await loadCreatorEpisodes(seriesId);
      renderCreatorDashboardContent();
    } finally {
      refreshButton.removeAttribute("disabled");
    }
  });

  document.addEventListener("click", async (event) => {
    const reviewButton = event.target.closest("[data-creator-review-episode]");
    if (!reviewButton) return;
    const episodeId = reviewButton.dataset.creatorReviewEpisode;
    reviewButton.setAttribute("disabled", "disabled");

    try {
      await apiJson(`/api/creator/episodes/${encodeURIComponent(episodeId)}/request-review`, {
        method: "POST",
        body: JSON.stringify({})
      });
      await loadCreatorDashboard();
    } catch (error) {
      reviewButton.textContent = error.message;
    } finally {
      reviewButton.removeAttribute("disabled");
    }
  });

  document.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-feedback-submit]");
    if (!button) return;
    const form = button.closest("[data-feedback-form]");
    const textarea = form?.querySelector("textarea");
    const status = form?.querySelector("[data-feedback-status]");
    const value = textarea?.value.trim();

    if (!value) {
      textarea?.focus();
      return;
    }

    const originalText = button.textContent;
    status.textContent = "피드백을 저장하는 중입니다.";
    button.setAttribute("disabled", "disabled");

    try {
      await apiJson("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          targetType: form.dataset.targetType,
          targetId: form.dataset.targetId,
          body: value
        })
      });
      textarea.value = "";
      status.textContent = "피드백이 저장되었습니다.";
    } catch (error) {
      status.textContent = error.message;
    } finally {
      button.textContent = originalText;
      button.removeAttribute("disabled");
    }
  });

  window.addEventListener("popstate", render);
  render();
  Promise.all([refreshPublicSettings(), refreshAuthState()]).then(render);
})();
