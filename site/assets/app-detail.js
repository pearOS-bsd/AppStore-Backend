function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

(async function init() {
  const content = document.getElementById("content");
  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    content.innerHTML = `<div class="empty">No app id given.</div>`;
    return;
  }

  const res = await fetch(`api/apps/${encodeURIComponent(id)}.json`, { cache: "no-store" });
  if (!res.ok) {
    content.innerHTML = `<div class="empty">App not found.</div>`;
    return;
  }
  const app = await res.json();
  const lang = app.generalInfo.defaultLanguage;
  const meta = app.localizedMetadata[lang] || Object.values(app.localizedMetadata)[0];
  document.title = `${meta.title} - pearOS App Store`;

  const price = app.commercial.isFree ? "Get" : `$${Number(app.commercial.price).toFixed(2)} ${app.commercial.currency}`;

  const screenshots = (app.assets.screenshots.pearos || [])
    .map((url) => `<img src="${esc(url)}" alt="screenshot" loading="lazy" />`)
    .join("");

  const entitlements = (app.pearOsRequirements.entitlements || [])
    .map((e) => `<span class="tag">${esc(e)}</span>`)
    .join("") || "<span class=\"tag\">None</span>";

  const iaps = (app.commercial.inAppPurchasesList || [])
    .map((i) => `<li>${esc(i.name)} — $${Number(i.price).toFixed(2)} (${esc(i.type)})</li>`)
    .join("") || "<li>None</li>";

  const downloadUrl = app.currentRelease.downloadUrl;
  const downloadButton = downloadUrl
    ? `<a class="btn" href="${esc(downloadUrl)}">${esc(price)}</a>`
    : `<span class="btn secondary" style="cursor:default;">Not Yet Available</span>`;

  const thinned = app.currentRelease.thinnedDownloads || {};
  const thinnedLinks = ["arm64", "x86_64"]
    .filter((arch) => thinned[arch])
    .map((arch) => `<a href="${esc(thinned[arch])}">${arch === "arm64" ? "arm64" : "x86_64"}</a>`)
    .join(" · ");

  content.innerHTML = `
    <div class="app-header">
      <img class="icon" src="${esc(app.assets.appIconUrl)}" alt="${esc(meta.title)} icon" onerror="this.style.visibility='hidden'" />
      <div>
        <h1>${esc(meta.title)}</h1>
        <div class="subtitle">${esc(meta.subtitle)} · ${esc(app.developer.name)}</div>
        ${downloadButton}
        ${thinnedLinks ? `<div class="subtitle" style="margin-top:8px;">Also available for: ${thinnedLinks}</div>` : ""}
      </div>
    </div>

    <div class="section">
      <h2>Description</h2>
      <p>${esc(meta.description).replace(/\n/g, "<br>")}</p>
    </div>

    ${screenshots ? `<div class="section"><h2>Screenshots</h2><div class="screens">${screenshots}</div></div>` : ""}

    <div class="section">
      <h2>What's New — Version ${esc(app.currentRelease.version)}</h2>
      <p>${esc(meta.whatsNew).replace(/\n/g, "<br>")}</p>
    </div>

    <div class="section">
      <h2>Information</h2>
      <dl class="kv">
        <dt>Bundle ID</dt><dd>${esc(app.bundleId)}</dd>
        <dt>Category</dt><dd>${esc(app.generalInfo.category.primary)}${app.generalInfo.category.secondary ? " / " + esc(app.generalInfo.category.secondary) : ""}</dd>
        <dt>Content Rating</dt><dd>${esc(app.generalInfo.contentAdvisoryRating)}</dd>
        <dt>Version</dt><dd>${esc(app.currentRelease.version)} (build ${esc(app.currentRelease.buildNumber)})</dd>
        <dt>Size</dt><dd>${esc(app.currentRelease.downloadSizeFormatted)}</dd>
        <dt>Minimum pearOS</dt><dd>${esc(app.pearOsRequirements.minimumPearOsVersion)}</dd>
        <dt>Architectures</dt><dd>${esc((app.pearOsRequirements.supportedArchitectures || []).join(", "))}</dd>
        <dt>Developer Website</dt><dd><a href="${esc(app.developer.developerWebsite)}" target="_blank" rel="noopener">${esc(app.developer.developerWebsite)}</a></dd>
        <dt>Support</dt><dd><a href="${esc(app.developer.supportWebsite)}" target="_blank" rel="noopener">${esc(app.developer.supportWebsite)}</a></dd>
        <dt>Rating</dt><dd>${app.ratingsAndReviews.averageUserRating} (${app.ratingsAndReviews.userRatingCount} ratings)</dd>
      </dl>
    </div>

    <div class="section">
      <h2>In-App Purchases</h2>
      <ul>${iaps}</ul>
    </div>

    <div class="section">
      <h2>Privacy</h2>
      <p><a href="${esc(app.appPrivacy.privacyPolicyUrl)}" target="_blank" rel="noopener">Privacy Policy</a></p>
    </div>

    <div class="section">
      <h2>Entitlements &amp; Security</h2>
      <p>App Sandbox: ${app.pearOsRequirements.pearAppSandboxEnabled ? "Enabled" : "Disabled"} · Hardened Runtime: ${app.pearOsRequirements.hardenedRuntime ? "Enabled" : "Disabled"}</p>
      <div>${entitlements}</div>
    </div>
  `;
})();
