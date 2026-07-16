const path = require("path");
const { loadStaticCatalog } = require("../api/_lib/catalog-import-service");

const ROOT = path.resolve(__dirname, "..");

function loadCatalog() {
  return loadStaticCatalog(path.join(ROOT, "data", "catalog.js"));
}

module.exports = {
  ROOT,
  loadCatalog
};
