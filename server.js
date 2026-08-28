/* Ad Easy — เซิร์ฟเวอร์ (Node built-ins ล้วน + pg สำหรับฐานข้อมูล) */
"use strict";

var http = require("node:http");
var fs = require("node:fs");
var path = require("node:path");
var crypto = require("node:crypto");

var PORT = process.env.PORT || 3000;
var DB_URL = process.env.DATABASE_URL || "";
var PUBLIC = path.join(__dirname, "public");

var store = DB_URL
  ? require("./store-pg.js").makePgStore(DB_URL)
  : require("./store-mem.js").makeMemStore();

if (!DB_URL) console.warn("[ad-easy] ไม่พบ DATABASE_URL — กำลังใช้ที่เก็บข้อมูลในหน่วยความจำ (ข้อมูลจะหายเมื่อรีสตาร์ท)");

/* ---------------- helpers ---------------- */
var PLATFORMS = ["Facebook", "Instagram", "TikTok"];
var OBJECTIVES = ["เพิ่มยอดขาย", "สร้างการรับรู้", "หาลูกค้าใหม่"];
var STATUSES = ["active", "paused", "ended"];
var SESSION_DAYS = 30;

function json(res, code, obj) {
  var body = JSON.stringify(obj);
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "content-length": Buffer.byteLength(body),
    "cache-control": "no-store"
  });
  res.end(body);
}
function readBody(req, limit) {
  limit = limit || 2 * 1024 * 1024;
  return new Promise(function (resolve, reject) {
    var chunks = [], size = 0;
    req.on("data", function (c) {
      size += c.length;
      if (size > limit) { reject(new Error("payload_too_large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", function () {
      var s = Buffer.concat(chunks).toString("utf8");
      if (!s) return resolve({});
      try { resolve(JSON.parse(s)); } catch (e) { reject(new Error("bad_json")); }
    });
    req.on("error", reject);
  });
}
function hashPassword(pw, salt) {
  return new Promise(function (resolve, reject) {
    crypto.scrypt(pw, salt, 64, { N: 16384, r: 8, p: 1 }, function (err, dk) {
      if (err) reject(err); else resolve(dk.toString("hex"));
    });
  });
}
function safeEqual(a, b) {
  var ba = Buffer.from(String(a)), bb = Buffer.from(String(b));
  if (ba.length !== bb.length) return false;
  return crypto.timingSafeEqual(ba, bb);
}
function parseCookies(req) {
  var out = {}, h = req.headers.cookie;
  if (!h) return out;
  h.split(";").forEach(function (p) {
    var i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function isSecure(req) {
  return (req.headers["x-forwarded-proto"] || "").split(",")[0].trim() === "https";
}
function setSessionCookie(req, res, token, maxAgeSec) {
  var bits = [
    "sid=" + token, "Path=/", "HttpOnly", "SameSite=Lax",
    "Max-Age=" + maxAgeSec
  ];
  if (isSecure(req)) bits.push("Secure");
  res.setHeader("set-cookie", bits.join("; "));
}
function num(v) {
  if (v == null || v === "") return 0;
  var n = typeof v === "number" ? v : parseFloat(String(v).replace(/[^0-9.\-]/g, ""));
  if (!isFinite(n) || n < 0) return 0;
  return Math.min(n, 1e12);
}
function str(v, max) { return String(v == null ? "" : v).trim().slice(0, max || 200); }
function pickEnum(v, list, dflt) { return list.indexOf(v) !== -1 ? v : dflt; }
function validEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e) && e.length <= 190; }

/* ---------------- rate limiting (in-process) ---------------- */
var attempts = new Map();
function tooManyAttempts(key) {
  var now = Date.now();
  var a = attempts.get(key);
  if (!a || now - a.first > 15 * 60 * 1000) { attempts.set(key, { first: now, n: 1 }); return false; }
  a.n++;
  return a.n > 10;
}
function clearAttempts(key) { attempts.delete(key); }
setInterval(function () {
  var now = Date.now();
  for (var k of Array.from(attempts.keys())) {
    if (now - attempts.get(k).first > 15 * 60 * 1000) attempts.delete(k);
  }
}, 5 * 60 * 1000).unref();

/* ---------------- static ---------------- */
var TYPES = {
  ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8", ".svg": "image/svg+xml",
  ".ico": "image/x-icon", ".json": "application/json; charset=utf-8"
};
function serveStatic(req, res, urlPath) {
  var rel = urlPath === "/" ? "/index.html" : urlPath;
  var full = path.join(PUBLIC, path.normalize(rel).replace(/^(\.\.[/\\])+/, ""));
  if (full.indexOf(PUBLIC) !== 0) { res.writeHead(403).end("forbidden"); return; }
  fs.readFile(full, function (err, buf) {
    if (err) {
      // ให้ทุกเส้นทางที่ไม่ใช่ไฟล์ตกไปที่หน้าแอป
      fs.readFile(path.join(PUBLIC, "index.html"), function (e2, idx) {
        if (e2) { res.writeHead(404).end("not found"); return; }
        res.writeHead(200, { "content-type": TYPES[".html"] });
        res.end(idx);
      });
      return;
    }
    var ext = path.extname(full).toLowerCase();
    res.writeHead(200, {
      "content-type": TYPES[ext] || "application/octet-stream",
      "cache-control": ext === ".html" ? "no-store" : "public, max-age=300"
    });
    res.end(buf);
  });
}

/* ---------------- auth ---------------- */
async function currentUser(req) {
  var token = parseCookies(req).sid;
  if (!token) return null;
  var s = await store.findSession(token);
  if (!s) return null;
  var u = await store.findUserById(s.userId);
  return u ? { id: u.id, email: u.email, token: token } : null;
}

/* ---------------- campaign shaping ---------------- */
function shapeCampaign(b) {
  return {
    name: str(b.name, 120),
    platform: pickEnum(b.platform, PLATFORMS, "Facebook"),
    objective: pickEnum(b.objective, OBJECTIVES, OBJECTIVES[0]),
    status: pickEnum(b.status, STATUSES, "active"),
    budgetPerDay: num(b.budgetPerDay), spent: num(b.spent),
    reach: num(b.reach), clicks: num(b.clicks),
    audience: str(b.audience, 140), duration: num(b.duration),
    createdAt: /^\d{4}-\d{2}-\d{2}$/.test(b.createdAt) ? b.createdAt : new Date().toISOString().slice(0, 10)
  };
}

/* ---------------- routes ---------------- */
async function api(req, res, url) {
  var p = url.pathname;
  var m = req.method;

  if (p === "/api/register" && m === "POST") {
    var b = await readBody(req);
    var email = str(b.email, 190).toLowerCase();
    var pw = String(b.password || "");
    if (!validEmail(email)) return json(res, 400, { error: "อีเมลไม่ถูกต้อง" });
    if (pw.length < 8) return json(res, 400, { error: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร" });
    if (pw.length > 200) return json(res, 400, { error: "รหัสผ่านยาวเกินไป" });
    var salt = crypto.randomBytes(16).toString("hex");
    var hash = await hashPassword(pw, salt);
    var u = await store.createUser(email, hash, salt);
    if (!u) return json(res, 409, { error: "อีเมลนี้มีคนใช้แล้ว" });
    var tok = crypto.randomBytes(32).toString("hex");
    var exp = new Date(Date.now() + SESSION_DAYS * 864e5).toISOString();
    await store.createSession(u.id, tok, exp);
    setSessionCookie(req, res, tok, SESSION_DAYS * 86400);
    return json(res, 200, { user: { email: u.email } });
  }

  if (p === "/api/login" && m === "POST") {
    var b2 = await readBody(req);
    var em = str(b2.email, 190).toLowerCase();
    var pw2 = String(b2.password || "");
    var key = (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "?") + "|" + em;
    if (tooManyAttempts(key)) return json(res, 429, { error: "ลองเข้าสู่ระบบผิดหลายครั้งเกินไป รอ 15 นาทีแล้วลองใหม่" });
    var u2 = await store.findUserByEmail(em);
    if (!u2) return json(res, 401, { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    var h = await hashPassword(pw2, u2.salt);
    if (!safeEqual(h, u2.hash)) return json(res, 401, { error: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    clearAttempts(key);
    var tok2 = crypto.randomBytes(32).toString("hex");
    await store.createSession(u2.id, tok2, new Date(Date.now() + SESSION_DAYS * 864e5).toISOString());
    setSessionCookie(req, res, tok2, SESSION_DAYS * 86400);
    return json(res, 200, { user: { email: u2.email } });
  }

  if (p === "/api/logout" && m === "POST") {
    var c = parseCookies(req).sid;
    if (c) await store.deleteSession(c);
    setSessionCookie(req, res, "", 0);
    return json(res, 200, { ok: true });
  }

  var me = await currentUser(req);

  if (p === "/api/me" && m === "GET") {
    if (!me) return json(res, 200, { user: null });
    var camps = await store.listCampaigns(me.id);
    var guide = await store.getGuide(me.id);
    return json(res, 200, { user: { email: me.email }, campaigns: camps, guide: guide });
  }

  if (!me) return json(res, 401, { error: "ต้องเข้าสู่ระบบก่อน" });

  if (p === "/api/campaigns" && m === "GET") {
    return json(res, 200, { campaigns: await store.listCampaigns(me.id) });
  }
  if (p === "/api/campaigns" && m === "POST") {
    var nb = shapeCampaign(await readBody(req));
    if (!nb.name) return json(res, 400, { error: "ต้องใส่ชื่อแคมเปญ" });
    return json(res, 200, { campaign: await store.insertCampaign(me.id, nb) });
  }
  var mm = p.match(/^\/api\/campaigns\/([A-Za-z0-9_-]{1,64})$/);
  if (mm && m === "PUT") {
    var pb = await readBody(req);
    var patch = shapeCampaign(pb);
    if (!patch.name) return json(res, 400, { error: "ต้องใส่ชื่อแคมเปญ" });
    var up = await store.updateCampaign(me.id, mm[1], patch);
    if (!up) return json(res, 404, { error: "ไม่พบแคมเปญนี้" });
    return json(res, 200, { campaign: up });
  }
  if (mm && m === "DELETE") {
    var okDel = await store.deleteCampaign(me.id, mm[1]);
    return json(res, okDel ? 200 : 404, okDel ? { ok: true } : { error: "ไม่พบแคมเปญนี้" });
  }

  if (p === "/api/guide" && m === "PUT") {
    var gb = await readBody(req);
    var arr = Array.isArray(gb.guide) ? gb.guide.slice(0, 20).map(Boolean) : [];
    while (arr.length < 5) arr.push(false);
    return json(res, 200, { guide: await store.setGuide(me.id, arr) });
  }

  if (p === "/api/import" && m === "POST") {
    var ib = await readBody(req, 4 * 1024 * 1024);
    var rows = Array.isArray(ib.rows) ? ib.rows.slice(0, 5000) : [];
    var dup = pickEnum(ib.dup, ["update", "new", "skip"], "update");
    var plat = pickEnum(ib.platform, PLATFORMS, "Facebook");
    var rep = { created: 0, updated: 0, skipped: 0, problems: [] };

    for (var i = 0; i < rows.length; i++) {
      var r = rows[i] || {};
      var name = str(r.name, 120);
      if (!name) { rep.skipped++; if (rep.problems.length < 40) rep.problems.push("แถวที่ " + (i + 2) + " ไม่มีชื่อแคมเปญ"); continue; }
      if (/^(total|รวม|grand total|ทั้งหมด)\b/i.test(name)) {
        rep.skipped++; if (rep.problems.length < 40) rep.problems.push("แถวที่ " + (i + 2) + " เป็นแถวสรุปยอดรวม ไม่ใช่แคมเปญ");
        continue;
      }
      var existing = await store.findCampaignByName(me.id, name);
      if (existing && dup === "skip") { rep.skipped++; continue; }
      if (existing && dup === "update") {
        var patch2 = {};
        ["spent", "reach", "clicks", "budgetPerDay"].forEach(function (k) {
          if (r[k] != null && r[k] !== "") patch2[k] = num(r[k]);
        });
        if (r.status && STATUSES.indexOf(r.status) !== -1) patch2.status = r.status;
        if (r.objective && OBJECTIVES.indexOf(r.objective) !== -1) patch2.objective = r.objective;
        await store.updateCampaign(me.id, existing.id, patch2);
        rep.updated++;
        continue;
      }
      await store.insertCampaign(me.id, shapeCampaign({
        name: name, platform: plat,
        objective: r.objective, status: r.status,
        budgetPerDay: r.budgetPerDay, spent: r.spent, reach: r.reach, clicks: r.clicks
      }));
      rep.created++;
    }
    return json(res, 200, { report: rep, campaigns: await store.listCampaigns(me.id) });
  }

  return json(res, 404, { error: "ไม่พบปลายทางนี้" });
}

/* ---------------- server ---------------- */
var server = http.createServer(function (req, res) {
  var url;
  try { url = new URL(req.url, "http://x"); } catch (e) { res.writeHead(400).end("bad request"); return; }

  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "same-origin");
  res.setHeader("x-frame-options", "SAMEORIGIN");

  if (url.pathname === "/healthz") { res.writeHead(200).end("ok"); return; }

  if (url.pathname.indexOf("/api/") === 0) {
    api(req, res, url).catch(function (err) {
      var msg = err && err.message;
      if (msg === "payload_too_large") return json(res, 413, { error: "ไฟล์หรือข้อมูลใหญ่เกินไป" });
      if (msg === "bad_json") return json(res, 400, { error: "รูปแบบข้อมูลไม่ถูกต้อง" });
      console.error("[ad-easy]", err);
      if (!res.headersSent) json(res, 500, { error: "เซิร์ฟเวอร์มีปัญหา ลองใหม่อีกครั้ง" });
    });
    return;
  }
  if (req.method !== "GET" && req.method !== "HEAD") { res.writeHead(405).end("method not allowed"); return; }
  serveStatic(req, res, url.pathname);
});

store.init().then(function () {
  server.listen(PORT, function () { console.log("[ad-easy] พร้อมใช้งานที่พอร์ต " + PORT); });
}).catch(function (e) {
  console.error("[ad-easy] เริ่มระบบไม่สำเร็จ:", e);
  process.exit(1);
});

module.exports = server;
