// --- workshop type -> placeholder image mapping ---
const TYPE_IMAGE_MAP = [
  { match: /古民家|古屋|祖父宅/, slug: "kominka" },
  { match: /中古住宅/, slug: "nakako" },
  { match: /コンテナ/, slug: "container" },
  { match: /アパート|賃貸/, slug: "apart" },
  { match: /庭/, slug: "niwa" },
  { match: /離れ|物置/, slug: "hanare" },
  { match: /自宅/, slug: "jitaku" },
];

function imageForType(type) {
  if (type) {
    for (const t of TYPE_IMAGE_MAP) {
      if (t.match.test(type)) return `images/placeholder-${t.slug}.svg`;
    }
  }
  return "images/placeholder-default.svg";
}

function cardThumbnail(a) {
  const firstPhoto = (a.media || []).find(m => m.type === "image");
  return firstPhoto ? firstPhoto.file : imageForType(a.workshopType);
}

function renderMediaGallery(a) {
  if (!a.media || a.media.length === 0) return "";
  const items = a.media.map(m => {
    if (m.type === "video") {
      return `<div class="media-item"><video src="${m.file}" controls preload="metadata"></video></div>`;
    }
    return `<div class="media-item"><img src="${m.file}" alt="${escapeHtml(a.name)}の工房写真" loading="lazy"></div>`;
  }).join("");
  return `<div class="media-gallery">${items}</div>`;
}

// --- state ---
let activeQaCategory = "all";
let activeProfileType = "all";
let qaSearchTerm = "";
let openProfileName = null;

// --- tabs ---
document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById("view-" + btn.dataset.view).classList.add("active");
  });
});

function goToQaWithCategory(cat) {
  activeQaCategory = cat;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelector('.tab-btn[data-view="qa"]').classList.add("active");
  document.getElementById("view-qa").classList.add("active");
  renderQaChips();
  renderQaList();
}

function goToProfilesWithType(type) {
  activeProfileType = type;
  document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelector('.tab-btn[data-view="profiles"]').classList.add("active");
  document.getElementById("view-profiles").classList.add("active");
  renderProfileChips();
  renderProfiles();
}

// --- home ---
function renderHome() {
  document.getElementById("stat-advisors").textContent = ADVISORS.length;
  document.getElementById("stat-qa").textContent = QA_ITEMS.length;
  const categories = [...new Set(QA_ITEMS.map(q => q.category))];
  document.getElementById("stat-categories").textContent = categories.length;

  const catCounts = {};
  QA_ITEMS.forEach(q => catCounts[q.category] = (catCounts[q.category] || 0) + 1);
  const catWrap = document.getElementById("home-category-chips");
  catWrap.innerHTML = "";
  Object.keys(catCounts).sort((a,b) => catCounts[b]-catCounts[a]).forEach(cat => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `${cat} <span class="count">${catCounts[cat]}</span>`;
    chip.addEventListener("click", () => goToQaWithCategory(cat));
    catWrap.appendChild(chip);
  });

  const typeCounts = {};
  ADVISORS.forEach(a => typeCounts[a.workshopType] = (typeCounts[a.workshopType] || 0) + 1);
  const typeWrap = document.getElementById("home-type-chips");
  typeWrap.innerHTML = "";
  Object.keys(typeCounts).forEach(type => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `${type} <span class="count">${typeCounts[type]}</span>`;
    chip.addEventListener("click", () => goToProfilesWithType(type));
    typeWrap.appendChild(chip);
  });
}

// --- Q&A view ---
function renderQaChips() {
  const categories = [...new Set(QA_ITEMS.map(q => q.category))];
  const wrap = document.getElementById("qa-category-chips");
  wrap.innerHTML = "";
  const allChip = document.createElement("span");
  allChip.className = "chip" + (activeQaCategory === "all" ? " active" : "");
  allChip.textContent = "すべて";
  allChip.addEventListener("click", () => { activeQaCategory = "all"; renderQaChips(); renderQaList(); });
  wrap.appendChild(allChip);
  categories.forEach(cat => {
    const chip = document.createElement("span");
    chip.className = "chip" + (activeQaCategory === cat ? " active" : "");
    chip.textContent = cat;
    chip.addEventListener("click", () => { activeQaCategory = cat; renderQaChips(); renderQaList(); });
    wrap.appendChild(chip);
  });
}

function renderQaList() {
  const list = document.getElementById("qa-list");
  const emptyMsg = document.getElementById("qa-empty");
  list.innerHTML = "";

  const term = qaSearchTerm.trim().toLowerCase();
  const filtered = QA_ITEMS.filter(item => {
    if (activeQaCategory !== "all" && item.category !== activeQaCategory) return false;
    if (!term) return true;
    const haystack = [
      item.category,
      item.question?.asker,
      item.question?.text,
      ...(item.answers || []).map(a => a.responder + " " + a.text)
    ].join(" ").toLowerCase();
    return haystack.includes(term);
  });

  emptyMsg.hidden = filtered.length > 0;

  filtered.forEach(item => {
    const card = document.createElement("div");
    card.className = "qa-card";

    const answersHtml = (item.answers || []).map(a => `
      <div class="qa-answer">
        <span class="who">${escapeHtml(a.responder)}</span>${a.workshopType ? `<span class="type-badge">${escapeHtml(a.workshopType)}</span>` : ""}
        <div class="text">${escapeHtml(a.text)}</div>
      </div>
    `).join("") || `<p class="note" style="padding-left:12px;">まだ回答がついていません。</p>`;

    card.innerHTML = `
      <div class="qa-meta">
        <span class="qa-category-tag">${escapeHtml(item.category)}</span>
        <span class="qa-date">${item.date || ""}</span>
      </div>
      <div class="qa-question">
        <span class="who">${escapeHtml(item.question?.asker || "")}</span>
        <span class="text">${escapeHtml(item.question?.text || "")}</span>
      </div>
      ${answersHtml}
    `;
    list.appendChild(card);
  });
}

