const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { spawnSync } = require("child_process");
const { ROOT } = require("./_catalog-loader");
const {
  buildPublicCatalogArtifact,
  readStaticCatalogBaseline,
  stableHash
} = require("../api/_lib/public-catalog-snapshot");
const { loadStaticCatalog } = require("../api/_lib/catalog-import-service");

const GENERATED_SCRIPT_PATH = "/data/catalog.generated.js";
const GENERATED_ARTIFACT_PATH = path.join(ROOT, "public", "data", "catalog.generated.js");
const PUBLIC_ROOT = path.join(ROOT, "public");
const APP_SCRIPT_PATH = path.join(ROOT, "assets", "js", "app.js");
const SITE_ORIGIN = "https://webtoon.wcamper.com";

function fail(message) {
  console.error(message);
  process.exit(1);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    env: { ...process.env, ...options.env },
    encoding: "utf8"
  });

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    fail(`${command} ${args.join(" ")} failed with status ${result.status}`);
  }

  return result;
}

class SmokeElement {
  constructor(tagName = "div") {
    this.tagName = tagName.toUpperCase();
    this.attributes = {};
    this.children = [];
    this.dataset = {};
    this.textContent = "";
    this.value = "";
    this._innerHTML = "";
  }

  set innerHTML(value) {
    this._innerHTML = String(value ?? "");
  }

  get innerHTML() {
    return this._innerHTML;
  }

  setAttribute(name, value) {
    this.attributes[name] = String(value);
    if (name.startsWith("data-")) {
      const key = name
        .slice(5)
        .replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      this.dataset[key] = String(value);
    }
  }

  getAttribute(name) {
    return this.attributes[name];
  }

  removeAttribute(name) {
    delete this.attributes[name];
  }

  toggleAttribute(name, force) {
    if (force) {
      this.setAttribute(name, "");
      return true;
    }
    this.removeAttribute(name);
    return false;
  }

  append(child) {
    this.children.push(child);
  }

  querySelector() {
    return null;
  }

  closest() {
    return null;
  }

  scrollIntoView() {}
}

function createDocument() {
  const main = new SmokeElement("main");
  const head = new SmokeElement("head");
  const headElements = new Map();

  head.querySelector = (selector) => headElements.get(selector) || null;
  head.append = (element) => {
    head.children.push(element);
    if (element.attributes.property) {
      headElements.set(`meta[property="${element.attributes.property}"]`, element);
    }
    if (element.attributes.name) {
      headElements.set(`meta[name="${element.attributes.name}"]`, element);
    }
    if (element.attributes.rel) {
      headElements.set(`link[rel="${element.attributes.rel}"]`, element);
    }
  };

  return {
    title: "",
    head,
    body: new SmokeElement("body"),
    createElement: (tagName) => new SmokeElement(tagName),
    querySelector: (selector) => {
      if (selector === "#main") return main;
      if (selector === "main") return main;
      return null;
    },
    addEventListener() {},
    removeEventListener() {},
    _main: main,
    _headElements: headElements
  };
}

function createLocation(routePath) {
  const url = new URL(routePath, SITE_ORIGIN);
  return {
    origin: url.origin,
    pathname: url.pathname,
    search: url.search,
    hash: url.hash,
    href: url.href
  };
}

function createSmokeContext(routePath) {
  const document = createDocument();
  const window = {
    document,
    location: createLocation(routePath),
    history: {
      pushState(_state, _title, nextPath) {
        this.lastPath = nextPath;
        window.location = createLocation(nextPath);
      }
    },
    addEventListener() {},
    removeEventListener() {},
    scrollTo() {}
  };

  const context = {
    window,
    document,
    console,
    URL,
    URLSearchParams,
    FormData: class FormData {
      get() {
        return "";
      }
    },
    requestAnimationFrame: (callback) => callback(),
    fetch: async () => ({
      ok: false,
      json: async () => ({})
    }),
    setTimeout,
    clearTimeout,
    Promise
  };

  return vm.createContext(context);
}

