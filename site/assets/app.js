async function loadIndex() {
  const res = await fetch("api/index.json", { cache: "no-store" });
  if (!res.ok) return [];
  return res.json();
}

function cardHtml(app) {
  const price = app.isFree ? "Get" : `$${Number(app.price).toFixed(2)}`;
  return `
    <a class="card" href="app.html?id=${app.appId}">
      <img class="icon" src="${app.iconUrl}" alt="${app.name} icon" loading="lazy" onerror="this.style.visibility='hidden'" />
      <div class="name">${app.name}</div>
      <div class="subtitle">${app.subtitle || ""}</div>
      <div class="meta">
        <span>${app.category}</span>
        <span>${price}</span>
      </div>
    </a>`;
}

function render(apps) {
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  grid.innerHTML = apps.map(cardHtml).join("");
  empty.style.display = apps.length ? "none" : "block";
}

function renderCategories(apps, onSelect) {
  const el = document.getElementById("categories");
  const categories = ["All", ...new Set(apps.map((a) => a.category))];
  let active = "All";
  el.innerHTML = categories
    .map((c) => `<button class="chip${c === active ? " active" : ""}" data-cat="${c}">${c}</button>`)
    .join("");
  el.addEventListener("click", (e) => {
    const btn = e.target.closest(".chip");
    if (!btn) return;
    active = btn.dataset.cat;
    [...el.children].forEach((c) => c.classList.toggle("active", c === btn));
    onSelect(active);
  });
}

(async function init() {
  const apps = await loadIndex();
  let currentCategory = "All";
  let currentQuery = "";

  function applyFilters() {
    const filtered = apps.filter((a) => {
      const matchesCategory = currentCategory === "All" || a.category === currentCategory;
      const matchesQuery = !currentQuery || a.name.toLowerCase().includes(currentQuery) || (a.developer || "").toLowerCase().includes(currentQuery);
      return matchesCategory && matchesQuery;
    });
    render(filtered);
  }

  renderCategories(apps, (cat) => {
    currentCategory = cat;
    applyFilters();
  });

  document.getElementById("search").addEventListener("input", (e) => {
    currentQuery = e.target.value.trim().toLowerCase();
    applyFilters();
  });

  applyFilters();
})();
