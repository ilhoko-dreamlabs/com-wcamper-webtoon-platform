(function () {
  const data = window.WCAMPER_WEBTOON;
  const main = document.querySelector("#main");
  const siteOrigin = "https://webtoon.wcamper.com";
  const defaultOgImage = "assets/img/thumbnails/bd-crew-episode-01-thumbnail.webp";

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
        image: "assets/img/authors/bongdal-universe-comics-logo.png",
        path: "/creators",
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

    return {
      title: "AI로 만드는 캠핑 웹툰 플랫폼 | WCAMPER Webtoon",
      description: "캠핑, 크루, 가족 여행, 브랜드 이야기를 AI 웹툰으로 제작하고 공개 연재하는 WCAMPER 웹툰 플랫폼입니다.",
      image: defaultOgImage,
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
      anonymousCount: 0,
      memberCount: 0,
      samples: []
    };

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
              <span>인증 회원 ${target.memberCount}</span>
              <span>익명 ${target.anonymousCount}</span>
            </div>
          </article>
          <form class="feedback-form">
            <label>
              <span>작성 방식</span>
              <select aria-label="작성 방식">
                <option>익명 피드백</option>
                <option>${escapeHtml(base.authProvider.name)} 인증 회원</option>
              </select>
            </label>
            <label class="feedback-text">
              <span>의견</span>
              <textarea rows="4" placeholder="${escapeHtml(target.label)}에 대한 의견을 남겨주세요"></textarea>
            </label>
            <button class="button primary" type="button">피드백 남기기</button>
          </form>
        </div>
        ${target.samples.length ? `
          <div class="feedback-samples">
            ${target.samples.map((sample) => `
              <blockquote>
                <span>${sample.mode === "member" ? "인증 회원" : "익명"}</span>
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
    const heroSeries = popularSeries[0];
    const heroImage = heroSeries.thumbnail || heroSeries.cover;

    main.innerHTML = `
      <section class="hero">
        <div class="hero-cover">
          <img src="/${heroImage}" alt="WCAMPER AI 웹툰 대표 이미지">
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
    const latestEpisodes = getPublishedEpisodes().slice(0, 6);
    const popularSeries = data.series.slice().sort((a, b) => Number.parseFloat(b.stats.views) - Number.parseFloat(a.stats.views));
    const authors = data.authors;

    main.innerHTML = `
      <section class="page-hero">
        <div class="section-heading">
          <p class="eyebrow">Webtoons</p>
          <h1>웹툰</h1>
          <p>WCAMPER에서 공개 중인 AI 웹툰과 기획작을 최신 회차, 작가, 인기 작품 기준으로 탐색합니다.</p>
        </div>
      </section>

      <section id="latest" class="section">
        <div class="section-heading">
          <p class="eyebrow">Latest</p>
          <h2>최신웹툰</h2>
        </div>
        <div class="episode-grid">
          ${latestEpisodes.map(renderEpisodeTile).join("")}
        </div>
      </section>

      <section id="rookies" class="section muted-band">
        <div class="section-heading">
          <p class="eyebrow">Rookie Creators</p>
          <h2>신인작가</h2>
        </div>
        <div class="author-grid">
          ${authors.map(renderAuthorCard).join("")}
        </div>
      </section>

      <section id="popular-webtoons" class="section">
        <div class="section-heading">
          <p class="eyebrow">Popular Webtoons</p>
          <h2>인기웹툰</h2>
        </div>
        <div class="webtoon-grid">
          ${popularSeries.map(renderSeriesCard).join("")}
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
    main.innerHTML = `
      <section class="page-hero split">
        <div>
          <p class="eyebrow">Creator Call</p>
          <h1>웹툰기획력으로 작가되기</h1>
          <p>그림 실력만이 아니라 캐릭터, 에피소드, 세계관, 대사 감각을 가진 창작자를 모집합니다. AI 제작 도구와 함께 캠핑, 여행, 일상 이야기를 연재물로 만듭니다.</p>
          <div class="hero-actions">
            <a class="button primary" href="mailto:creator@wcamper.com">작가 지원 문의</a>
            ${link("/webtoons", "연재작 보기", "button ghost")}
          </div>
        </div>
        <div class="info-panel">
          <strong>지원 키워드</strong>
          <div class="tag-row">
            <span>스토리 기획</span>
            <span>캐릭터</span>
            <span>캠핑/여행</span>
            <span>AI 제작</span>
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
    if (cleanPath === "/creators") return { name: "creators" };
    if (cleanPath === "/partnership") return { name: "partnership" };
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
    if (route.name === "creators") renderCreatorsPage();
    if (route.name === "partnership") renderPartnershipPage();
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
  }

  document.addEventListener("click", (event) => {
    const anchor = event.target.closest("a[data-link]");
    if (!anchor) return;
    const url = new URL(anchor.href);
    if (url.origin !== window.location.origin) return;
    event.preventDefault();
    window.history.pushState({}, "", `${url.pathname}${url.hash}`);
    render();
  });

  window.addEventListener("popstate", render);
  render();
})();
