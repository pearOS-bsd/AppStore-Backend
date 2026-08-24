// Admin helper: attach permanent GitHub Release download link(s) to a pending submission.
//
// Usage:
//   node scripts/attach-build.js data/pending/<appId>.json --url <universalUrl> \
//        [--arm64 <arm64Url>] [--x86_64 <x86_64Url>]
const fs = require("fs");
const { validateApp } = require("./validate");

const [, , file, ...rest] = process.argv;
if (!file) {
  console.error("Usage: node scripts/attach-build.js <pending-json-path> --url <url> [--arm64 <url>] [--x86_64 <url>]");
  process.exit(1);
}

const args = {};
for (let i = 0; i < rest.length; i += 2) {
  args[rest[i].replace(/^--/, "")] = rest[i + 1];
}

const app = JSON.parse(fs.readFileSync(file, "utf8"));

if (args.url) app.currentRelease.downloadUrl = args.url;
if (args.arm64 || args.x86_64) {
  app.currentRelease.thinnedDownloads = app.currentRelease.thinnedDownloads || {};
  if (args.arm64) app.currentRelease.thinnedDownloads.arm64 = args.arm64;
  if (args.x86_64) app.currentRelease.thinnedDownloads.x86_64 = args.x86_64;
}

const result = validateApp(app);
if (!result.valid) {
  console.error("Schema validation failed after attaching build:");
  console.error(JSON.stringify(result.errors, null, 2));
  process.exit(1);
}

fs.writeFileSync(file, JSON.stringify(app, null, 2) + "\n");
console.log(`Updated ${file} with build download link(s).`);
