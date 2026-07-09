const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.resolve(__dirname, "..");
const SITE_ORIGIN = "https://webtoon.wcamper.com";
const DEFAULT_OG_IMAGE = "assets/img/thumbnails/bd-crew-episode-01-thumbnail.webp";

function loadCatalog() {
  const catalogPath = path.join(ROOT, "data", "catalog.js");
  const source = fs.readFileSync(catalogPath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: catalogPath });
  return context.window.WCAMPER_WEBTOON;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function absoluteUrl(routePath) {
  return `${SITE_ORIGIN}${routePath}`;
}

function absoluteAssetUrl(assetPath) {
  if (!assetPath) return absoluteAssetUrl(DEFAULT_OG_IMAGE);
  if (/^https?:\/\//.test(assetPath)) return assetPath;
  const cleanPath = assetPath.startsWith("/") ? assetPath : `/${assetPath}`;
  return encodeURI(`${SITE_ORIGIN}${cleanPath}`);
}

function pathForAuthor(author) {
  return `/@${author.id}`;
}

function pathForSeries(data, series) {
  const author = getAuthor(data, series.authorId);
  return `${pathForAuthor(author)}/works/${series.id}`;
}

function pathForEpisode(data, episode) {
  const series = getSeries(data, episode.seriesId);
  return `${pathForSeries(data, series)}/episodes/${episode.number}`;
}

function getAuthor(data, id) {
  return data.authors.find((author) => author.id === id);
}

function getSeries(data, id) {
  return data.series.find((series) => series.id === id);
}

function getEpisodesForSeries(data, seriesId) {
  const series = getSeries(data, seriesId);
  if (!series) return [];
  return series.episodes
    .map((id) => data.episodes.find((episode) => episode.id === id))
    .filter(Boolean);
}

function firstPanelImage(episode) {
  const firstPanel = episode.panels && episode.panels[0];
  return firstPanel && firstPanel.image;
}

function normalizePage(page) {
  return {
    title: page.title,
    description: page.description,
    image: page.image || DEFAULT_OG_IMAGE,
    routePath: page.routePath,
    type: page.type || "website"
  };
}

function pagesForCatalog(data) {
  const pages = [
    normalizePage({
      routePath: "/",
      title: "WCAMPER Webtoon",
      description: "캠핑 크루의 실제 컷과 단톡방 코미디를 연재하는 WCAMPER 웹툰 플랫폼",
      image: DEFAULT_OG_IMAGE,
      type: "website"
    }),
    normalizePage({
      routePath: "/404",
      title: "페이지를 찾을 수 없습니다 | WCAMPER Webtoon",
      description: "WCAMPER Webtoon에서 작가, 작품, 회차 순서로 다시 이동해주세요.",
      image: DEFAULT_OG_IMAGE,
      type: "website"
    })
  ];

  data.authors.forEach((author) => {
    pages.push(normalizePage({
      routePath: pathForAuthor(author),
      title: `${author.name} | WCAMPER Webtoon`,
      description: author.bio,
      image: author.image || DEFAULT_OG_IMAGE,
      type: "profile"
    }));
  });

  data.series.forEach((series) => {
    const seriesPath = pathForSeries(data, series);
    pages.push(normalizePage({
      routePath: seriesPath,
      title: `${series.title} | WCAMPER Webtoon`,
      description: series.summary,
      image: series.thumbnail || series.cover || DEFAULT_OG_IMAGE,
      type: "website"
    }));

    getEpisodesForSeries(data, series.id).forEach((episode) => {
      pages.push(normalizePage({
        routePath: pathForEpisode(data, episode),
        title: `${series.title} ${episode.number}화. ${episode.title} | WCAMPER Webtoon`,
        description: episode.summary,
        image: episode.thumbnail || firstPanelImage(episode) || series.thumbnail || series.cover || DEFAULT_OG_IMAGE,
        type: "article"
      }));
    });
  });

  return pages;
}

function headHtml(page) {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const url = page.routePath === "/404" ? absoluteUrl("/404.html") : absoluteUrl(page.routePath);
  const image = absoluteAssetUrl(page.image);

  return `  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${title}</title>
  <meta name="description" content="${description}">
  <link rel="canonical" href="${escapeHtml(url)}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:type" content="${escapeHtml(page.type)}">
  <meta property="og:url" content="${escapeHtml(url)}">
  <meta property="og:image" content="${escapeHtml(image)}">
  <meta property="og:site_name" content="WCAMPER Webtoon">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${escapeHtml(image)}">
  <link rel="icon" href="/assets/img/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="/assets/css/style.css">`;
}

function bodyHtml() {
  return `<body>
  <a class="skip" href="#main">본문으로 이동</a>

  <header class="site-header">
    <div class="header-inner">
      <a class="brand" href="/" aria-label="WCAMPER Webtoon 홈" data-link>
        <span class="brand-mark">W</span>
        <span>
          <strong>WCAMPER</strong>
          <small>WEBTOON</small>
        </span>
      </a>
      <nav class="nav" aria-label="주요 메뉴">
        <a href="/#latest" data-link>최신웹툰</a>
        <a href="/#rookies" data-link>신인작가</a>
        <a href="/#popular-webtoons" data-link>인기웹툰</a>
        <a href="/#popular-authors" data-link>인기작가</a>
        <a href="/#creator-call" data-link>작가모집</a>
        <a href="/#ad-contact" data-link>협업문의</a>
      </nav>
    </div>
  </header>

  <main id="main" tabindex="-1"></main>

  <footer class="site-footer">
    <div>
      <strong>WCAMPER Webtoon</strong>
      <p>캠핑 크루와 가족의 이야기를 웹툰으로 연재합니다.</p>
    </div>
    <div class="footer-links">
      <a href="/#creator-call" data-link>작가모집</a>
      <a href="/#ad-contact" data-link>협업(광고)문의</a>
    </div>
  </footer>

  <script src="/data/catalog.js"></script>
  <script src="/assets/js/app.js"></script>
</body>`;
}

function htmlForPage(page) {
  return `<!doctype html>
<html lang="ko">
<head>
${headHtml(page)}
</head>
${bodyHtml()}
</html>
`;
}

function outputPathForRoute(routePath) {
  if (routePath === "/") return path.join(ROOT, "index.html");
  if (routePath === "/404") return path.join(ROOT, "404.html");
  return path.join(ROOT, routePath, "index.html");
}

function writePage(page) {
  const outputPath = outputPathForRoute(page.routePath);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, htmlForPage(page));
  return path.relative(ROOT, outputPath);
}

function main() {
  const data = loadCatalog();
  const pages = pagesForCatalog(data);
  const written = pages.map(writePage);
  console.log(`Generated ${written.length} static pages`);
}

main();