function renderRoute(routePath) {
  const context = createSmokeContext(routePath);
  vm.runInContext(fs.readFileSync(GENERATED_ARTIFACT_PATH, "utf8"), context, {
    filename: GENERATED_ARTIFACT_PATH
  });
  vm.runInContext(fs.readFileSync(APP_SCRIPT_PATH, "utf8"), context, {
    filename: APP_SCRIPT_PATH
  });

  return {
    title: context.document.title,
    html: context.document._main.innerHTML,
    catalog: context.window.WCAMPER_WEBTOON
  };
}

function assertIncludes(value, expected, label) {
  if (!String(value).includes(expected)) {
    fail(`${label} did not include expected text: ${expected}`);
  }
}

function outputPathForRoute(routePath) {
  if (routePath === "/") return path.join(PUBLIC_ROOT, "index.html");
  return path.join(PUBLIC_ROOT, routePath, "index.html");
}

function assertGeneratedScriptReference(routePath) {
  const outputPath = outputPathForRoute(routePath);
  const html = fs.readFileSync(outputPath, "utf8");
  assertIncludes(html, `src="${GENERATED_SCRIPT_PATH}"`, path.relative(ROOT, outputPath));
}

function main() {
  run("node", ["scripts/generate-public-catalog.js", "--dry-run", "--write-artifact"]);
  run("node", ["scripts/generate-static-pages.js"], {
    env: {
      WCAMPER_CATALOG_SCRIPT_PATH: GENERATED_SCRIPT_PATH
    }
  });
  run("node", ["scripts/generate-public-catalog.js", "--dry-run", "--write-artifact"]);

  const generatedCatalog = loadStaticCatalog(GENERATED_ARTIFACT_PATH);
  const expectedArtifact = buildPublicCatalogArtifact(loadStaticCatalog(), {
    baseline: readStaticCatalogBaseline()
  });
  const generatedHash = stableHash(generatedCatalog);

  if (generatedHash !== expectedArtifact.payloadHash) {
    fail("Generated artifact payload hash does not match expected public artifact payload.");
  }

  if (!expectedArtifact.baselineComparison.matches) {
    fail("Generated artifact does not match the published baseline.");
  }

  const series = generatedCatalog.series[0];
  const author = generatedCatalog.authors.find((item) => item.id === series.authorId);
  const episode = generatedCatalog.episodes.find((item) => item.seriesId === series.id);

  if (!author || !series || !episode) {
    fail("Generated catalog does not include the representative author, series, and episode.");
  }

  const routes = [
    {
      label: "home",
      path: "/",
      expectedTitle: "AI로 만드는 캠핑 웹툰 플랫폼",
      expectedBody: series.title
    },
    {
      label: "series",
      path: `/@${author.id}/works/${series.id}`,
      expectedTitle: series.title,
      expectedBody: "회차"
    },
    {
      label: "episode",
      path: `/@${author.id}/works/${series.id}/episodes/${episode.number}`,
      expectedTitle: `${episode.number}화. ${episode.title}`,
      expectedBody: episode.summary
    }
  ];

  routes.forEach((route) => {
    assertGeneratedScriptReference(route.path);
    const rendered = renderRoute(route.path);
    assertIncludes(rendered.title, route.expectedTitle, `${route.label} document title`);
    assertIncludes(rendered.html, route.expectedBody, `${route.label} rendered body`);
  });

  console.log("Public catalog browser route smoke");
  console.log(`Runtime script: ${GENERATED_SCRIPT_PATH}`);
  console.log(`Generated artifact: ${path.relative(ROOT, GENERATED_ARTIFACT_PATH)}`);
  console.log(`Payload hash: ${generatedHash}`);
  console.log(`Routes: ${routes.map((route) => route.path).join(", ")}`);
  console.log(`Series: ${generatedCatalog.series.length}`);
  console.log(`Episodes: ${generatedCatalog.episodes.length}`);
  console.log("Baseline match: yes");
}

main();
