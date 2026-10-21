// 顧問卡：把 advisor.config.js 的設定整理成安全的顯示資料，再畫到畫面上（只用 textContent，不用 innerHTML）。

const clean = (v, max = 60) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function normalizeAdvisor(cfg = {}) {
  const name = clean(cfg.name, 30);
  const phone = clean(cfg.phone, 20);
  const digits = phone.replace(/[^\d+]/g, "");
  const line = clean(cfg.line, 60);
  const photo = clean(cfg.photo, 200);
  // 只接受站內相對路徑的照片，避免被填成外部網址或 javascript:
  const safePhoto = /^(?!\/\/)(?![a-z][a-z0-9+.-]*:)[\w./-]+\.(?:jpe?g|png|webp|gif|svg)$/i.test(photo) && !photo.includes("..") ? photo : "";
  let lineUrl = "";
  if (/^https:\/\/(?:lin\.ee|line\.me)\//i.test(line)) lineUrl = line;
  else if (/^@?[\w.-]{2,30}$/.test(line)) lineUrl = `https://line.me/R/ti/p/${encodeURIComponent(line.startsWith("@") ? line : "@" + line)}`;
  return {
    enabled: cfg.enabled !== false && name !== "",
    demo: cfg.demo === true,
    eyebrow: clean(cfg.eyebrow, 40),
    name,
    company: clean(cfg.company, 60),
    phone: digits.length >= 6 ? phone : "",
    tel: digits.length >= 6 ? `tel:${digits}` : "",
    lineUrl,
    photo: safePhoto,
    initial: [...name][0] || "",
  };
}

export function renderAdvisor(root, cfg) {
  if (!root) return;
  const a = normalizeAdvisor(cfg);
  if (!a.enabled) { root.hidden = true; return; }
  const $ = (sel) => root.querySelector(sel);
  $("[data-advisor=eyebrow]").textContent = a.eyebrow;
  $("[data-advisor=name]").textContent = a.name;
  $("[data-advisor=company]").textContent = a.company;
  const demo = $("[data-advisor=demo]");
  demo.hidden = !a.demo;
  const wrap = $(".advisor-photo-wrap");
  wrap.replaceChildren();
  if (a.photo) {
    const img = document.createElement("img");
    img.className = "advisor-photo";
    img.src = a.photo;
    img.alt = `${a.name}的照片`;
    wrap.append(img);
  } else {
    const s = document.createElement("span");
    s.className = "advisor-initial";
    s.setAttribute("aria-hidden", "true");
    s.textContent = a.initial;
    wrap.append(s);
  }
  const phone = $("[data-advisor=phone]");
  phone.hidden = !a.tel;
  if (a.tel) {
    phone.href = a.tel;
    phone.setAttribute("aria-label", `撥打電話給${a.name}，${a.phone}`);
    phone.querySelector("[data-advisor=phone-text]").textContent = a.phone;
  }
  const line = $("[data-advisor=line]");
  line.hidden = !a.lineUrl;
  if (a.lineUrl) line.href = a.lineUrl;
  $(".advisor-action").hidden = !a.tel && !a.lineUrl;
}
