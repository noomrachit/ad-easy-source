(function () {
  "use strict";

  var PLATFORMS = ["Facebook", "Instagram", "TikTok"];
  var OBJECTIVES = ["เพิ่มยอดขาย", "สร้างการรับรู้", "หาลูกค้าใหม่"];
  var STATUSES = [
    { k: "active", label: "กำลังทำงาน", cls: "p-active" },
    { k: "paused", label: "หยุดชั่วคราว", cls: "p-paused" },
    { k: "ended", label: "จบแล้ว", cls: "p-ended" }
  ];
  var GUIDE = [
    { t: "ตั้งเป้าหมายให้ชัดก่อนยิงแอด", d: "อยากได้ยอดขาย อยากให้คนรู้จัก หรืออยากได้ลูกค้าใหม่ — เลือกอย่างเดียวต่อหนึ่งแคมเปญ ถ้าตั้งหลายเป้าพร้อมกัน ระบบจะกระจายงบจนไม่ได้อะไรสักอย่าง" },
    { t: "เริ่มจากงบน้อยแล้วค่อยเพิ่ม", d: "วันละ 100–300 บาทพอสำหรับทดสอบ ดูสัก 3–5 วันว่ากลุ่มไหนตอบสนองดี แล้วค่อยเพิ่มงบไปที่ตัวที่ได้ผล อย่าทุ่มงบก้อนใหญ่ตั้งแต่วันแรก" },
    { t: "ทำโฆษณาอย่างน้อย 3 แบบต่อหนึ่งแคมเปญ", d: "เปลี่ยนรูป เปลี่ยนพาดหัว แล้วปล่อยให้ระบบเลือกตัวที่คนตอบสนองดีที่สุดเอง การเดาเองว่าแบบไหนจะดีที่สุดมักจะผิด" },
    { t: "ดูตัวเลขที่บอกเรื่องเงิน ไม่ใช่ยอดไลก์", d: "ยอดไลก์และยอดเข้าถึงสูงไม่ได้แปลว่าขายได้ ให้ดูค่าใช้จ่ายต่อคลิกและจำนวนคนที่ทักเข้ามาจริงเป็นหลัก" },
    { t: "บันทึกผลทุกสัปดาห์", d: "ส่งออกรายงานจาก Ads Manager แล้วนำเข้าไฟล์มาที่นี่ทุกสัปดาห์ พอมีข้อมูลย้อนหลังหลายเดือน จะเห็นชัดว่าช่วงไหนคุ้มและช่วงไหนควรหยุด" }
  ];

  var me = null, campaigns = [], guide = [false, false, false, false, false];
  var view = "home", filterPlat = "all", filterStat = "all";
  var authMode = "login", authMsg = "", busy = false, imp = null;
  try { view = sessionStorage.getItem("adeasy_tab") || "home"; } catch (e) {}

  /* ---------- utils ---------- */
  function esc(s) {
    return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function nf(n) { return new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 }).format(Math.round(n || 0)); }
  function nfShort(n) {
    n = n || 0;
    if (n < 10000) return nf(n);
    return new Intl.NumberFormat("th-TH", { notation: "compact", maximumFractionDigits: 1 }).format(n);
  }
  function money2(n) { return new Intl.NumberFormat("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0); }
  function num(v) {
    if (v == null) return 0;
    var n = parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
    return isFinite(n) && n > 0 ? n : 0;
  }
  function thaiDate(d) {
    d = d || new Date();
    var W = ["วันอาทิตย์", "วันจันทร์", "วันอังคาร", "วันพุธ", "วันพฤหัสบดี", "วันศุกร์", "วันเสาร์"];
    var M = ["มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"];
    return W[d.getDay()] + " " + d.getDate() + " " + M[d.getMonth()] + " " + (d.getFullYear() + 543);
  }
  function shortDate(iso) {
    if (!iso) return "—";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return "—";
    var M = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
    return d.getDate() + " " + M[d.getMonth()] + " " + String(d.getFullYear() + 543).slice(2);
  }
  function toast(msg) {
    var t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("show"); }, 2800);
  }
  function icon(name) {
    var p = {
      grid: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"/>',
      target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.4"/>',
      upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
      book: '<path d="M4 5a2 2 0 0 1 2-2h13v18H6a2 2 0 0 1-2-2z"/><path d="M8 3v18"/>',
      coin: '<circle cx="12" cy="12" r="9"/><path d="M12 7.2v9.6M9.6 9.8h4a1.8 1.8 0 0 1 0 3.5h-3a1.8 1.8 0 0 0 0 3.5h4"/>',
      eye: '<path d="M2 12s3.6-6.5 10-6.5S22 12 22 12s-3.6 6.5-10 6.5S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>',
      click: '<path d="M6 3l12 9-5 1 3 6-2.6 1.2-3-6.1L6 17z"/>',
      bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6z"/>'
    }[name] || "";
    return '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + "</svg>";
  }

  /* ---------- api ---------- */
  function api(path, opts) {
    opts = opts || {};
    return fetch(path, {
      method: opts.method || "GET",
      headers: opts.body ? { "content-type": "application/json" } : {},
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      credentials: "same-origin"
    }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (j) {
        if (!r.ok) { var e = new Error(j.error || "เกิดข้อผิดพลาด"); e.status = r.status; throw e; }
        return j;
      });
    });
  }

  /* ---------- auth screen ---------- */
  function renderAuth() {
    var reg = authMode === "register";
    document.getElementById("app").innerHTML =
      '<div class="auth"><div class="box">' +
        '<div class="logo"><span class="mark">A</span><span><b>ad easy</b><small>ทำโฆษณาแบบเข้าใจ</small></span></div>' +
        '<div class="panel">' +
          "<h1>" + (reg ? "สมัครใช้งานฟรี" : "เข้าสู่ระบบ") + "</h1>" +
          '<p class="sub">' + (reg ? "สร้างบัญชีเพื่อเก็บข้อมูลแคมเปญของคุณไว้บนเซิร์ฟเวอร์ เปิดจากเครื่องไหนก็เห็นชุดเดียวกัน" : "ยินดีต้อนรับกลับมา") + "</p>" +
          (authMsg ? '<div class="authmsg">' + esc(authMsg) + "</div>" : "") +
          '<form id="authform">' +
            '<div class="field"><label>อีเมล</label><input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div>' +
            '<div class="field"><label>รหัสผ่าน' + (reg ? " (อย่างน้อย 8 ตัวอักษร)" : "") + "</label>" +
              '<input name="password" type="password" autocomplete="' + (reg ? "new-password" : "current-password") + '" required minlength="8"></div>' +
            '<button class="btn primary" type="submit" style="width:100%;justify-content:center"' + (busy ? " disabled" : "") + ">" +
              (busy ? "กำลังดำเนินการ…" : reg ? "สมัครและเริ่มใช้งาน" : "เข้าสู่ระบบ") + "</button>" +
          "</form>" +
          '<p class="swap">' + (reg ? "มีบัญชีอยู่แล้ว? " : "ยังไม่มีบัญชี? ") +
            '<button type="button" data-authswap="1">' + (reg ? "เข้าสู่ระบบ" : "สมัครใช้งานฟรี") + "</button></p>" +
        "</div>" +
        '<p class="foot">แอปนี้ใช้บันทึกและติดตามผลแคมเปญเท่านั้น ไม่ได้เชื่อมต่อกับบัญชีโฆษณาของคุณโดยตรง</p>' +
      "</div></div>";
    var f = document.getElementById("authform");
    if (f) f.addEventListener("submit", onAuthSubmit);
  }

  function onAuthSubmit(e) {
    e.preventDefault();
    if (busy) return;
    var fd = new FormData(e.target);
    var email = String(fd.get("email") || "").trim();
    var password = String(fd.get("password") || "");
    if (password.length < 8) { authMsg = "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร"; renderAuth(); return; }
    busy = true; authMsg = ""; renderAuth();
    api("/api/" + (authMode === "register" ? "register" : "login"), { method: "POST", body: { email: email, password: password } })
      .then(function () { busy = false; return load(); })
      .catch(function (err) { busy = false; authMsg = err.message; renderAuth(); });
  }

  /* ---------- data ---------- */
  function load() {
    return api("/api/me").then(function (d) {
      me = d.user;
      campaigns = d.campaigns || [];
      guide = d.guide || [false, false, false, false, false];
      while (guide.length < GUIDE.length) guide.push(false);
      if (!me) renderAuth(); else render();
    }).catch(function () {
      document.getElementById("app").innerHTML =
        '<div class="auth"><div class="box"><div class="panel"><h1>เชื่อมต่อเซิร์ฟเวอร์ไม่ได้</h1>' +
        '<p class="sub">ลองรีเฟรชหน้านี้อีกครั้ง</p>' +
        '<button class="btn primary" type="button" onclick="location.reload()">ลองใหม่</button></div></div></div>';
    });
  }

  /* ---------- derived ---------- */
  function totals() {
    var t = { spent: 0, reach: 0, clicks: 0, active: 0, budget: 0, n: campaigns.length };
    campaigns.forEach(function (x) {
      t.spent += +x.spent || 0; t.reach += +x.reach || 0; t.clicks += +x.clicks || 0;
      if (x.status === "active") { t.active++; t.budget += +x.budgetPerDay || 0; }
    });
    return t;
  }
  function statusPill(k) {
    var s = STATUSES.filter(function (x) { return x.k === k; })[0] || STATUSES[2];
    return '<span class="pill ' + s.cls + '"><i></i>' + s.label + "</span>";
  }
  function platPill(p) {
    var cls = p === "Instagram" ? " ig" : p === "TikTok" ? " tt" : "";
    return '<span class="pill p-plat' + cls + '">' + esc(p) + "</span>";
  }

  /* ---------- app shell ---------- */
  function render() {
    var navItems = [
      ["home", "ภาพรวม", "grid"],
      ["camp", "แคมเปญของฉัน", "target"],
      ["import", "นำเข้าไฟล์ CSV", "upload"],
      ["guide", "คู่มือเริ่มต้น", "book"]
    ].map(function (n) {
      return '<button type="button" data-go="' + n[0] + '"' + (view === n[0] ? ' aria-current="true"' : "") + ">" + icon(n[2]) + "<span>" + n[1] + "</span></button>";
    }).join("");

    var body = view === "camp" ? pageCampaigns() : view === "import" ? pageImport() : view === "guide" ? pageGuide() : pageHome();

    document.getElementById("app").innerHTML =
      '<div class="shell">' +
        '<aside id="side">' +
          '<div class="brandrow"><div class="brand"><span class="mark">A</span><span><b>ad easy</b><small>ทำโฆษณาแบบเข้าใจ</small></span></div>' +
          '<button class="x" type="button" data-side="close" aria-label="ปิดเมนู">&times;</button></div>' +
          '<p class="navlabel">เมนูหลัก</p><nav>' + navItems + "</nav>" +
          '<div class="side-note" style="margin-top:auto"><b>ไม่แน่ใจว่าจะเริ่มตรงไหน?</b>เราเรียงขั้นตอนไว้ให้แล้ว ลองอ่านคู่มือสั้น ๆ ก่อนได้</div>' +
          '<div class="who"><span class="av">' + esc((me.email || "?")[0].toUpperCase()) + "</span>" +
            '<span style="min-width:0"><span class="em">' + esc(me.email) + '</span><br><button type="button" data-logout="1">ออกจากระบบ</button></span></div>' +
        "</aside>" +
        '<button class="scrim" type="button" data-side="close" aria-label="ปิดเมนู" hidden></button>' +
        "<main><header class=\"bar\">" +
          '<button class="burger" type="button" data-side="open" aria-label="เปิดเมนู">&#9776;</button>' +
          '<span class="today">' + esc(thaiDate()) + "</span>" +
          '<span class="saveflag" id="saveflag" data-s="saved"><i class="dot"></i><span>ข้อมูลอยู่บนเซิร์ฟเวอร์</span></span>' +
        "</header>" +
        '<div class="page">' + body + "</div></main></div>";
  }

  function heading(eyebrow, title, desc, action) {
    return '<div class="phead"><div><p class="eyebrow"><i></i>' + esc(eyebrow) + "</p><h1>" + esc(title) + "</h1>" +
      (desc ? "<p>" + esc(desc) + "</p>" : "") + "</div>" + (action || "") + "</div>";
  }
  var DISCLAIMER = '<div class="notice"><b>แอปนี้ไม่ได้เชื่อมต่อกับบัญชีโฆษณาของคุณโดยตรง</b> — การเพิ่มแคมเปญที่นี่ไม่ได้ทำให้โฆษณายิงออกไปจริง คุณยังต้องสร้างและจัดการโฆษณาใน Ads Manager ของแต่ละแพลตฟอร์มตามปกติ ที่นี่มีไว้บันทึกและติดตามผลรวมไว้ที่เดียว</div>';

  function emptyState() {
    return '<div class="empty"><div class="big">📋</div><h3>ยังไม่มีแคมเปญในระบบ</h3>' +
      "<p>เริ่มได้สองทาง — เพิ่มแคมเปญเองทีละรายการ หรือส่งออกรายงานจาก Ads Manager เป็นไฟล์ CSV แล้วนำเข้ามาทีเดียว</p>" +
      '<div class="row"><button class="btn primary" type="button" data-new="1">เพิ่มแคมเปญแรก</button>' +
      '<button class="btn ghost" type="button" data-go="import">นำเข้าไฟล์ CSV</button></div></div>';
  }

  function pageHome() {
    var t = totals();
    if (!t.n) return heading("ภาพรวมของคุณ", "ยินดีต้อนรับสู่ Ad Easy", "") + DISCLAIMER + emptyState();
    var cpc = t.clicks ? t.spent / t.clicks : 0;
    var ctr = t.reach ? (t.clicks / t.reach) * 100 : 0;
    function stat(ic, bg, fg, lab, val, sub) {
      return '<div class="stat"><div class="top"><span class="ic" style="background:' + bg + ";color:" + fg + '">' + icon(ic) +
        '</span><span class="per">ทั้งหมด</span></div><p class="lab">' + lab + '</p><p class="val">' + val + "</p>" +
        (sub ? '<p class="sub">' + sub + "</p>" : "") + "</div>";
    }
    var recent = campaigns.slice(0, 4).map(campCard).join("");
    return heading("ภาพรวมของคุณ", "ภาพรวมแคมเปญของคุณ", "สรุปตัวเลขจากทุกแคมเปญที่บันทึกไว้ ไม่ต้องเปิดทีละแพลตฟอร์ม",
        '<button class="btn primary" type="button" data-go="camp">ดูแคมเปญทั้งหมด</button>') + DISCLAIMER +
      '<div class="stats">' +
        stat("coin", "#fdece4", "#c9543a", "ใช้จ่ายสะสม", "฿" + nf(t.spent), t.budget ? "งบต่อวันที่กำลังรัน ฿" + nf(t.budget) : "") +
        stat("eye", "#e9f0ff", "#31538f", "การเข้าถึง", nfShort(t.reach), nf(t.reach) + " ครั้ง") +
        stat("click", "#e4f6f4", "#12615e", "คลิก", nfShort(t.clicks), t.clicks ? "฿" + money2(cpc) + " ต่อคลิก" : "") +
        stat("bolt", "#f7edd2", "#7d5d1a", "กำลังทำงาน", nf(t.active) + " แคมเปญ", "จากทั้งหมด " + nf(t.n)) +
      "</div>" +
      (t.reach ? '<div class="card" style="margin-bottom:16px"><h2>อัตราการคลิก</h2><p class="hint" style="margin:0">คนเห็นโฆษณาแล้วกดเข้ามา ' + money2(ctr) + "% — ค่าอ้างอิงทั่วไปอยู่ราว 1–2% ถ้าต่ำกว่านี้มาก ลองเปลี่ยนรูปหรือพาดหัวดู</p></div>" : "") +
      '<h2 style="font-size:19px;margin:26px 0 14px">แคมเปญล่าสุด</h2><div class="camps">' + recent + "</div>";
  }

  function campCard(c) {
    var cpc = c.clicks ? (+c.spent || 0) / c.clicks : 0;
    return '<article class="camp"><div class="r1"><h3>' + esc(c.name) + "</h3>" + platPill(c.platform) + statusPill(c.status) + "</div>" +
      '<p class="meta">' + esc(c.objective || "—") + (c.audience ? " · " + esc(c.audience) : "") +
        (c.duration ? " · " + esc(c.duration) + " วัน" : "") + " · เพิ่มเมื่อ " + shortDate(c.createdAt) + "</p>" +
      '<div class="nums">' +
        "<div><span>งบต่อวัน</span><b>฿" + nf(c.budgetPerDay) + "</b></div>" +
        "<div><span>ใช้จ่ายแล้ว</span><b>฿" + nf(c.spent) + "</b></div>" +
        "<div><span>การเข้าถึง</span><b>" + nfShort(c.reach) + "</b></div>" +
        "<div><span>คลิก</span><b>" + nfShort(c.clicks) + "</b></div>" +
        "<div><span>ต่อคลิก</span><b>" + (c.clicks ? "฿" + money2(cpc) : "—") + "</b></div></div>" +
      '<div class="acts"><button class="btn sm ghost" type="button" data-edit="' + esc(c.id) + '">แก้ไข</button>' +
        '<button class="btn sm ghost" type="button" data-toggle="' + esc(c.id) + '">' + (c.status === "active" ? "หยุดชั่วคราว" : "ให้ทำงานต่อ") + "</button>" +
        '<button class="btn sm danger" type="button" data-del="' + esc(c.id) + '">ลบ</button></div></article>';
  }

  function pageCampaigns() {
    var head = heading("จัดการแคมเปญ", "แคมเปญของฉัน", "บันทึกแคมเปญที่ยิงอยู่ แล้วอัปเดตตัวเลขเป็นระยะเพื่อดูว่าตัวไหนคุ้ม",
      '<button class="btn primary" type="button" data-new="1">+ เพิ่มแคมเปญ</button>');
    if (!campaigns.length) return head + emptyState();
    var chips = function (group, cur, opts) {
      return opts.map(function (o) {
        return '<button class="chip" type="button" data-filter="' + group + '" data-val="' + esc(o[0]) + '" aria-pressed="' + (cur === o[0]) + '">' + esc(o[1]) + "</button>";
      }).join("");
    };
    var bar = '<div class="filters">' + chips("plat", filterPlat, [["all", "ทุกแพลตฟอร์ม"]].concat(PLATFORMS.map(function (p) { return [p, p]; }))) + "</div>" +
      '<div class="filters">' + chips("stat", filterStat, [["all", "ทุกสถานะ"]].concat(STATUSES.map(function (s) { return [s.k, s.label]; }))) + "</div>";
    var list = campaigns.filter(function (c) {
      return (filterPlat === "all" || c.platform === filterPlat) && (filterStat === "all" || c.status === filterStat);
    });
    var body = list.length ? '<div class="camps">' + list.map(campCard).join("") + "</div>"
      : '<div class="empty"><h3>ไม่มีแคมเปญที่ตรงกับตัวกรอง</h3><p>ลองเลือกตัวกรองอื่น หรือกดทุกแพลตฟอร์ม/ทุกสถานะเพื่อดูทั้งหมด</p></div>';
    return head + bar + '<p style="font-size:13px;color:var(--faint);margin:0 0 14px">แสดง ' + nf(list.length) + " จาก " + nf(campaigns.length) + " แคมเปญ</p>" + body;
  }

  function pageGuide() {
    var done = guide.filter(Boolean).length;
    var steps = GUIDE.map(function (g, i) {
      var d = !!guide[i];
      return '<div class="step' + (d ? " done" : "") + '"><button class="tick" type="button" data-step="' + i + '" aria-pressed="' + d + '" aria-label="ทำเครื่องหมายว่าอ่านแล้ว"><span>✓</span></button>' +
        "<div><b>" + esc(g.t) + "</b><p>" + esc(g.d) + "</p></div></div>";
    }).join("");
    return heading("คู่มือเริ่มต้น", "ยิงแอดครั้งแรกให้ไม่เสียเงินฟรี", "ห้าข้อที่คนยิงแอดเองมักพลาดในเดือนแรก อ่านแล้วติ๊กเก็บไว้ได้") +
      '<p style="font-family:var(--mono);font-size:11px;letter-spacing:.1em;text-transform:uppercase;color:var(--faint);margin:0 0 14px">อ่านแล้ว ' + done + " จาก " + GUIDE.length + " ข้อ</p>" +
      '<div class="steps">' + steps + "</div>";
  }

  /* ---------- CSV ---------- */
  function parseCSV(text) {
    text = text.replace(/^﻿/, "");
    var rows = [], row = [], cell = "", q = false, i = 0;
    while (i < text.length) {
      var ch = text[i];
      if (q) {
        if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i += 2; continue; } q = false; i++; continue; }
        cell += ch; i++; continue;
      }
      if (ch === '"') { q = true; i++; continue; }
      if (ch === ",") { row.push(cell); cell = ""; i++; continue; }
      if (ch === "\r") { i++; continue; }
      if (ch === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; i++; continue; }
      cell += ch; i++;
    }
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows.filter(function (r) { return r.some(function (c) { return String(c).trim() !== ""; }); });
  }
  var FIELDS = [
    { k: "name", label: "ชื่อแคมเปญ", need: true, hints: ["campaign name", "campaign", "ad name", "ชื่อแคมเปญ", "แคมเปญ"] },
    { k: "spent", label: "ยอดใช้จ่าย", hints: ["amount spent", "spend", "cost", "total cost", "จำนวนเงินที่ใช้", "ค่าใช้จ่าย"] },
    { k: "reach", label: "การเข้าถึง", hints: ["reach", "impressions", "impression", "การเข้าถึง", "การแสดงผล"] },
    { k: "clicks", label: "คลิก", hints: ["link clicks", "clicks all", "clicks", "คลิก"] },
    { k: "budgetPerDay", label: "งบต่อวัน", hints: ["daily budget", "budget", "งบต่อวัน", "งบประมาณ"] },
    { k: "status", label: "สถานะ", hints: ["delivery", "status", "campaign status", "สถานะ"] },
    { k: "objective", label: "เป้าหมาย", hints: ["objective", "campaign objective", "เป้าหมาย"] }
  ];
  function normHead(h) { return String(h).toLowerCase().replace(/\(.*?\)/g, " ").replace(/[_\-.]/g, " ").replace(/\s+/g, " ").trim(); }
  function autoMap(headers) {
    var map = {}, used = {};
    FIELDS.forEach(function (f) {
      for (var hi = 0; hi < f.hints.length; hi++) {
        for (var i = 0; i < headers.length; i++) {
          if (used[i]) continue;
          var h = normHead(headers[i]);
          if (h === f.hints[hi] || h.indexOf(f.hints[hi]) !== -1) { map[f.k] = i; used[i] = 1; return; }
        }
      }
    });
    return map;
  }
  function mapStatus(v) {
    var s = String(v || "").toLowerCase();
    if (/หยุด|paused|pause|inactive|off/.test(s)) return "paused";
    if (/จบ|ended|complete|finish|expired/.test(s)) return "ended";
    if (/active|running|กำลัง|on|delivering/.test(s)) return "active";
    return "";
  }

  function pageImport() {
    var head = heading("นำเข้าข้อมูล", "นำเข้าไฟล์ CSV จาก Ads Manager", "ส่งออกรายงานแคมเปญจาก Facebook หรือ TikTok Ads Manager เป็นไฟล์ CSV แล้วอัปโหลดที่นี่ ตัวเลขจริงจะเข้ามาแทนการพิมพ์เอง");
    if (!imp) {
      return head +
        '<div class="notice"><b>วิธีส่งออกไฟล์</b> — ใน Meta Ads Manager กดปุ่ม Reports หรือ Export แล้วเลือก Export table data (.csv) ส่วน TikTok Ads Manager อยู่ที่ปุ่ม Download ในหน้า Campaign เลือกช่วงเวลาที่ต้องการก่อนส่งออก</div>' +
        '<div class="drop" id="drop"><div class="big" style="font-size:34px">📄</div>' +
        "<p>ลากไฟล์ .csv มาวางตรงนี้ หรือกดเลือกไฟล์จากเครื่อง</p>" +
        '<button class="btn primary" type="button" data-pick="1">เลือกไฟล์ CSV</button>' +
        '<input type="file" id="file" accept=".csv,text/csv" hidden></div>';
    }
    if (imp.step === "map") {
      var opts = function (sel) {
        return '<option value="">— ไม่ใช้ —</option>' + imp.headers.map(function (h, i) {
          return '<option value="' + i + '"' + (sel === i ? " selected" : "") + ">" + esc(h || ("คอลัมน์ " + (i + 1))) + "</option>";
        }).join("");
      };
      var rows = FIELDS.map(function (f) {
        return '<div class="maprow"><b>' + esc(f.label) + (f.need ? ' <span style="color:var(--bad-fg)">*</span>' : "") +
          "<small>" + (f.need ? "ต้องระบุ" : "ไม่ระบุก็ได้") + '</small></b><select data-map="' + f.k + '">' + opts(imp.map[f.k]) + "</select></div>";
      }).join("");
      var prevHead = imp.headers.map(function (h) { return "<th>" + esc(h) + "</th>"; }).join("");
      var prevBody = imp.rows.slice(0, 4).map(function (r) {
        return "<tr>" + imp.headers.map(function (_, i) { return "<td>" + esc(r[i] || "") + "</td>"; }).join("") + "</tr>";
      }).join("");
      return head +
        '<div class="card"><h2>ตรวจข้อมูลก่อนนำเข้า</h2><p class="hint">ไฟล์ ' + esc(imp.filename) + " มี " + nf(imp.rows.length) + " แถว — ดูตัวอย่าง 4 แถวแรก</p>" +
        '<div class="tablewrap"><table><thead><tr>' + prevHead + "</tr></thead><tbody>" + prevBody + "</tbody></table></div></div>" +
        '<div class="card"><h2>จับคู่คอลัมน์</h2><p class="hint">เราเดาให้แล้วจากชื่อคอลัมน์ ถ้าไม่ตรงแก้ได้เลย</p>' + rows +
        '<div class="field" style="margin-top:16px"><label>แพลตฟอร์มของไฟล์นี้</label><select id="impPlat">' +
          PLATFORMS.map(function (p) { return '<option value="' + p + '"' + (imp.platform === p ? " selected" : "") + ">" + p + "</option>"; }).join("") + "</select></div>" +
        '<div class="field"><label>ถ้าชื่อแคมเปญซ้ำกับที่มีอยู่แล้ว</label><select id="impDup">' +
          '<option value="update">อัปเดตทับของเดิม</option><option value="new">สร้างเป็นรายการใหม่</option><option value="skip">ข้ามไป</option></select></div>' +
        '<div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:18px">' +
          '<button class="btn primary" type="button" data-import="go"' + (busy ? " disabled" : "") + ">" + (busy ? "กำลังนำเข้า…" : "นำเข้าข้อมูล") + "</button>" +
          '<button class="btn ghost" type="button" data-import="cancel">ยกเลิก</button></div></div>';
    }
    var r = imp.report;
    return head + '<div class="card"><h2>นำเข้าเสร็จแล้ว</h2><div class="report">' +
      '<p class="line"><b>' + nf(r.created) + "</b> รายการใหม่ที่เพิ่มเข้ามา</p>" +
      '<p class="line"><b>' + nf(r.updated) + "</b> รายการเดิมที่อัปเดตตัวเลขให้ใหม่</p>" +
      '<p class="line"><b>' + nf(r.skipped) + "</b> แถวที่ข้ามไป</p>" +
      (r.problems && r.problems.length ? "<ul>" + r.problems.slice(0, 8).map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") +
        (r.problems.length > 8 ? "<li>และอีก " + nf(r.problems.length - 8) + " แถว</li>" : "") + "</ul>" : "") +
      '</div><div style="display:flex;gap:9px;flex-wrap:wrap;margin-top:18px">' +
      '<button class="btn primary" type="button" data-go="camp">ดูแคมเปญทั้งหมด</button>' +
      '<button class="btn ghost" type="button" data-import="again">นำเข้าไฟล์อีกไฟล์</button></div></div>';
  }

  function readFile(file) {
    if (!file) return;
    if (!/\.csv$/i.test(file.name)) { toast("รองรับเฉพาะไฟล์ .csv"); return; }
    if (file.size > 3 * 1024 * 1024) { toast("ไฟล์ใหญ่เกิน 3 MB ลองแบ่งช่วงเวลาให้สั้นลง"); return; }
    var fr = new FileReader();
    fr.onload = function () {
      var rows = parseCSV(String(fr.result || ""));
      if (rows.length < 2) { toast("ไฟล์นี้ไม่มีข้อมูล หรืออ่านไม่ออก"); return; }
      var headers = rows[0].map(function (h) { return String(h).trim(); });
      imp = { step: "map", filename: file.name, headers: headers, rows: rows.slice(1), map: autoMap(headers), platform: /tiktok|tt/i.test(file.name) ? "TikTok" : "Facebook" };
      render();
    };
    fr.onerror = function () { toast("อ่านไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง"); };
    fr.readAsText(file, "utf-8");
  }

  function runImport() {
    var m = imp.map;
    if (m.name == null || m.name === "") { toast("ต้องเลือกคอลัมน์ชื่อแคมเปญก่อน"); return; }
    var dup = (document.getElementById("impDup") || {}).value || "update";
    var plat = (document.getElementById("impPlat") || {}).value || "Facebook";
    var pick = function (row, key) { return m[key] == null || m[key] === "" ? null : row[m[key]]; };
    var payload = imp.rows.map(function (row) {
      var st = mapStatus(pick(row, "status"));
      var obj = String(pick(row, "objective") || "").trim();
      return {
        name: String(pick(row, "name") || "").trim(),
        spent: pick(row, "spent"), reach: pick(row, "reach"),
        clicks: pick(row, "clicks"), budgetPerDay: pick(row, "budgetPerDay"),
        status: st || undefined,
        objective: OBJECTIVES.indexOf(obj) !== -1 ? obj : undefined
      };
    });
    busy = true; render();
    api("/api/import", { method: "POST", body: { rows: payload, dup: dup, platform: plat } })
      .then(function (d) {
        busy = false;
        campaigns = d.campaigns || campaigns;
        imp.step = "done"; imp.report = d.report;
        render();
        toast("นำเข้าแล้ว " + (d.report.created + d.report.updated) + " รายการ");
      })
      .catch(function (err) { busy = false; render(); toast(err.message); });
  }

  /* ---------- modal ---------- */
  function openForm(id) {
    var c = id ? campaigns.filter(function (x) { return x.id === id; })[0] : null;
    var v = c || { name: "", platform: "Facebook", objective: OBJECTIVES[0], status: "active", budgetPerDay: "", spent: "", reach: "", clicks: "", audience: "", duration: "" };
    var sel = function (name, list, cur, labeler) {
      return '<select name="' + name + '">' + list.map(function (o) {
        var val = labeler ? o.k : o, lab = labeler ? o.label : o;
        return '<option value="' + esc(val) + '"' + (cur === val ? " selected" : "") + ">" + esc(lab) + "</option>";
      }).join("") + "</select>";
    };
    var w = document.createElement("div");
    w.className = "modal";
    w.innerHTML = '<button class="veil" type="button" data-close="1" aria-label="ปิด"></button>' +
      '<div class="box" role="dialog" aria-modal="true"><h2>' + (c ? "แก้ไขแคมเปญ" : "เพิ่มแคมเปญใหม่") + "</h2><form id=\"cform\">" +
      '<div class="field"><label>ชื่อแคมเปญ</label><input name="name" value="' + esc(v.name) + '" required maxlength="120" placeholder="เช่น โปรส่งฟรีเดือนนี้"></div>' +
      '<div class="grid2">' +
        '<div class="field"><label>แพลตฟอร์ม</label>' + sel("platform", PLATFORMS, v.platform) + "</div>" +
        '<div class="field"><label>เป้าหมาย</label>' + sel("objective", OBJECTIVES, v.objective) + "</div>" +
        '<div class="field"><label>สถานะ</label>' + sel("status", STATUSES, v.status, true) + "</div>" +
        '<div class="field"><label>งบต่อวัน (บาท)</label><input name="budgetPerDay" type="number" min="0" step="1" value="' + esc(v.budgetPerDay) + '"></div>' +
        '<div class="field"><label>ใช้จ่ายแล้ว (บาท)</label><input name="spent" type="number" min="0" step="1" value="' + esc(v.spent) + '"></div>' +
        '<div class="field"><label>ระยะเวลา (วัน)</label><input name="duration" type="number" min="0" step="1" value="' + esc(v.duration) + '"></div>' +
        '<div class="field"><label>การเข้าถึง</label><input name="reach" type="number" min="0" step="1" value="' + esc(v.reach) + '"></div>' +
        '<div class="field"><label>คลิก</label><input name="clicks" type="number" min="0" step="1" value="' + esc(v.clicks) + '"></div>' +
      "</div>" +
      '<div class="field"><label>กลุ่มเป้าหมาย</label><input name="audience" value="' + esc(v.audience) + '" maxlength="140" placeholder="เช่น ผู้หญิง 25–40 ปี ในกรุงเทพฯ"></div>' +
      '<div class="foot"><button class="btn ghost" type="button" data-close="1">ยกเลิก</button>' +
      '<button class="btn primary" type="submit">' + (c ? "บันทึกการแก้ไข" : "เพิ่มแคมเปญ") + "</button></div></form></div>";
    document.body.appendChild(w);
    var inp = w.querySelector('input[name="name"]');
    if (inp) inp.focus();
    w.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) w.remove(); });
    w.querySelector("#cform").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = new FormData(e.target);
      var rec = {
        name: String(f.get("name") || "").trim(), platform: f.get("platform"),
        objective: f.get("objective"), status: f.get("status"),
        budgetPerDay: num(f.get("budgetPerDay")), spent: num(f.get("spent")),
        reach: num(f.get("reach")), clicks: num(f.get("clicks")),
        audience: String(f.get("audience") || "").trim(), duration: num(f.get("duration"))
      };
      if (!rec.name) { toast("ใส่ชื่อแคมเปญก่อน"); return; }
      var req = c ? api("/api/campaigns/" + encodeURIComponent(c.id), { method: "PUT", body: rec })
                  : api("/api/campaigns", { method: "POST", body: rec });
      req.then(function (d) {
        if (c) { for (var i = 0; i < campaigns.length; i++) if (campaigns[i].id === c.id) campaigns[i] = d.campaign; }
        else campaigns.unshift(d.campaign);
        w.remove(); render(); toast(c ? "บันทึกแล้ว" : "เพิ่มแคมเปญแล้ว");
      }).catch(function (err) { toast(err.message); });
    });
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target, t;
    if (!el || !el.closest) return;

    if ((t = el.closest("[data-authswap]"))) { authMode = authMode === "login" ? "register" : "login"; authMsg = ""; renderAuth(); return; }
    if (el.closest("[data-logout]")) {
      api("/api/logout", { method: "POST" }).then(function () {
        me = null; campaigns = []; view = "home";
        try { sessionStorage.removeItem("adeasy_tab"); } catch (err) {}
        authMode = "login"; authMsg = ""; renderAuth();
      });
      return;
    }
    if ((t = el.closest("[data-go]"))) {
      view = t.getAttribute("data-go");
      try { sessionStorage.setItem("adeasy_tab", view); } catch (err) {}
      render(); window.scrollTo(0, 0); return;
    }
    if ((t = el.closest("[data-side]"))) {
      var side = document.getElementById("side"), scrim = document.querySelector(".scrim");
      var open = t.getAttribute("data-side") === "open";
      if (side) side.classList.toggle("open", open);
      if (scrim) scrim.hidden = !open;
      return;
    }
    if (el.closest("[data-new]")) { openForm(null); return; }
    if ((t = el.closest("[data-edit]"))) { openForm(t.getAttribute("data-edit")); return; }
    if ((t = el.closest("[data-toggle]"))) {
      var id = t.getAttribute("data-toggle");
      var c = campaigns.filter(function (x) { return x.id === id; })[0];
      if (!c) return;
      var patch = Object.assign({}, c, { status: c.status === "active" ? "paused" : "active" });
      api("/api/campaigns/" + encodeURIComponent(id), { method: "PUT", body: patch }).then(function (d) {
        for (var i = 0; i < campaigns.length; i++) if (campaigns[i].id === id) campaigns[i] = d.campaign;
        render();
      }).catch(function (err) { toast(err.message); });
      return;
    }
    if ((t = el.closest("[data-del]"))) {
      var did = t.getAttribute("data-del");
      var dc = campaigns.filter(function (x) { return x.id === did; })[0];
      if (!dc || !window.confirm('ลบแคมเปญ "' + dc.name + '" ใช่ไหม? ลบแล้วกู้คืนไม่ได้')) return;
      api("/api/campaigns/" + encodeURIComponent(did), { method: "DELETE" }).then(function () {
        campaigns = campaigns.filter(function (x) { return x.id !== did; });
        render(); toast("ลบแล้ว");
      }).catch(function (err) { toast(err.message); });
      return;
    }
    if ((t = el.closest("[data-step]"))) {
      var i2 = +t.getAttribute("data-step");
      guide[i2] = !guide[i2];
      render();
      api("/api/guide", { method: "PUT", body: { guide: guide } }).catch(function () { toast("บันทึกคู่มือไม่สำเร็จ"); });
      return;
    }
    if ((t = el.closest("[data-filter]"))) {
      if (t.getAttribute("data-filter") === "plat") filterPlat = t.getAttribute("data-val");
      else filterStat = t.getAttribute("data-val");
      render(); return;
    }
    if (el.closest("[data-pick]")) { var fi = document.getElementById("file"); if (fi) fi.click(); return; }
    if ((t = el.closest("[data-import]"))) {
      var a = t.getAttribute("data-import");
      if (a === "cancel" || a === "again") { imp = null; render(); return; }
      if (a === "go") { runImport(); return; }
    }
  });

  document.addEventListener("change", function (e) {
    if (e.target.id === "file") { readFile(e.target.files && e.target.files[0]); return; }
    var m = e.target.closest ? e.target.closest("[data-map]") : null;
    if (m && imp) { var v = m.value; imp.map[m.getAttribute("data-map")] = v === "" ? null : +v; }
  });
  document.addEventListener("dragover", function (e) { var d = document.getElementById("drop"); if (d) { e.preventDefault(); d.classList.add("hot"); } });
  document.addEventListener("dragleave", function () { var d = document.getElementById("drop"); if (d) d.classList.remove("hot"); });
  document.addEventListener("drop", function (e) {
    var d = document.getElementById("drop");
    if (!d) return;
    e.preventDefault(); d.classList.remove("hot");
    readFile(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]);
  });

  load();
})();
