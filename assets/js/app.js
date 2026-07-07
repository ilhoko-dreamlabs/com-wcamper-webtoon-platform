(function () {
  const data = window.WCAMPER_WEBTOON;
  const seriesList = document.querySelector("#series-list");
  const episodeList = document.querySelector("#episode-list");
  const reader = document.querySelector("#reader");
  const readerSeries = document.querySelector("#reader-series");
  const readerTitle = document.querySelector("#reader-title");
  const readerPanels = document.querySelector("#reader-panels");
  const readerClose = document.querySelector("#reader-close");

  function getSeries(id) {
    return data.series.find((series) => series.id === id);
  }

  function renderSeries() {
    seriesList.innerHTML = data.series.map((series) => {
      const count = series.episodes.length;
      return `
        <article class="series-card">
          <img src="${series.cover}" alt="${series.title} 표지">
          <div class="series-body">
            <div class="meta-row">
              <span>${series.status}</span>
              <span>${count}화</span>
            </div>
            <h3>${series.title}</h3>
            <p>${series.summary}</p>
            <div class="tag-row">
              ${series.tags.map((tag) => `<span>${tag}</span>`).join("")}
            </div>
          </div>
        </article>
      `;
    }).join("");
  }

  function renderEpisodes() {
    episodeList.innerHTML = data.episodes.map((episode) => {
      const series = getSeries(episode.seriesId);
      return `
        <article class="episode-card">
          <img src="${episode.thumbnail}" alt="${episode.title} 썸네일">
          <div>
            <div class="meta-row">
              <span>${series.title}</span>
              <span>${episode.status}</span>
            </div>
            <h3>${episode.number}화. ${episode.title}</h3>
            <p>${episode.summary}</p>
            <button class="button primary read-button" type="button" data-episode-id="${episode.id}">읽기</button>
          </div>
        </article>
      `;
    }).join("");
  }

  function openReader(episodeId) {
    const episode = data.episodes.find((item) => item.id === episodeId);
    const series = getSeries(episode.seriesId);
    readerSeries.textContent = series.title;
    readerTitle.textContent = `${episode.number}화. ${episode.title}`;
    readerPanels.innerHTML = episode.panels.map((panel, index) => `
      <figure class="panel-frame">
        <img src="${panel.image}" alt="${episode.title} ${index + 1}컷">
        <figcaption>${panel.caption}</figcaption>
      </figure>
    `).join("");
    reader.hidden = false;
    reader.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  episodeList.addEventListener("click", (event) => {
    const button = event.target.closest("[data-episode-id]");
    if (!button) return;
    openReader(button.dataset.episodeId);
  });

  readerClose.addEventListener("click", () => {
    reader.hidden = true;
    document.querySelector("#episodes").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  renderSeries();
  renderEpisodes();
})();
