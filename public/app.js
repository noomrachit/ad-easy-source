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
  var DAILY_CONTENT = [
    { day: "อาทิตย์", hook: "ใช้จ่าย ÷ คลิก", kind: "คลิป 30 วินาที",
      head: "อย่าดูยอดเข้าถึงก่อน",
      body: "เปิดรายงาน ดูช่องใช้จ่าย หารด้วยจำนวนคลิก ได้บาทต่อคลิก ถ้าสูงขึ้นทั้งที่สินค้าเดิม กลุ่มเริ่มเบื่อ เปลี่ยนพาดหัวก่อนเพิ่มงบ\nจดตัวเลขนี้สัปดาห์ละครั้ง" },
    { day: "จันทร์", hook: "ส่งออก CSV 7 แตะ", kind: "คาร์รูเซล 4 หน้า",
      head: "แอดแปดตัว จำได้แค่ตัวที่เพิ่งเปิด",
      body: "Ads Manager → รายงาน → ส่งออก 7 วัน → นำเข้าไฟล์ที่เดียว\nแอปนี้บันทึกผล ไม่ได้ยิงแทน" },
    { day: "อังคาร", hook: "แก้ความเข้าใจผิด", kind: "โพสต์สั้น",
      head: "เพิ่มแคมเปญในสมุด ≠ โฆษณาออกแล้ว",
      body: "ที่นี่ยังต้องเปิด Ads Manager ตามปกติ สมุดมีไว้กันลืมว่าตัวไหนคุ้ม" },
    { day: "พุธ", hook: "พาดหัว 8 คำ", kind: "รูป + ข้อความบนภาพ",
      head: "จดคนทักก่อนลืม",
      body: "คนทักจากแอดวันนี้ ชื่อ เบอร์ แคมเปญต้นทาง สถานะ\nรายได้ยังไม่ใช่จำนวนรายชื่อ" },
    { day: "พฤหัส", hook: "เทส 3 แบบ", kind: "คลิป + แคปชัน",
      head: "แคมเปญเดียว เปลี่ยนมุม ไม่ใช่คำสวย",
      body: "มุมปัญหา / มุมตัวเลข / มุมคนเข้าใจผิด\nทักช่องเดียว คำเดียว" },
    { day: "ศุกร์", hook: "นัดติดตามลูกค้า", kind: "โพสต์ขั้นตอน",
      head: "บอททักแรก คนปิดการขาย",
      body: "คนทักครั้งแรกได้ข้อความต้อนรับ นอกเวลาบอกโมงที่ตอบ คอมเมนต์คำคีย์เวิร์ดชวนแชทช่องเดียว นัดในสมุดถึงกำหนดให้โทรเอง ห้ามยิงทั้งลิสต์" },
    { day: "เสาร์", hook: "ตรวจ 10 วินาที", kind: "โพสต์เช็คลิสต์",
      head: "ก่อนกดลง ใช้ 10 วินาที",
      body: "มีตัวเลขหรือขั้นตอนหรือยัง / มีคำอวดต้องลบหรือยัง / คนอ่านรู้ว่าต้องทำอะไรต่อหรือยัง / ตัดบรรทัดสุดท้ายแล้วยังรู้เรื่องอยู่ไหม" }
  ];
  function todayContent() {
    return DAILY_CONTENT[new Date().getDay()];
  }

  var me = null, campaigns = [], leads = [], guide = [false, false, false, false, false];
  var meta = { connected: false, accounts: [], selectedAct: null, name: "" };
  var metaConfigured = false;
  var notifications = [];
  var notifyOpen = false;
  var inbox = [];
  var inboxConfigured = false;
  var outboundReady = { email: false, sms: false };
  var morningPack = null;
  var view = "home", filterPlat = "all", filterStat = "all", filterLead = "all";
  var LEAD_STATUSES = [
    { k: "new", label: "ใหม่", cls: "p-paused" },
    { k: "contacted", label: "ติดต่อแล้ว", cls: "p-plat" },
    { k: "qualified", label: "น่าจะซื้อ", cls: "p-plat ig" },
    { k: "won", label: "ปิดการขาย", cls: "p-active" },
    { k: "lost", label: "ไม่ได้ซื้อ", cls: "p-ended" }
  ];
  var authMode = "register", authMsg = "", busy = false, imp = null;
  try { view = sessionStorage.getItem("adeasy_tab") || "home"; } catch (e) {}
  // เครื่องที่เคยล็อกอินแล้วให้ขึ้นหน้าเข้าสู่ระบบ เครื่องใหม่ให้ขึ้นหน้าสมัคร
  try { if (localStorage.getItem("adeasy_returning") === "1") authMode = "login"; } catch (e) {}

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
  var SELLING = [
    ["📊", "เห็นทุกแพลตฟอร์มในหน้าเดียว", "Facebook, Instagram, TikTok รวมอยู่ที่เดียว ไม่ต้องเปิดสลับไปมาแล้วจดใส่กระดาษ"],
    ["📥", "นำเข้าไฟล์จาก Ads Manager ได้เลย", "ส่งออกรายงานเป็น CSV แล้วลากไฟล์เข้ามา ระบบอ่านคอลัมน์ให้เอง ไม่ต้องพิมพ์ทีละช่อง"],
    ["💡", "บอกด้วยว่าตัวเลขที่เห็นแปลว่าอะไร", "ค่าต่อคลิก อัตราการคลิก คำนวณให้พร้อมบอกว่าเท่าไหร่ถึงเรียกว่าปกติ"],
    ["🆓", "ใช้ฟรี ไม่มีบัตรเครดิต", "สมัครด้วยอีเมลอย่างเดียว ข้อมูลเก็บบนเซิร์ฟเวอร์ เปิดจากมือถือหรือคอมก็เห็นชุดเดียวกัน"]
  ];

  function renderAuth() {
    var reg = authMode === "register";
    var sell = SELLING.map(function (s) {
      return '<li><span class="e">' + s[0] + '</span><span><b>' + esc(s[1]) + "</b>" + esc(s[2]) + "</span></li>";
    }).join("");

    document.getElementById("app").innerHTML =
      '<div class="auth"><div class="box">' +
        '<div class="logo"><span class="mark">A</span><span><b>ad easy</b><small>ทำโฆษณาแบบเข้าใจ</small></span></div>' +
        '<div class="split">' +
          '<section class="pitch">' +
            "<h2>บันทึกผลโฆษณาที่ยิงไป ให้รู้ว่าตัวไหนคุ้ม</h2>" +
            "<p class=\"lede\">ยิงแอดไปหลายตัวแล้วจำไม่ได้ว่าอันไหนได้ผล? บันทึกไว้ที่นี่ แล้วดูย้อนหลังได้ว่าเดือนไหนใช้เงินไปเท่าไหร่ ได้อะไรกลับมา</p>" +
            "<ul>" + sell + "</ul>" +
            '<p class="honest"><b>บอกไว้ก่อนตามตรง:</b> แอปนี้ไม่ยิงโฆษณาแทนคุณ ยังต้องสร้างแอดใน Ads Manager ตามปกติ เฟสนี้เชื่อมบัญชี Meta ได้เพื่อดูบัญชีโฆษณา ไม่ได้กดแล้วยิงออกฟีด</p>' +
          "</section>" +
          '<div class="panel">' +
            "<h1>" + (reg ? "สมัครใช้งานฟรี" : "เข้าสู่ระบบ") + "</h1>" +
            '<p class="sub">' + (reg ? "ใช้แค่อีเมลกับรหัสผ่าน ไม่ต้องกรอกอย่างอื่น" : "ยินดีต้อนรับกลับมา") + "</p>" +
            (authMsg ? '<div class="authmsg">' + esc(authMsg) + "</div>" : "") +
            '<form id="authform">' +
              '<div class="field"><label>อีเมล</label><input name="email" type="email" autocomplete="email" required placeholder="you@example.com"></div>' +
              '<div class="field"><label>รหัสผ่าน' + (reg ? " (อย่างน้อย 8 ตัวอักษร)" : "") + "</label>" +
                '<input name="password" type="password" autocomplete="' + (reg ? "new-password" : "current-password") + '" required minlength="8"></div>' +
              (reg ? '<label class="check"><input type="checkbox" name="consent" value="1">' +
                "<span>ส่งเคล็ดลับยิงแอดและรีวิวเครื่องมือช่วยทำโฆษณาให้ทางอีเมล เดือนละ 1–2 ฉบับ ยกเลิกได้ทุกเมื่อ (ไม่ติ๊กก็ใช้แอปได้ครบเหมือนกัน)</span></label>" : "") +
              '<button class="btn primary" type="submit" style="width:100%;justify-content:center"' + (busy ? " disabled" : "") + ">" +
                (busy ? "กำลังดำเนินการ…" : reg ? "สมัครและเริ่มใช้งาน" : "เข้าสู่ระบบ") + "</button>" +
            "</form>" +
            '<p class="swap">' + (reg ? "มีบัญชีอยู่แล้ว? " : "ยังไม่มีบัญชี? ") +
              '<button type="button" data-authswap="1">' + (reg ? "เข้าสู่ระบบ" : "สมัครใช้งานฟรี") + "</button></p>" +
          "</div>" +
        "</div>" +
        '<p class="foot">เราเก็บแค่อีเมลกับข้อมูลแคมเปญที่คุณกรอกเอง ไม่ขายข้อมูลให้ใคร</p>' +
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
    var consent = fd.get("consent") === "1";
    if (password.length < 8) { authMsg = "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร"; renderAuth(); return; }
    busy = true; authMsg = ""; renderAuth();
    api("/api/" + (authMode === "register" ? "register" : "login"), { method: "POST", body: { email: email, password: password, consent: consent } })
      .then(function () {
        busy = false;
        try { localStorage.setItem("adeasy_returning", "1"); } catch (err) {}
        return load();
      })
      .catch(function (err) { busy = false; authMsg = err.message; renderAuth(); });
  }

  /* ---------- data ---------- */
  function load() {
    return api("/api/me").then(function (d) {
      me = d.user;
      campaigns = d.campaigns || [];
      leads = d.leads || [];
      notifications = d.notifications || [];
      inbox = d.inbox || [];
      inboxConfigured = !!d.inboxConfigured;
      outboundReady = d.outbound || { email: false, sms: false };
      morningPack = d.morning || null;
      guide = d.guide || [false, false, false, false, false];
      meta = d.meta || { connected: false, accounts: [], selectedAct: null, name: "" };
      metaConfigured = !!d.metaConfigured;
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
      ["crm", "ลูกค้าจากแอด", "click"],
      ["inbox", "อินบ็อกซ์ Meta", "eye"],
      ["import", "นำเข้าไฟล์ CSV", "upload"],
      ["guide", "คู่มือเริ่มต้น", "book"],
      ["meta", "บัญชี Meta", "target"],
      ["tools", "เครื่องมือแนะนำ", "bolt"]
    ].map(function (n) {
      return '<button type="button" data-go="' + n[0] + '"' + (view === n[0] ? ' aria-current="true"' : "") + ">" + icon(n[2]) + "<span>" + n[1] + "</span></button>";
    }).join("");

    var body = view === "camp" ? pageCampaigns() : view === "import" ? pageImport()
      : view === "guide" ? pageGuide() : view === "meta" ? pageMeta()
      : view === "crm" ? pageCrm()
      : view === "inbox" ? pageInbox()
      : view === "tools" ? pageTools() : pageHome();

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
          notifyBell() +
        "</header>" +
        '<div class="page">' + body + "</div></main></div>";
  }

  function notifyBell() {
    var unread = notifications.filter(function (n) { return !n.read; }).length;
    var list = notifications.slice(0, 12).map(function (n) {
      return '<button class="nitem' + (n.read ? "" : " unread") + '" type="button" data-note="' + esc(n.id) + '" data-notelead="' + esc(n.leadId || "") + '">' +
        "<b>" + esc(n.title) + "</b><small>" + esc(n.body || "") + "</small></button>";
    }).join("");
    return '<div class="bellwrap">' +
      '<button class="bell" type="button" data-bell="1" aria-label="การแจ้งเตือน">' +
        icon("bolt") + (unread ? '<span class="badge">' + unread + "</span>" : "") +
      "</button>" +
      (notifyOpen ? '<div class="npanel"><h3>การแจ้งเตือนลูกค้า</h3>' +
        (list || '<p class="nempty">ยังไม่มีการแจ้งเตือน</p>') +
        (notifications.length ? '<button class="btn ghost sm" type="button" data-noteread="1" style="width:100%;justify-content:center;margin-top:8px">อ่านทั้งหมดแล้ว</button>' : "") +
      "</div>" : "") +
    "</div>";
  }

  function heading(eyebrow, title, desc, action) {
    return '<div class="phead"><div><p class="eyebrow"><i></i>' + esc(eyebrow) + "</p><h1>" + esc(title) + "</h1>" +
      (desc ? "<p>" + esc(desc) + "</p>" : "") + "</div>" + (action || "") + "</div>";
  }
  var DISCLAIMER = '<div class="notice"><b>แอปไม่ยิงแอดแทน</b> — เพิ่มแคมเปญในสมุดแล้วโฆษณาไม่ออกฟีด ยังต้องยิงใน Ads Manager ตามปกติ ปุ่มเชื่อม Meta คือผูกบัญชีโฆษณาของตัวเอง ไม่ใช่ปุ่มยิง</div>';

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
        '<button class="btn sm ghost" type="button" data-leadnew="' + esc(c.id) + '">เพิ่มลูกค้า</button>' +
        '<button class="btn sm ghost" type="button" data-toggle="' + esc(c.id) + '">' + (c.status === "active" ? "หยุดชั่วคราว" : "ให้ทำงานต่อ") + "</button>" +
        '<button class="btn sm danger" type="button" data-del="' + esc(c.id) + '">ลบ</button></div></article>';
  }

  function leadPill(k) {
    var s = LEAD_STATUSES.filter(function (x) { return x.k === k; })[0] || LEAD_STATUSES[0];
    return '<span class="pill ' + s.cls + '"><i></i>' + s.label + "</span>";
  }
  function campName(id) {
    var c = campaigns.filter(function (x) { return x.id === id; })[0];
    return c ? c.name : "";
  }
  function leadTotals() {
    var t = { n: leads.length, won: 0, money: 0, neu: 0 };
    leads.forEach(function (x) {
      if (x.status === "won") { t.won++; t.money += +x.value || 0; }
      if (x.status === "new" || x.status === "contacted") t.neu++;
    });
    return t;
  }
  function pageCrm() {
    var t = leadTotals();
    var head = heading("ลูกค้าจากแอด", "สมุดลูกค้าที่มาจากโฆษณา",
      "จดชื่อคนที่ทักมาจากแอด แล้วไล่สถานะจนปิดการขาย จะได้รู้ว่าแคมเปญไหนเอาเงินกลับมา",
      '<button class="btn primary" type="button" data-leadnew="">+ เพิ่มลูกค้า</button>');
    var chips = LEAD_STATUSES.map(function (s) {
      return '<button class="chip" type="button" data-leadfilter="' + s.k + '" aria-pressed="' + (filterLead === s.k) + '">' + esc(s.label) + "</button>";
    }).join("");
    var bar = '<div class="filters"><button class="chip" type="button" data-leadfilter="all" aria-pressed="' + (filterLead === "all") + '">ทุกสถานะ</button>' + chips + "</div>";
    var list = leads.filter(function (x) { return filterLead === "all" || x.status === filterLead; });
    var cards = list.map(function (x) {
      return '<article class="camp"><div class="r1"><h3>' + esc(x.name) + "</h3>" +
        (x.platform ? platPill(x.platform) : "") + leadPill(x.status) + "</div>" +
        '<p class="meta">' +
          (x.phone ? esc(x.phone) : "") +
          (x.email ? (x.phone ? " · " : "") + esc(x.email) : "") +
          (x.campaignId ? " · จากแคมเปญ " + esc(campName(x.campaignId) || x.campaignId) : "") +
          (x.value ? " · มูลค่า ฿" + nf(x.value) : "") +
          (x.followUpOn ? " · นัดติดตาม " + esc(x.followUpOn) : "") +
        "</p>" +
        (x.note ? "<p class=\"hint\" style=\"margin:8px 0 0\">" + esc(x.note) + "</p>" : "") +
        '<div class="acts"><button class="btn sm ghost" type="button" data-leadedit="' + esc(x.id) + '">แก้ไข</button>' +
          (x.phone ? '<a class="btn sm ghost" href="tel:' + esc(x.phone) + '">โทร</a>' : "") +
          (x.email ? '<a class="btn sm ghost" href="mailto:' + esc(x.email) + '?subject=' + encodeURIComponent("ติดตามจากโฆษณา") + '">อีเมลเครื่องนี้</a>' : "") +
          (x.email ? '<button class="btn sm ghost" type="button" data-sendmail="' + esc(x.id) + '">อีเมลจากเซิร์ฟเวอร์</button>' : "") +
          (x.phone ? '<button class="btn sm ghost" type="button" data-sendsms="' + esc(x.id) + '">SMS จากเซิร์ฟเวอร์</button>' : "") +
          '<button class="btn sm danger" type="button" data-leaddel="' + esc(x.id) + '">ลบ</button></div></article>';
    }).join("");
    var summary = '<div class="stats" style="margin-bottom:18px">' +
      '<div class="stat"><p class="lab">ลูกค้าทั้งหมด</p><p class="val">' + nf(t.n) + "</p></div>" +
      '<div class="stat"><p class="lab">รอติดตาม</p><p class="val">' + nf(t.neu) + "</p></div>" +
      '<div class="stat"><p class="lab">ปิดการขาย</p><p class="val">' + nf(t.won) + "</p></div>" +
      '<div class="stat"><p class="lab">ยอดจากแอด</p><p class="val">฿' + nf(t.money) + "</p></div></div>";
    if (!leads.length) {
      return head + '<div class="notice"><b>ยังไม่ดึงแชทจาก Ads Manager อัตโนมัติ</b> — เมื่อมีคนทักจากแอด ให้บันทึกที่นี่ แล้วผูกกับแคมเปญที่ยิงอยู่</div>' +
        '<div class="empty"><div class="big">👤</div><h3>ยังไม่มีลูกค้าในสมุด</h3>' +
        "<p>เพิ่มคนที่ทักไลน์ / อินบ็อกซ์ / โทรมา แล้วเลือกแคมเปญต้นทาง</p>" +
        '<button class="btn primary" type="button" data-leadnew="">เพิ่มลูกค้าคนแรก</button></div>';
    }
    return head + summary + bar +
      '<p style="font-size:13px;color:var(--faint);margin:0 0 14px">แสดง ' + nf(list.length) + " จาก " + nf(leads.length) + " ราย</p>" +
      (list.length ? '<div class="camps">' + cards + "</div>" : '<div class="empty"><h3>ไม่มีรายการตามตัวกรอง</h3></div>');
  }

  function pageInbox() {
    var head = heading("อินบ็อกซ์ Meta", "ข้อความจากเพจ", "รับ webhook จาก Messenger แล้วตอบกลับทีละคน ไม่บรอดแคสต์ทั้งลิสต์");
    var note = (inboxConfigured
      ? '<div class="notice">Webhook พร้อมรับข้อความเมื่อมีโดเมน HTTPS และผูกเพจแล้ว</div>'
      : '<div class="notice"><b>ยังไม่พร้อมใช้กับบัญชีจริง</b> — ตั้ง META_PAGE_ACCESS_TOKEN, META_WEBHOOK_VERIFY_TOKEN, META_APP_SECRET, META_OWNER_EMAIL แล้วชี้ https://โดเมน/api/meta/webhook</div>') +
      '<div class="notice">คนทั่วไปทักเพจได้หลังผ่าน Meta App Review อีเมลเจ้าของต้องตรงกับที่สมัครในแอป ไม่เชื่อม Pipedrive/Salesforce</div>';
    var list = (inbox || []).map(function (m) {
      return '<article class="camp"><div class="r1"><h3>' + esc(m.direction === "out" ? "เราตอบ" : "ลูกค้า") + "</h3>" +
        '<span class="pill p-plat">' + esc(m.platform || "meta") + "</span></div>" +
        '<p class="meta">ผู้ส่ง ' + esc(m.senderId || "—") + "</p>" +
        "<p>" + esc(m.text || "") + "</p>" +
        (m.direction === "in" ? '<div class="acts"><button class="btn sm primary" type="button" data-inreply="' + esc(m.senderId) + '">ตอบ</button></div>' : "") +
        "</article>";
    }).join("");
    return head + note + (list ? '<div class="camps">' + list + "</div>" : '<div class="empty"><h3>ยังไม่มีข้อความ</h3><p>เมื่อมีคนทักเพจ รายการจะขึ้นที่นี่</p></div>');
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

  function pageMeta() {
    var acc = (meta.accounts || []).map(function (a) {
      var sel = meta.selectedAct === a.id;
      return '<label class="check" style="margin:8px 0;display:flex;gap:10px;align-items:flex-start">' +
        '<input type="radio" name="act" data-act="' + esc(a.id) + '"' + (sel ? " checked" : "") + ">" +
        "<span><b>" + esc(a.name) + "</b><br><small>" + esc(a.id) +
        (a.currency ? " · " + esc(a.currency) : "") + "</small></span></label>";
    }).join("");
    var body;
    if (!meta.connected) {
      body = '<div class="card"><h2>ยังไม่ได้เชื่อมบัญชี Meta</h2>' +
        "<p class=\"hint\">เชื่อมบัญชีโฆษณา Facebook ของคุณเอง เพื่อให้เฟสถัดไปสร้างแคมเปญบนแพลตฟอร์มได้ ตอนนี้ปุ่มนี้แค่ขอสิทธิ์และดึงรายชื่อ Ad Account — ยังไม่ยิงโฆษณา</p>" +
        (metaConfigured
          ? '<button class="btn primary" type="button" data-meta="connect"' + (busy ? " disabled" : "") + ">" + (busy ? "กำลังเปิดหน้าต่าง Meta…" : "เชื่อมบัญชี Facebook / Instagram") + "</button>"
          : '<div class="notice"><b>เซิร์ฟเวอร์ยังไม่ได้ตั้งค่าแอป Meta</b> — ใส่ META_APP_ID, META_APP_SECRET, PUBLIC_BASE_URL และ TOKEN_SECRET บน Railway แล้ว redeploy</div>') +
        '<div class="notice" style="margin-top:12px"><b>สิทธิ์ภายนอก</b> — คนนอกโหมดทดสอบทักเพจได้เมื่อผ่าน Meta App Review อีเมล META_OWNER_EMAIL ต้องตรงกับอีเมลที่สมัครใน Ad Easy</div>' +
        '<p class="hint" style="margin-top:10px">Marketing API Access Tier (ชื่อใหม่ของ Ads Management Standard Access) ดูใน App Dashboard → App Review → Permissions and Features ขอ Full เมื่อมี 500 ครั้งสำเร็จใน 15 วัน และ error ต่ำกว่า 15% ใน 500 ครั้งล่าสุด — คนละเรื่องกับอินบ็อกซ์ แอปนี้ยังไม่ต้องขอ Full เพราะยังไม่ยิงแอด</p>' +
        "</div>";
    } else {
      body = '<div class="card"><h2>เชื่อมแล้ว' + (meta.name ? " — " + esc(meta.name) : "") + "</h2>" +
        "<p class=\"hint\">เลือกบัญชีโฆษณาที่จะใช้ในเฟสถัดไป</p>" +
        (acc || "<p>ไม่พบบัญชีโฆษณาที่สิทธิ์นี้เข้าถึงได้</p>") +
        '<div class="row" style="margin-top:16px">' +
          '<button class="btn primary" type="button" data-meta="save"' + (busy ? " disabled" : "") + ">บันทึกบัญชีที่เลือก</button>" +
          '<button class="btn ghost" type="button" data-meta="refresh">รีเฟรชรายชื่อบัญชี</button>' +
          '<button class="btn ghost" type="button" data-meta="disconnect">ยกเลิกการเชื่อม</button>' +
        "</div></div>";
    }
    return heading("บัญชีโฆษณา", "เชื่อม Meta ของตัวเอง", "เฟส A: เก็บ token และรายชื่อ Ad Account เท่านั้น ยังไม่สร้างหรือปล่อยโฆษณา") +
      '<div class="notice"><b>ยังไม่ยิงแอด</b> — การเชื่อมบัญชีไม่ได้ทำให้โฆษณาออกไปเอง</div>' + body;
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
      '<div class="steps">' + steps + "</div>" +
      '<div class="card nudge"><b>ติดตรงข้อ 3 — ทำโฆษณาหลายแบบไม่ไหว?</b>' +
      "<p>เรารวมชุดคำสั่งสำหรับให้ AI ช่วยเขียนแคปชันและพาดหัวหลายแบบไว้ให้แล้ว ก๊อปไปใช้ได้เลย</p>" +
      '<button class="btn ghost sm" type="button" data-go="tools">ดูชุดคำสั่ง</button></div>';
  }

  /* ---------- เครื่องมือแนะนำ ---------- */
  var AFF_LINK = "https://www.chatplayground.ai/?ref=rachitdr";
  var HUB_LINK = "https://aireview-th.netlify.app";

  var PROMPTS = [
    {
      t: "เขียนแคปชัน 5 แบบตามโครง 4 ท่อน",
      why: "หยุดนิ้ว → ของจริงหนึ่งอย่าง → ตัวเลขหรือขั้นตอน → ชวนทำอย่างเดียว",
      p: "ช่วยเขียนแคปชันโฆษณาภาษาไทย 5 แบบสำหรับ [ชื่อสินค้า/บริการ]\nกลุ่มลูกค้า: [เช่น ผู้หญิง 25-40 ปี ในกรุงเทพ]\nของจริงที่พูดได้: [เช่น ราคา 390 / ส่งใน 2 วัน / มี 3 กลิ่น]\nคำชวนให้ทัก: [เช่น ทักว่า โปร]\n\nแต่ละแบบใช้โครง 4 ท่อน:\n1) เปิดด้วยปัญหาที่กลุ่มนี้รู้จัก ไม่เปิดด้วยชื่อแบรนด์\n2) บอกของจริงเพียงอย่างเดียว\n3) ใส่ตัวเลขหรือขั้นตอนที่เป็นความจริงเท่านั้น\n4) จบด้วยคำชวนอย่างเดียว\n\nความยาว 2-4 บรรทัด ไม่ใส่แฮชแท็ก\nห้ามใช้คำว่า อันดับ 1 ดีที่สุด ถูกที่สุด รับประกัน รวยแน่\nห้ามสัญญาผลลัพธ์ที่พิสูจน์ไม่ได้\nห้ามยัดหลายเรื่องในแคปชันเดียว\nขอ 5 มุม: ปัญหา / ตัวเลข-ขั้นตอน / ของที่คนมักเข้าใจผิด / ราคา / คนทักแล้วไม่รู้จะตอบอะไร"
    },
    {
      t: "คิดพาดหัวสั้นบนรูป 10 อัน",
      why: "ไม่เกิน 8 คำ มีตัวเลขหรือขั้นตอน ห้ามคำอวด",
      p: "ช่วยคิดพาดหัวสั้นภาษาไทยสำหรับใส่บนรูปโฆษณา [ชื่อสินค้า] จำนวน 10 อัน\nของจริงที่ใช้ได้: [ตัวเลขหรือขั้นตอน เช่น 3 ขั้นตอน / งบวันละ 200]\n\nเงื่อนไข:\n- ไม่เกิน 8 คำต่ออัน อ่านรู้เรื่องใน 1 วินาที\n- แต่ละอันพูดเรื่องเดียว\n- มีตัวเลขหรือขั้นตอน ห้ามประโยคว่า ยิงแล้วรวย\n- ห้ามใช้ อันดับ 1 ดีที่สุด ถูกที่สุด รับประกัน ลับ รวยแน่\n- ห้ามทำให้คนเข้าใจว่าแอปหรือร้านยิงแอดแทนลูกค้า\nเรียงจากอันที่คนกลุ่มเป้าหมายน่าจะหยุดดูมากที่สุด"
    },
    {
      t: "ทำแคปชัน 3 แบบไว้เทสในแคมเปญเดียว",
      why: "คู่มือข้อ 3 — เปลี่ยนมุม ไม่ใช่แค่เปลี่ยนคำสวย",
      p: "ฉันจะเทสโฆษณา [สินค้า] ราคา [ราคา] บาท กับกลุ่ม [กลุ่มเป้าหมาย]\nจุดที่คนมักติด: [เช่น ทักมาแล้วเงียบ / ไม่รู้จะดูตัวเลขช่องไหน]\n\nช่วยเขียนแคปชัน 3 แบบ คนละมุม:\nก) มุมปัญหา\nข) มุมตัวเลขหรือขั้นตอน\nค) มุมแก้ความเข้าใจผิด\n\nทุกแบบใช้โครง หยุดนิ้ว / ของจริงหนึ่งอย่าง / หลักฐานสั้น / ทักคำว่า [คำ]\nห้ามคำอวด ห้ามยาวเกิน 4 บรรทัด ห้ามใส่ลิงก์หลายอัน"
    },
    {
      t: "วิเคราะห์แอดจากตัวเลขแล้วเขียนแคปชันชุดใหม่",
      why: "เอาตัวเลขจากหน้าภาพรวมมาใส่ แล้วได้แคปชันแก้จุดอ่อน",
      p: "โฆษณาได้ผลแบบนี้:\nใช้เงิน [ยอด] บาท / คนเห็น [เลข] ครั้ง / คลิก [เลข] ครั้ง / คนทัก [เลข] คน\nสินค้า: [สินค้า] ราคา [ราคา] บาท\nแคปชันเดิม: [วางข้อความเดิม]\n\n1) ชี้ว่าปัญหาอยู่ที่รูป พาดหัว กลุ่ม หรือหน้าที่คนกดเข้าไป อธิบายสั้น ๆ\n2) เขียนพาดหัวใหม่ 5 อัน ไม่เกิน 8 คำ ห้ามคำอวด\n3) เขียนแคปชันใหม่ 2 อัน ตามโครง 4 ท่อน แก้จุดอ่อนนั้นโดยเฉพาะ\nอย่าแนะนำให้โม้ผลลัพธ์"
    }
  ];

  function pageTools() {
    var cards = PROMPTS.map(function (x, i) {
      return '<article class="prompt"><div class="ph"><h3>' + esc(x.t) + "</h3>" +
        '<button class="btn sm ghost" type="button" data-copy="' + i + '">คัดลอก</button></div>' +
        '<p class="why">' + esc(x.why) + "</p>" +
        "<pre>" + esc(x.p) + "</pre></article>";
    }).join("");

    var today = todayContent();
    return heading("เครื่องมือแนะนำ", "ช่วยคิดคำโฆษณาให้เร็วขึ้น",
        "คนยิงแอดหมดเวลาไปกับการคิดแคปชันมากกว่าการดูตัวเลข นี่คือชุดคำสั่งที่เอาไปวางใน AI ได้เลย") +
      '<div class="card rec"><p class="eyebrow2">คอนเทนต์วันนี้ · ' + esc(today.day) + "</p>" +
        "<h2>" + esc(today.head) + "</h2>" +
        "<p>รูปแบบ: " + esc(today.kind) + " · พาดหัวสั้น: " + esc(today.hook) + "</p>" +
        "<pre>" + esc(today.body) + "</pre>" +
        '<div class="row"><button class="btn primary" type="button" data-copydaily="1">คัดลอกคอนเทนต์วันนี้</button></div>' +
        "<p class=\"hint\" style=\"margin:12px 0 0\">หมุนใหม่ทุกวันตามปฏิทินเครื่อง อาทิตย์ถึงเสาร์ คนละเรื่อง ผ่านกติกาคอนเทนต์แล้ว</p></div>" +
      '<div class="card"><h2>กติกาคอนเทนต์ — กันไม่ให้กลายเป็นสแปมแอด</h2>' +
        "<ol class=\"hint\" style=\"margin:8px 0 0;padding-left:20px;line-height:1.8\">" +
          "<li>ทุกชิ้นมีตัวเลขหรือขั้นตอน ไม่มีแค่ประโยค «ยิงแล้วรวย»</li>" +
          "<li>บอกตรง ๆ ว่าแอปไม่ยิงแทน เหมือนข้อความในหน้าเว็บ</li>" +
          "<li>ห้ามพาดหัว «อันดับ 1 / ดีที่สุด» ทั้งคอนเทนต์และโฆษณาที่สอน</li>" +
          "<li>1 ชิ้น = 1 เรื่อง อย่ายัด Meta API + TikTok + AI ในคลิปเดียว</li>" +
          "<li>วัดผลจากคนสมัคร / คนเพิ่มแคมเปญแรก / คนนำเข้า CSV ไม่ใช่แค่ยอดไลก์</li>" +
        "</ol></div>" +
      '<div class="card"><h2>ตรวจ 10 วินาทีก่อนลง</h2>' +
        "<ul class=\"hint\" style=\"margin:8px 0 0;padding-left:20px;line-height:1.8\">" +
          "<li>มีตัวเลขหรือขั้นตอนหรือยัง</li>" +
          "<li>มีคำอวดต้องลบหรือยัง</li>" +
          "<li>คนอ่านรู้ว่าต้องทำอะไรต่อหรือยัง</li>" +
          "<li>ตัดบรรทัดสุดท้ายออกแล้วยังรู้เรื่องอยู่ไหม — ถ้าไม่รู้ ต้นเรื่องยังยาวเกิน</li>" +
        "</ul></div>" +
      '<div class="card"><h2>กติกาขอเงิน / ไม่ขอเงิน</h2>' +
        "<ol class=\"hint\" style=\"margin:8px 0 0;padding-left:20px;line-height:1.8\">" +
          "<li>ยังไม่ขายคอร์สยาว จนกว่าจะมีคนใช้แอปทำแคมเปญแรกหรือนำเข้า CSV จริง</li>" +
          "<li>ไม่เก็บค่าสมัคร Ad Easy ตอนนี้ ของฟรีแลกข้อมูลที่ใช้ได้จริง พันธมิตรเป็นรายได้ชั้นแรก</li>" +
          "<li>เปิดเผยทุกครั้งที่มีค่าคอม เหมือนข้อความในหน้าเครื่องมือ</li>" +
          "<li>ไม่ขายรายชื่ออีเมล คนที่ติ๊กยินยอมได้แค่จดหมายของเรา</li>" +
          "<li>ค่าแอดไม่ใช่รายได้ เงินที่โอนให้ Meta/TikTok เป็นต้นทุน</li>" +
          "<li>รายได้จากแอด = ยอดปิดขายใน CRM − ค่าแอดของแคมเปญนั้น ไม่ใช่ยอดเข้าถึง</li>" +
          "<li>ไม่รับงานยิงให้ลูกค้า ถ้าลูกค้ายังไม่มีสินค้าให้คนจ่าย หรือยังไม่ยอมตั้งเพดานงบ</li>" +
          "<li>คอนเทนต์ที่ขอเงินหรือชวนสมัคร ต้องมีตัวเลขหรือขั้นตอน และต้องบอกว่าแอปไม่ยิงแทน</li>" +
        "</ol>" +
        "<p class=\"hint\" style=\"margin:14px 0 6px\"><b>ถือว่าควรได้เงินเมื่ออย่างน้อยข้อหนึ่งเป็นจริง</b></p>" +
        "<ul class=\"hint\" style=\"margin:0;padding-left:20px;line-height:1.8\">" +
          "<li>มีคนนอกวงตัวเองสมัคร Ad Easy และเพิ่มแคมเปญแรก</li>" +
          "<li>มีออเดอร์จากแอดที่จดในสมุดลูกค้าสถานะปิดการขาย</li>" +
          "<li>มีคนสมัคร ChatPlayground ผ่านลิงก์พันธมิตรโดยรู้ว่าเป็นลิงก์แนะนำ</li>" +
        "</ul>" +
        "<p class=\"hint\" style=\"margin:10px 0 0\">ยังไม่ถึงเกณฑ์ถ้ามีแค่ยอดวิว ยอดไลก์ หรือแคมเปญที่สร้างในแอปแต่ไม่มีคนทัก</p>" +
        "</div>" +
      '<div class="card"><h2>ลำดับข้อความอัตโนมัติ — ทำตามนี้เท่านั้น</h2>' +
        "<ol class=\"hint\" style=\"margin:8px 0 0;padding-left:20px;line-height:1.8\">" +
          "<li>คนทักครั้งแรก → ข้อความต้อนรับ + ถามว่าสนใจอะไร</li>" +
          "<li>นอกเวลา → บอกว่าจะตอบกี่โมง</li>" +
          "<li>คอมเมนต์คำคีย์เวิร์ด → ส่งลิงก์หรือชวนเข้าแชท (ช่องเดียว)</li>" +
          "<li>นัดใน CRM ถึงกำหนด → คนกดโทรหรืออีเมลจากแอป ไม่ให้บอทยิงซ้ำทั้งลิสต์</li>" +
        "</ol>" +
        "<p class=\"hint\" style=\"margin:10px 0 0\">ห้ามข้ามขั้น ห้ามบรอดแคสต์ทั้งลิสต์แทนข้อ 4 บอททำข้อ 1–3 คนปิดการขาย</p>" +
        "<p class=\"hint\" style=\"margin:8px 0 0\">ก่อนเปิด webhook LINE ให้ปิดข้อความต้อนรับอัตโนมัติในแอป LINE OA อีเมล LINE_OWNER_EMAIL ต้องตรงกับอีเมลที่สมัครใน Ad Easy</p>" +
        "</div>" +
      '<div class="card"><h2>กติกาเลือก CRM</h2>' +
        "<ul class=\"hint\" style=\"margin:8px 0 0;padding-left:20px;line-height:1.8\">" +
          "<li>อย่าย้ายระบบจนกว่าจะมีคนทักจริง ไม่ใช่แค่แคมเปญในแอป</li>" +
          "<li>รายได้ยังนับจากสถานะปิดการขาย − ค่าแอด ไม่ใช่จำนวนรายชื่อใน CRM</li>" +
          "<li>CRM ฟรีเกือบทุกตัวจะดันให้อัปเกรด — ใช้แค่ท่อสถานะและประวัติการติดต่อก่อน</li>" +
          "<li>อย่าใส่รายชื่อคนที่ติ๊กยินยอมใน Ad Easy ไปขายหรือยัดลงเครื่องมืออื่นโดยไม่บอก</li>" +
        "</ul>" +
        "<p class=\"hint\" style=\"margin:10px 0 0\">ยังไม่ใช้ Pipedrive หรือ Salesforce ตอนนี้ ไม่ฟรีระยะยาวและใหญ่เกินร้านที่เพิ่งจดลูกค้าจากแอด เริ่มที่สมุดในแอปนี้ ถ้าปิดการขายที่ไลน์ให้จดสถานะในนี้ก่อน ถ้าลีดมาจากฟอร์มเฟสค่อยเปิด Lead Center คู่กัน</p>" +
        "<p class=\"hint\" style=\"margin:8px 0 0\"><b>ไม่เชื่อม API Pipedrive / Salesforce</b> ตามกติกานี้ ไม่มีปุ่ม OAuth และไม่มีที่ใส่คีย์ของสองระบบนั้น</p>" +
        "</div>" +
      '<div class="card rec">' +
        '<p class="eyebrow2">เครื่องมือที่เราใช้เอง</p>' +
        "<h2>ChatPlayground</h2>" +
        "<p>ถามคำถามเดียว แล้วให้ AI หลายตัว (ChatGPT, Claude, Gemini และอื่นๆ รวม 40+ ตัว) ตอบพร้อมกันในหน้าเดียว " +
        "สำหรับงานเขียนแคปชันมันมีประโยชน์ตรงที่ได้หลายสำนวนมาเทียบในครั้งเดียว แทนที่จะต้องเปิดทีละเว็บแล้วถามซ้ำ — " +
        "ตรงกับที่คู่มือบอกว่าควรมีโฆษณาหลายแบบไว้เทส</p>" +
        '<div class="row"><a class="btn primary" href="' + AFF_LINK + '" target="_blank" rel="noopener sponsored">ลองใช้ ChatPlayground</a>' +
        '<a class="btn ghost" href="' + HUB_LINK + '" target="_blank" rel="noopener">อ่านรีวิวเครื่องมือ AI ตัวอื่น</a></div>' +
        '<p class="afd">เปิดเผยตามตรง: ลิงก์ ChatPlayground ด้านบนเป็นลิงก์พันธมิตร ถ้าคุณสมัครผ่านลิงก์นี้เราจะได้ค่าตอบแทนเล็กน้อย ' +
        "โดยคุณจ่ายเท่าเดิม รายได้ส่วนนี้คือสิ่งที่ทำให้ Ad Easy เปิดให้ใช้ฟรีได้ ไม่ต้องเก็บค่าสมาชิก</p>" +
      "</div>" +
      '<h2 style="font-size:19px;margin:26px 0 14px">ชุดคำสั่งพร้อมใช้</h2>' +
      '<p class="hint" style="margin:-8px 0 16px">ก๊อปไปวางใน AI ตัวไหนก็ได้ แล้วแทนที่ข้อความในวงเล็บ [ ] ด้วยข้อมูลของคุณ</p>' +
      '<div class="prompts">' + cards + "</div>";
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

  function openLeadForm(id, fromCamp) {
    var L = id ? leads.filter(function (x) { return x.id === id; })[0] : null;
    var v = L || { name: "", phone: "", email: "", platform: "", campaignId: fromCamp || "", status: "new", value: "", note: "", followUpOn: "" };
    if (fromCamp && !L) {
      var src = campaigns.filter(function (x) { return x.id === fromCamp; })[0];
      if (src) v.platform = src.platform;
    }
    var campOpts = '<option value="">— ไม่ผูกแคมเปญ —</option>' + campaigns.map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (v.campaignId === c.id ? " selected" : "") + ">" + esc(c.name) + "</option>";
    }).join("");
    var platOpts = '<option value="">— ไม่ระบุ —</option>' + PLATFORMS.map(function (p) {
      return '<option value="' + p + '"' + (v.platform === p ? " selected" : "") + ">" + p + "</option>";
    }).join("");
    var stOpts = LEAD_STATUSES.map(function (s) {
      return '<option value="' + s.k + '"' + (v.status === s.k ? " selected" : "") + ">" + s.label + "</option>";
    }).join("");
    var w = document.createElement("div");
    w.className = "modal";
    w.innerHTML = '<button class="veil" type="button" data-close="1" aria-label="ปิด"></button>' +
      '<div class="box" role="dialog" aria-modal="true"><h2>' + (L ? "แก้ไขลูกค้า" : "เพิ่มลูกค้าจากแอด") + "</h2><form id=\"lform\">" +
      '<div class="field"><label>ชื่อ</label><input name="name" required maxlength="80" value="' + esc(v.name) + '" placeholder="ชื่อที่ทักมา"></div>' +
      '<div class="grid2">' +
        '<div class="field"><label>เบอร์โทร</label><input name="phone" maxlength="40" value="' + esc(v.phone) + '"></div>' +
        '<div class="field"><label>อีเมล</label><input name="email" type="email" maxlength="190" value="' + esc(v.email) + '"></div>' +
        '<div class="field"><label>มาจากแพลตฟอร์ม</label><select name="platform">' + platOpts + "</select></div>" +
        '<div class="field"><label>สถานะ</label><select name="status">' + stOpts + "</select></div>" +
        '<div class="field"><label>แคมเปญต้นทาง</label><select name="campaignId">' + campOpts + "</select></div>" +
        '<div class="field"><label>ยอดขาย (บาท)</label><input name="value" type="number" min="0" step="1" value="' + esc(v.value) + '"></div>' +
        '<div class="field"><label>นัดติดตาม</label><input name="followUpOn" type="date" value="' + esc(v.followUpOn || "") + '"></div>' +
      "</div>" +
      '<div class="field"><label>บันทึกช่วยจำ</label><input name="note" maxlength="500" value="' + esc(v.note) + '" placeholder="เช่น ทักมาจากรีลส์ชุดโปรส่งฟรี"></div>' +
      '<div class="foot"><button class="btn ghost" type="button" data-close="1">ยกเลิก</button>' +
      '<button class="btn primary" type="submit">' + (L ? "บันทึก" : "เพิ่มลูกค้า") + "</button></div></form></div>";
    document.body.appendChild(w);
    var inp = w.querySelector('input[name="name"]');
    if (inp) inp.focus();
    w.addEventListener("click", function (e) { if (e.target.closest("[data-close]")) w.remove(); });
    w.querySelector("#lform").addEventListener("submit", function (e) {
      e.preventDefault();
      var f = new FormData(e.target);
      var rec = {
        name: String(f.get("name") || "").trim(),
        phone: String(f.get("phone") || "").trim(),
        email: String(f.get("email") || "").trim(),
        platform: f.get("platform") || "",
        campaignId: f.get("campaignId") || "",
        status: f.get("status") || "new",
        value: num(f.get("value")),
        note: String(f.get("note") || "").trim(),
        followUpOn: String(f.get("followUpOn") || "")
      };
      if (!rec.name) { toast("ใส่ชื่อก่อน"); return; }
      var req = L ? api("/api/leads/" + encodeURIComponent(L.id), { method: "PUT", body: rec })
                  : api("/api/leads", { method: "POST", body: rec });
      req.then(function (d) {
        if (L) { for (var i = 0; i < leads.length; i++) if (leads[i].id === L.id) leads[i] = d.lead; }
        else leads.unshift(d.lead);
        if (d.notifications) notifications = d.notifications;
        w.remove(); render(); toast(L ? "บันทึกแล้ว" : "เพิ่มลูกค้าแล้ว");
      }).catch(function (err) { toast(err.message); });
    });
  }

  /* ---------- events ---------- */
  document.addEventListener("click", function (e) {
    var el = e.target, t;
    if (!el || !el.closest) return;

    if ((t = el.closest("[data-authswap]"))) { authMode = authMode === "login" ? "register" : "login"; authMsg = ""; renderAuth(); return; }
    if ((t = el.closest("[data-meta]"))) {
      var actn = t.getAttribute("data-meta");
      if (actn === "connect") {
        busy = true; render();
        api("/api/connect/meta/start").then(function (d) {
          if (d.url) location.href = d.url;
          else { busy = false; toast("เปิดหน้าต่างเชื่อมไม่สำเร็จ"); render(); }
        }).catch(function (err) { busy = false; toast(err.message); render(); });
        return;
      }
      if (actn === "save") {
        var picked = document.querySelector('input[name="act"]:checked');
        if (!picked) { toast("เลือกบัญชีโฆษณาก่อน"); return; }
        busy = true; render();
        api("/api/ad-accounts", { method: "PUT", body: { selectedAct: picked.getAttribute("data-act") } })
          .then(function (d) { busy = false; meta = d.meta || meta; render(); toast("บันทึกบัญชีแล้ว"); })
          .catch(function (err) { busy = false; render(); toast(err.message); });
        return;
      }
      if (actn === "refresh") {
        busy = true; render();
        api("/api/ad-accounts", { method: "POST", body: {} })
          .then(function (d) { busy = false; meta = d.meta || meta; render(); toast("รีเฟรชรายชื่อแล้ว"); })
          .catch(function (err) { busy = false; render(); toast(err.message); });
        return;
      }
      if (actn === "disconnect") {
        if (!window.confirm("ยกเลิกการเชื่อมบัญชี Meta? token ที่เก็บไว้จะถูกลบ")) return;
        api("/api/connect/meta", { method: "DELETE" }).then(function (d) {
          meta = d.meta || { connected: false, accounts: [] };
          render(); toast("เลิกเชื่อมแล้ว");
        }).catch(function (err) { toast(err.message); });
        return;
      }
    }
    if (el.closest("[data-logout]")) {
      api("/api/logout", { method: "POST" }).then(function () {
        me = null; campaigns = []; leads = []; notifications = []; notifyOpen = false; view = "home";
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
    if ((t = el.closest("[data-leadnew]"))) {
      view = "crm";
      try { sessionStorage.setItem("adeasy_tab", "crm"); } catch (err) {}
      openLeadForm(null, t.getAttribute("data-leadnew") || "");
      return;
    }
    if ((t = el.closest("[data-leadedit]"))) { openLeadForm(t.getAttribute("data-leadedit")); return; }
    if ((t = el.closest("[data-leaddel]"))) {
      var lid = t.getAttribute("data-leaddel");
      var ld = leads.filter(function (x) { return x.id === lid; })[0];
      if (!ld || !window.confirm('ลบลูกค้า "' + ld.name + '" ใช่ไหม?')) return;
      api("/api/leads/" + encodeURIComponent(lid), { method: "DELETE" }).then(function () {
        leads = leads.filter(function (x) { return x.id !== lid; });
        render(); toast("ลบแล้ว");
      }).catch(function (err) { toast(err.message); });
      return;
    }
    if ((t = el.closest("[data-leadfilter]"))) { filterLead = t.getAttribute("data-leadfilter"); render(); return; }
    if ((t = el.closest("[data-inreply]"))) {
      var psid = t.getAttribute("data-inreply");
      var replyTxt = window.prompt("ข้อความตอบกลับ (คนเดียว ไม่บรอดแคสต์)");
      if (!replyTxt) return;
      api("/api/inbox/reply", { method: "POST", body: { senderId: psid, text: replyTxt } }).then(function (d) {
        inbox = d.inbox || inbox; render(); toast("ส่งแล้ว");
      }).catch(function (err) { toast(err.message); });
      return;
    }
    if ((t = el.closest("[data-sendmail]")) || (t = el.closest("[data-sendsms]"))) {
      var isSms = !!el.closest("[data-sendsms]");
      var sid = (el.closest("[data-sendmail]") || el.closest("[data-sendsms]")).getAttribute(isSms ? "data-sendsms" : "data-sendmail");
      var msg2 = window.prompt(isSms ? "ข้อความ SMS" : "ข้อความอีเมล");
      if (!msg2) return;
      api("/api/leads/" + encodeURIComponent(sid) + "/" + (isSms ? "sms" : "email"), { method: "POST", body: { text: msg2 } })
        .then(function () { toast("ส่งจากเซิร์ฟเวอร์แล้ว"); })
        .catch(function (err) { toast(err.message); });
      return;
    }
    if (el.closest("[data-bell]")) { notifyOpen = !notifyOpen; render(); return; }
    if (el.closest("[data-noteread]")) {
      api("/api/notifications", { method: "POST", body: {} }).then(function (d) {
        notifications = d.notifications || []; notifyOpen = true; render();
      });
      return;
    }
    if ((t = el.closest("[data-note]"))) {
      var nid = t.getAttribute("data-note");
      var nlead = t.getAttribute("data-notelead");
      api("/api/notifications", { method: "POST", body: { id: nid } }).then(function (d) {
        notifications = d.notifications || [];
        notifyOpen = false;
        if (nlead) { view = "crm"; try { sessionStorage.setItem("adeasy_tab", "crm"); } catch (err) {} }
        render();
        if (nlead) openLeadForm(nlead);
      });
      return;
    }
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
    if (el.closest("[data-copydaily]")) {
      var d = todayContent();
      var text = d.head + "\n" + d.hook + "\n\n" + d.body;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { toast("คัดลอกคอนเทนต์วันนี้แล้ว"); }).catch(function () { toast("คัดลอกไม่สำเร็จ"); });
      } else toast("คัดลอกไม่สำเร็จ");
      return;
    }
    if ((t = el.closest("[data-copy]"))) {
      var pr = PROMPTS[+t.getAttribute("data-copy")];
      if (!pr) return;
      var done = function () { toast("คัดลอกแล้ว วางใน AI ได้เลย"); };
      var fail = function () { toast("คัดลอกไม่สำเร็จ ลองเลือกข้อความแล้วก๊อปเอง"); };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(pr.p).then(done).catch(fail);
      } else {
        try {
          var ta = document.createElement("textarea");
          ta.value = pr.p; ta.setAttribute("readonly", "");
          ta.style.position = "fixed"; ta.style.opacity = "0";
          document.body.appendChild(ta); ta.select();
          document.execCommand("copy") ? done() : fail();
          document.body.removeChild(ta);
        } catch (err) { fail(); }
      }
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

  try {
    var q = new URLSearchParams(location.search);
    var metaQ = q.get("meta");
    if (metaQ) {
      view = "meta";
      try { sessionStorage.setItem("adeasy_tab", "meta"); } catch (err2) {}
      var msgs = { ok: "เชื่อมบัญชี Meta สำเร็จ", denied: "คุณยกเลิกการอนุญาต", bad_state: "ลิงก์หมดอายุ ลองเชื่อมใหม่", fail: "เชื่อมไม่สำเร็จ ตรวจค่าแอปและโดเมน" };
      if (msgs[metaQ]) setTimeout(function () { toast(msgs[metaQ]); }, 400);
      history.replaceState({}, "", "/");
    }
  } catch (err3) {}

  load();
})();
