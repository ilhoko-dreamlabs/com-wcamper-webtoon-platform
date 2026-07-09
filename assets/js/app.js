(function () {
  const data = window.WCAMPER_WEBTOON;
  const seriesHome = document.querySelector("#series-home");
  const episodeToolbar = document.querySelector("#episode-toolbar");
  const episodeList = document.querySelector("#episode-list");
  const authorProfile = document.querySelector("#author-profile");
  const feedbackHub = document.querySelector("#feedback-hub");
  const goalBoard = document.querySelector("#goal-board");
  const crewList = document.querySelector("#crew-list");
  const noteList = document.querySelector("#note-list");
  const heroRead = document.querySelector("#hero-read");
  const reader = document.querySelector("#reader");
  const readerSeries = document.querySelector("#reader-series");
  const readerTitle = document.querySelector("#reader-title");
  const readerPanels = document.querySelector("#reader-panels");
  const readerClose = document.querySelector("#reader-close");

  function getSeries(id) {
    return data.series.find((series) => series.id === id);
  }

  function getAuthor(id) {
    return data.authors.find((author) => author.id === id);
  }

  function getFirstReadableEpisode() {
    return data.episodes.find((episode) => episode.panels.length > 0);
  }

  function renderSeriesHome() {
    seriesHome.innerHTML = data.series.map((series) => {
      const count = series.episodes.length;
      return `
        <article class="series-profile">
          <img src="${series.cover}" alt="${series.title} 표지">
          <div class="series-body">
            <div class="meta-row">
              <span>${series.status}</span>
              <span>${series.schedule}</span>
              <span>${series.ageRating}</span>
            </div>
            <h3>${series.title}</h3>
            <p>${series.summary}</p>
            <div class="tag-row">
              ${series.tags.map((tag) => `<span>${tag}</span>`).join("")}
            </div>
          </div>
          <div class="series-side">
            <div class="stat-grid" aria-label="${series.title} 작품 지표">
              <div><strong>${series.stats.views}</strong><span>조회</span></div>
              <div><strong>${series.stats.likes}</strong><span>좋아요</span></div>
              <div><strong>${series.stats.favorites}</strong><span>관심</span></div>
              <div><strong>${count}</strong><span>회차</span></div>
            </div>
            <ul class="highlight-list">
              ${series.highlights.map((highlight) => `<li>${highlight}</li>`).join("")}
            </ul>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderEpisodes() {
    const openCount = data.episodes.filter((episode) => episode.status === "공개").length;
    const latestPublishedAt = data.episodes
      .filter((episode) => episode.status === "공개")
      .map((episode) => episode.publishedAt)
      .sort()
      .at(-1);
    episodeToolbar.innerHTML = `
      <span>전체 ${data.episodes.length}화</span>
      <span>공개 ${openCount}화</span>
      <span>최신 업데이트 ${latestPublishedAt || "준비중"}</span>
    `;

    episodeList.innerHTML = data.episodes.map((episode) => {
      const series = getSeries(episode.seriesId);
      const canRead = episode.panels.length > 0;
      const panelLabel = episode.production ? `${episode.production.panelCount}컷` : `${episode.panels.length}컷`;
      return `
        <article class="episode-card">
          <img src="${episode.thumbnail}" alt="${episode.title} 썸네일">
          <div>
            <div class="meta-row">
              <span>${series.title}</span>
              <span>${episode.status}</span>
              <span>${episode.readTime}</span>
              <span>${panelLabel}</span>
            </div>
            <h3>${episode.number}화. ${episode.title}</h3>
            <p>${episode.summary}</p>
            <div class="episode-meta-grid" aria-label="${episode.title} 회차 지표">
              <span>공개일 <strong>${episode.publishedAt}</strong></span>
              <span>완독률 <strong>${episode.completionRate || "집계전"}</strong></span>
              <span>검수 <strong>${episode.production ? "완료" : "대기"}</strong></span>
            </div>
            <div class="episode-actions">
              <button class="button primary read-button" type="button" data-episode-id="${episode.id}" ${canRead ? "" : "disabled"}>${canRead ? "읽기" : "준비중"}</button>
              <span>좋아요 ${episode.likes}</span>
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderAuthorProfile() {
    const series = data.series[0];
    const author = getAuthor(series.authorId);
    if (!author) return;

    authorProfile.innerHTML = `
      <article class="author-card">
        <div class="author-avatar" aria-hidden="true">${author.avatar}</div>
        <div class="author-copy">
          <div class="meta-row">
            <span>${author.title}</span>
            <span>${author.debut}</span>
          </div>
          <h3>${author.name}</h3>
          <p>${author.bio}</p>
          <div class="tag-row">
            ${author.keywords.map((keyword) => `<span>${keyword}</span>`).join("")}
          </div>
          <div class="author-links">
            ${author.links.map((link) => `<a class="button ghost" href="${link.href}">${link.label}</a>`).join("")}
          </div>
        </div>
      </article>
      <div class="work-list" aria-label="작가의 연재 작품">
        ${author.works.map((work) => `
          <article class="work-card">
            <div class="meta-row">
              <span>${work.status}</span>
              <span>${work.meta}</span>
            </div>
            <h3>${work.title}</h3>
            <p>${work.description}</p>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderFeedback() {
    const feedback = data.feedback;
    if (!feedback) return;
    const loginUrl = `${feedback.authProvider.loginUrl}?service=wcamper-webtoon&return_to=${encodeURIComponent("#feedback")}`;

    feedbackHub.innerHTML = `
      <div class="feedback-overview">
        <article class="feedback-auth-card">
          <div>
            <p class="eyebrow">Integrated Auth</p>
            <h3>${feedback.authProvider.name}</h3>
            <p>${feedback.authProvider.description}</p>
          </div>
          <a class="button primary" href="${loginUrl}" target="_blank" rel="noreferrer">인증 회원으로 의견 남기기</a>
        </article>
        <article class="score-card">
          <span>스코어링 기준</span>
          <strong>회원 ${feedback.scoring.memberWeight}x · 익명 ${feedback.scoring.anonymousWeight}x</strong>
          <p>${feedback.scoring.note}</p>
          <div class="tag-row">
            ${feedback.scoring.signals.map((signal) => `<span>${signal}</span>`).join("")}
          </div>
        </article>
      </div>
      <div class="feedback-targets">
        ${feedback.targets.map((target) => `
          <article class="feedback-card" data-feedback-type="${target.type}">
            <div class="feedback-card-head">
              <div>
                <span>${target.label} 피드백</span>
                <h3>${target.title}</h3>
              </div>
              <strong>${target.score}</strong>
            </div>
            <p>${target.prompt}</p>
            <div class="feedback-counts" aria-label="${target.title} 피드백 수">
              <span>인증 회원 ${target.memberCount}</span>
              <span>익명 ${target.anonymousCount}</span>
            </div>
            <div class="feedback-samples">
              ${target.samples.map((sample) => `
                <blockquote>
                  <span>${sample.mode === "member" ? "인증 회원" : "익명"}</span>
                  <p>${sample.body}</p>
                </blockquote>
              `).join("")}
            </div>
            <form class="feedback-form">
              <label>
                <span>의견 대상</span>
                <select aria-label="의견 대상">
                  <option>${target.label}: ${target.title}</option>
                </select>
              </label>
              <label>
                <span>작성 방식</span>
                <select aria-label="작성 방식">
                  <option>익명 피드백</option>
                  <option>auth.wcamper.com 인증 회원</option>
                </select>
              </label>
              <label class="feedback-text">
                <span>의견</span>
                <textarea rows="3" placeholder="${target.label}에 대한 의견을 남겨주세요"></textarea>
              </label>
              <button class="button ghost" type="button">피드백 임시 저장</button>
            </form>
          </article>
        `).join("")}
      </div>
    `;
  }

  function renderGoals() {
    const goals = data.goals;
    if (!goals) return;

    goalBoard.innerHTML = `
      <article class="goal-summary">
        <div>
          <p class="eyebrow">Operating Goals</p>
          <h3>${goals.summary.title}</h3>
          <p>${goals.summary.description}</p>
          <strong>${goals.summary.scoringLink}</strong>
        </div>
        <ul>
          ${goals.rules.map((rule) => `<li>${rule}</li>`).join("")}
        </ul>
      </article>
      <div class="goal-list">
        ${goals.items.map((goal) => {
          const progress = Math.min(Math.round((goal.current / goal.target) * 100), 100);
          return `
            <article class="goal-card" data-goal-type="${goal.targetType}">
              <div class="goal-card-head">
                <div>
                  <span>${goal.targetLabel} 목표</span>
                  <h3>${goal.title}</h3>
                </div>
                <strong>${progress}%</strong>
              </div>
              <p>${goal.targetTitle}</p>
              <div class="goal-meter" aria-label="${goal.title} 달성률 ${progress}%">
                <span style="width: ${progress}%"></span>
              </div>
              <div class="goal-metric">
                <span>${goal.metric}</span>
                <strong>${goal.current}${goal.unit} / ${goal.target}${goal.unit}</strong>
              </div>
              <div class="goal-meta">
                <span>${goal.status}</span>
                <span>${goal.due}까지</span>
              </div>
              <div class="tag-row">
                ${goal.events.map((eventName) => `<span>${eventName}</span>`).join("")}
              </div>
              <p class="goal-achievement">${goal.achievement}</p>
            </article>
          `;
        }).join("")}
      </div>
    `;
  }

  function renderCrew() {
    crewList.innerHTML = data.crew.map((crew) => `
      <article class="crew-card">
        <strong>${crew.name}</strong>
        <span>${crew.role}</span>
        <p>${crew.description}</p>
      </article>
    `).join("");
  }

  function renderNotes() {
    noteList.innerHTML = data.notes.map((note) => `
      <article class="note-card">
        <span>${note.meta}</span>
        <h3>${note.title}</h3>
        <p>${note.body}</p>
      </article>
    `).join("");
  }

  function openReader(episodeId) {
    const episode = data.episodes.find((item) => item.id === episodeId);
    if (!episode || episode.panels.length === 0) return;
    const series = getSeries(episode.seriesId);
    readerSeries.textContent = series.title;
    readerTitle.textContent = `${episode.number}화. ${episode.title}`;
    const production = episode.production ? `
      <aside class="reader-production" aria-label="회차 제작 정보">
        <span>${episode.status}</span>
        <span>${episode.publishedAt}</span>
        <span>${episode.production.panelCount}컷</span>
        <span>${episode.production.review}</span>
      </aside>
    ` : "";
    readerPanels.innerHTML = `
      ${production}
      ${episode.panels.map((panel, index) => `
        <figure class="panel-frame">
          <img src="${panel.image}" alt="${episode.title} ${index + 1}컷">
          <figcaption>
            <span>${String(index + 1).padStart(2, "0")} · ${panel.beat || "장면"} · ${panel.shot || "웹툰 컷"}</span>
            <strong>${panel.dialogue || ""}</strong>
            <p>${panel.caption}</p>
          </figcaption>
        </figure>
      `).join("")}
      <article class="reader-end">
        <p class="eyebrow">Episode End</p>
        <h3>${episode.number}화 끝</h3>
        <p>${episode.production ? episode.production.disclosure : "제작 정보 준비중"}</p>
        <a class="button ghost" href="#feedback">이번 회차 피드백 남기기</a>
      </article>
    `;
    reader.hidden = false;
    reader.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  episodeList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-episode-id]");
    if (!button) return;
    openReader(button.dataset.episodeId);
  });

  heroRead.addEventListener("click", () => {
    const episode = getFirstReadableEpisode();
    if (episode) openReader(episode.id);
  });

  readerClose.addEventListener("click", () => {
    reader.hidden = true;
    document.querySelector("#episodes").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  renderSeriesHome();
  renderEpisodes();
  renderAuthorProfile();
  renderFeedback();
  renderGoals();
  renderCrew();
  renderNotes();
})();
