const fs = require("fs");
const path = require("path");

const approvedDir = path.join(__dirname, "..", "data", "approved");
const apiDir = path.join(__dirname, "..", "site", "api");
const apiAppsDir = path.join(apiDir, "apps");

fs.mkdirSync(apiAppsDir, { recursive: true });

const files = fs.existsSync(approvedDir)
  ? fs.readdirSync(approvedDir).filter((f) => f.endsWith(".json"))
  : [];

const apps = files
  .map((f) => JSON.parse(fs.readFileSync(path.join(approvedDir, f), "utf8")))
  .sort((a, b) => a.appId - b.appId);

// Full aggregate database, same shape as database.example.json but as an array.
fs.writeFileSync(path.join(apiDir, "database.json"), JSON.stringify(apps, null, 2) + "\n");

// Lightweight search index for the front-end.
const index = apps.map((app) => {
  const lang = app.generalInfo.defaultLanguage;
  const meta = app.localizedMetadata[lang] || Object.values(app.localizedMetadata)[0];
  return {
    appId: app.appId,
    bundleId: app.bundleId,
    name: meta.title,
    subtitle: meta.subtitle,
    developer: app.developer.name,
    category: app.generalInfo.category.primary,
    iconUrl: app.assets.appIconUrl,
    isFree: app.commercial.isFree,
    price: app.commercial.price,
    averageUserRating: app.ratingsAndReviews.averageUserRating,
  };
});
fs.writeFileSync(path.join(apiDir, "index.json"), JSON.stringify(index, null, 2) + "\n");

// Clear stale per-app files, then write current ones (lookup-by-id).
for (const existing of fs.readdirSync(apiAppsDir)) {
  if (existing.endsWith(".json")) fs.unlinkSync(path.join(apiAppsDir, existing));
}
for (const app of apps) {
  fs.writeFileSync(path.join(apiAppsDir, `${app.appId}.json`), JSON.stringify(app, null, 2) + "\n");
}

console.log(`Built database.json, index.json and ${apps.length} per-app file(s).`);
