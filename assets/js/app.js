(function () {
  const data = window.WCAMPER_WEBTOON;
  const main = document.querySelector("#main");

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

  function renderAuthorCard(author) {
    const works = data.series.filter((series) => series.authorId === author.id);
    const published = works.reduce((sum, series) => (
      sum + getEpisodesForSeries(series.id).filter((episode) => episode.status === "공개").length
    ), 0);
    return `
      <article class="author-tile">
        <a class="author-avatar" href="${pathForAuthor(author)}" data-link>${escapeHtml(author.avatar)}</a>
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
    const latestEpisodes = getPublishedEpisodes().slice(0, 6);
    const popularSeries = data.series.slice().sort((a, b) => Number.parseFloat(b.stats.views) - Number.parseFloat(a.stats.views));
    const authors = data.authors;
    const heroSeries = popularSeries[0];
    const heroAuthor = getAuthor(heroSeries.authorId);
    const heroImage = heroSeries.thumbnail || heroSeries.cover;

    main.innerHTML = `
      <section class="hero">
        <div class="hero-cover">
          <img src="/${heroImage}" alt="${escapeHtml(heroSeries.title)} 대표 이미지">
        </div>
        <div class="hero-content">
          <p class="eyebrow">Camping Webtoon Platform</p>
          <h1>캠핑장에서 시작된 단톡방 웹툰</h1>
          <p>WCAMPER Webtoon은 캠핑 크루, 가족 캠핑, 현장 기록을 모바일 웹툰처럼 이어 보는 연재 공간입니다.</p>
          <div class="hero-meta">
            <span>최신웹툰</span>
            <span>신인작가</span>
            <span>인기웹툰</span>
            <span>인기작가</span>
          </div>
          <div class="hero-actions">
            ${link(pathForSeries(heroSeries), "대표작 보기", "button primary")}
            ${link(pathForAuthor(heroAuthor), "작가 소개")}
          </div>
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

      <section class="contact-band">
        <article id="creator-call" class="contact-card">
          <p class="eyebrow">Creator Call</p>
          <h2>작가모집</h2>
          <p>캠핑, 차박, 가족 여행, 크루 일상을 웹툰으로 연재할 작가를 모집합니다.</p>
          <a class="button primary" href="mailto:creator@wcamper.com">작가 지원 문의</a>
        </article>
        <article id="ad-contact" class="contact-card">
          <p class="eyebrow">Partnership</p>
          <h2>협업(광고)문의</h2>
          <p>캠핑 브랜드, 로컬 캠핑장, 장비 리뷰, 시즌 캠페인 협업 제안을 받습니다.</p>
          <a class="button ghost" href="mailto:ads@wcamper.com">광고 협업 문의</a>
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
        <div class="author-avatar large">${escapeHtml(author.avatar)}</div>
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
      <section class="section muted-band">
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
    const episode = getEpisodesForSeries(seriesId).find((item) => String(item.number) === String(number));
    if (!author || !series || series.authorId !== author.id || !episode) return renderNotFound();

    main.innerHTML = `
      <section class="reader">
        <div class="reader-head">
          ${link(pathForSeries(series), "작품으로", "button ghost")}
          <div>
            <p class="eyebrow">${escapeHtml(series.title)}</p>
            <h1>${episode.number}화. ${escapeHtml(episode.title)}</h1>
            <p>${escapeHtml(episode.summary)}</p>
          </div>
        </div>
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
    if (route.name === "home") renderHome();
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