document.getElementById("qa-search").addEventListener("input", (e) => {
  qaSearchTerm = e.target.value;
  renderQaList();
});

function escapeHtml(str) {
  if (!str) return "";
  return str.replace(/[&<>"']/g, s => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[s]));
}

// --- Profiles view ---
function renderProfileChips() {
  const types = [...new Set(ADVISORS.map(a => a.workshopType))];
  const wrap = document.getElementById("profile-type-chips");
  wrap.innerHTML = "";
  const allChip = document.createElement("span");
  allChip.className = "chip" + (activeProfileType === "all" ? " active" : "");
  allChip.textContent = "すべて";
  allChip.addEventListener("click", () => { activeProfileType = "all"; openProfileName = null; renderProfileChips(); renderProfiles(); });
  wrap.appendChild(allChip);
  types.forEach(type => {
    const chip = document.createElement("span");
    chip.className = "chip" + (activeProfileType === type ? " active" : "");
    chip.textContent = type;
    chip.addEventListener("click", () => { activeProfileType = type; openProfileName = null; renderProfileChips(); renderProfiles(); });
    wrap.appendChild(chip);
  });
}

function listField(arr) {
  if (!arr || arr.length === 0) return "";
  return `<ul>${arr.map(x => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
}

function renderProfiles() {
  const grid = document.getElementById("profiles-grid");
  grid.innerHTML = "";

  const filtered = ADVISORS.filter(a => activeProfileType === "all" || a.workshopType === activeProfileType);

  filtered.forEach(a => {
    if (openProfileName === a.name) {
      const detail = document.createElement("div");
      detail.className = "profile-detail";
      detail.innerHTML = `
        <button class="close-btn" aria-label="閉じる">✕</button>
        ${a.media?.length ? renderMediaGallery(a) : `<img src="${imageForType(a.workshopType)}" alt="${escapeHtml(a.name)}の工房サンプル画像">`}
        <h3>${escapeHtml(a.name)}${a.fullName ? `（${escapeHtml(a.fullName)}）` : ""}${a.shopName ? ` — ${escapeHtml(a.shopName)}` : ""}</h3>
        ${a.snsAccount ? `<div class="sns-account">@${escapeHtml(a.snsAccount)}</div>` : ""}
        <span class="type-badge">${escapeHtml(a.workshopType)}</span>
        ${a.media?.length ? `<span class="type-badge">📷 写真・動画 ${a.media.length}件</span>` : (a.mediaCount ? `<span class="type-badge">📷 写真・動画 ${a.mediaCount}件（準備中）</span>` : "")}
        <dl>
          ${a.background ? `<dt>工房を建てた時期・経緯</dt><dd>${escapeHtml(a.background)}</dd>` : ""}
          ${a.builtDate ? `<dt>工房を建てた年月日</dt><dd>${escapeHtml(a.builtDate)}</dd>` : ""}
          ${a.cost ? `<dt>建設にかかった費用</dt><dd>${escapeHtml(a.cost)}</dd>` : ""}
          ${a.goodPoints?.length ? `<dt>良かった点</dt><dd>${listField(a.goodPoints)}</dd>` : ""}
          ${a.failurePoints?.length ? `<dt>こうすれば良かった点</dt><dd>${listField(a.failurePoints)}</dd>` : ""}
          ${a.advice?.length ? `<dt>これから工房を作る方へ</dt><dd>${listField(a.advice)}</dd>` : ""}
          ${a.operatingStatus ? `<dt>現在の稼働状況</dt><dd>${escapeHtml(a.operatingStatus)}</dd>` : ""}
          ${a.communityTips?.length ? `<dt>グループチャットでの補足アドバイス</dt><dd>${listField(a.communityTips)}</dd>` : ""}
          ${a.otherNotes ? `<dt>その他</dt><dd>${escapeHtml(a.otherNotes)}</dd>` : ""}
          ${a.closingMessage ? `<dt>これから工房を作る方へのメッセージ</dt><dd>${escapeHtml(a.closingMessage)}</dd>` : ""}
        </dl>
      `;
      detail.querySelector(".close-btn").addEventListener("click", (ev) => {
        ev.stopPropagation();
        openProfileName = null;
        renderProfiles();
      });
      grid.appendChild(detail);
      return;
    }

    const card = document.createElement("div");
    card.className = "profile-card";
    card.innerHTML = `
      <img src="${cardThumbnail(a)}" alt="${escapeHtml(a.name)}の工房写真">
      <div class="profile-card-body">
        <h3>${escapeHtml(a.name)}</h3>
        <div class="shop">${a.shopName ? escapeHtml(a.shopName) : ""}</div>
        <span class="type-badge">${escapeHtml(a.workshopType)}</span>
      </div>
    `;
    card.addEventListener("click", () => { openProfileName = a.name; renderProfiles(); });
    grid.appendChild(card);
  });
}

// --- init ---
renderHome();
renderQaChips();
renderQaList();
renderProfileChips();
renderProfiles();
