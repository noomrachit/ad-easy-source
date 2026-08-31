/* Ad Easy — เซิร์ฟเวอร์ (Node built-ins ล้วน + pg สำหรับฐานข้อมูล) */
"use strict";

var http = require("node:http");
var fs = require("node:fs");
var path = require("node:path");
var crypto = require("node:crypto");
var secret = require("./lib/secret");
var metaOAuth = require("./lib/ads/meta-oauth");
var lineHook = require("./lib/line/webhook");
var metaInbox = require("./lib/meta/inbox");
var outbound = require("./lib/outbound");
var morning = require("./lib/content/morning");
var hookProtect = require("./lib/webhook/protect");
var grok = require("./lib/grok/client");

var PORT = process.env.PORT || 3000;
var DB_URL = process.env.DATABASE_URL || "";
var ADMIN_KEY = process.env.ADMIN_KEY || ""; // ไม่ตั้ง = ปิดหน้าดึงรายชื่อไปเลย
var PUBLIC = path.join(__dirname, "public");

var store = DB_URL
  ? require("./store-pg.js").makePgStore(DB_URL)
  : require("./store-mem.js").makeMemStore();

if (!DB_URL) console.warn("[ad-easy] ไม่พบ DATABASE_URL — กำลังใช้ที่เก็บข้อมูลในหน่วยความจำ (ข้อมูลจะหายเมื่อรีสตาร์ท)");

/* ---------------- helpers ---------------- */
var PLATFORMS = ["Facebook", "Instagram", "TikTok"];
var OBJECTIVES = ["เพิ่มยอดขาย", "สร้างการรับรู้", "หาลูกค้าใหม่"];
var STATUSES = ["active", "paused", "ended"];
var LEAD_STATUSES = ["new", "contacted", "qualified", "won", "lost"];
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
function readRaw(req, limit) {
  limit = limit || 1024 * 1024;
  return new Promise(function (resolve, reject) {
    var chunks = [], size = 0;
    req.on("data", function (c) {
      size += c.length;
      if (size > limit) { reject(new Error("payload_too_large")); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", function () { resolve(Buffer.concat(chunks)); });
    req.on("error", reject);
  });
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

function redirect(res, loc) {
  res.writeHead(302, { location: loc, "cache-control": "no-store" });
  res.end();
}

async function publicMetaConnection(userId) {
  var row = await store.getAdConnection(userId, "meta");
  if (!row) return { connected: false, accounts: [], selectedAct: null, name: "" };
  return {
    connected: true,
    name: row.metaUserName || "",
    accounts: row.accounts || [],
    selectedAct: row.selectedAct || null,
    updatedAt: row.updatedAt || null
  };
}

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

async function runCleanup() {
  var r = await store.cleanupExpired();
  r = r || { sessions: 0, oauth: 0, events: 0 };
  var body = "session " + r.sessions + " · oauth " + r.oauth + " · processed " + r.events;
  console.log("[ad-easy] cleanup " + body);
  lineHook.pushAlert("Ad Easy งานลบของเก่า\n" + body).catch(function () {});
  var ownerEmail = str(process.env.LINE_OWNER_EMAIL || process.env.META_OWNER_EMAIL, 190).toLowerCase();
  if (!ownerEmail) return r;
  var owner = await store.findUserByEmail(ownerEmail);
  if (!owner) return r;
  var hourKey = new Date().toISOString().slice(0, 13);
  await store.addNotification(owner.id, {
    type: "cleanup",
    title: "งานลบของเก่าทำงานแล้ว",
    body: body,
    leadId: "",
    dedupeKey: "cleanup:" + hourKey
  });
  return r;
}

setInterval(function () {
  runCleanup().catch(function (e) { console.error("[ad-easy] cleanup", e && e.message); });
}, 60 * 60 * 1000).unref();


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
function shapeLead(b) {
  var plat = String(b.platform || "").trim();
  if (PLATFORMS.indexOf(plat) === -1) plat = "";
  return {
    name: str(b.name, 80),
    phone: str(b.phone, 40),
    email: str(b.email, 190).toLowerCase(),
    platform: plat,
    campaignId: str(b.campaignId, 64),
    status: pickEnum(b.status, LEAD_STATUSES, "new"),
    value: num(b.value),
    note: str(b.note, 500),
    followUpOn: /^\d{4}-\d{2}-\d{2}$/.test(String(b.followUpOn || "")) ? String(b.followUpOn) : ""
  };
}

function plusDays(n) {
  var d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

async function notifyNewLead(userId, lead) {
  await store.addNotification(userId, {
    type: "lead_new",
    title: "ลูกค้าใหม่จากแอด",
    body: lead.name + (lead.platform ? " · " + lead.platform : ""),
    leadId: lead.id,
    dedupeKey: "lead_new:" + lead.id
  });
  lineHook.pushAlert("ลูกค้าใหม่จากแอด: " + lead.name + (lead.platform ? " · " + lead.platform : "")).catch(function () {});
}

async function syncFollowUpNotices(userId) {
  var list = await store.listLeads(userId);
  var today = new Date().toISOString().slice(0, 10);
  for (var i = 0; i < list.length; i++) {
    var L = list[i];
    if (!L.followUpOn || L.status === "won" || L.status === "lost") continue;
    if (L.followUpOn > today) continue;
    var overdue = L.followUpOn < today;
    await store.addNotification(userId, {
      type: overdue ? "follow_overdue" : "follow_due",
      title: overdue ? "เลยกำหนดติดตามลูกค้า" : "ถึงวันติดตามลูกค้า",
      body: L.name + " · นัด " + L.followUpOn,
      leadId: L.id,
      dedupeKey: "follow:" + L.id + ":" + L.followUpOn
    });
  }
}

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
async function handleLineWebhook(req, res) {
  if (!hookProtect.requireHttps(req)) {
    res.writeHead(403).end("https only");
    return;
  }
  var raw = await readRaw(req);
  if (!lineHook.configured()) {
    res.writeHead(503, { "content-type": "text/plain" }).end("line not configured");
    return;
  }
  if (!lineHook.verify(raw, req.headers["x-line-signature"])) {
    res.writeHead(403).end("bad signature");
    return;
  }
  res.writeHead(200).end("ok");
  var payload = {};
  try { payload = JSON.parse(raw.toString("utf8") || "{}"); } catch (e) { return; }
  var ownerEmail = str(process.env.LINE_OWNER_EMAIL, 190).toLowerCase();
  var owner = ownerEmail ? await store.findUserByEmail(ownerEmail) : null;
  var events = payload.events || [];
  for (var i = 0; i < events.length; i++) {
    var ev = events[i];
    var src = ev.source || {};
    var lineUid = src.userId || "";
    if (!lineUid) continue;
    if (!hookProtect.freshTimestamp(ev.timestamp)) continue;
    var evId = ev.webhookEventId || ev.replyToken || "";
    if (evId && !(await store.claimProcessedEvent("line:" + evId, "line"))) continue;
    var isFollow = ev.type === "follow";
    var isText = ev.type === "message" && ev.message && ev.message.type === "text";
    if (!isFollow && !isText) continue;
    var existing = owner ? await store.findLeadByLineUser(owner.id, lineUid) : null;
    var texts = [];
    if (!existing) texts.push(lineHook.welcomeText());
    if (!existing && lineHook.afterHours()) texts.push(lineHook.afterHoursText());
    if (ev.replyToken && texts.length) await lineHook.reply(ev.replyToken, texts.slice(0, 2));
    if (!owner) continue;
    var snippet = isText ? str(ev.message.text, 200) : "เพิ่มเพื่อน LINE OA";
    if (!existing) {
      var lead = await store.insertLead(owner.id, {
        name: "LINE " + lineUid.slice(-6),
        phone: "", email: "", platform: "", campaignId: "",
        status: "new", value: 0, note: snippet,
        followUpOn: plusDays(2), lineUserId: lineUid
      });
      await notifyNewLead(owner.id, lead);
    }
  }
}

async function api(req, res, url) {
  var p = url.pathname;
  var m = req.method;

  if (p === "/api/line/webhook" && m === "POST") {
    return handleLineWebhook(req, res);
  }
  if (p === "/api/line/webhook" && m === "GET") {
    return json(res, 200, { ok: true, configured: lineHook.configured() });
  }

  if (p === "/api/meta/webhook" && m === "GET") {
    var challenge = metaInbox.verifySubscribe(url.searchParams);
    if (challenge == null) { res.writeHead(403).end("verify failed"); return; }
    res.writeHead(200, { "content-type": "text/plain" }).end(challenge);
    return;
  }
  if (p === "/api/meta/webhook" && m === "POST") {
    if (!hookProtect.requireHttps(req)) {
      res.writeHead(403).end("https only");
      return;
    }
    var rawM = await readRaw(req);
    if (!metaInbox.verifySignature(rawM, req.headers["x-hub-signature-256"] || req.headers["x-hub-signature"])) {
      res.writeHead(403).end("bad signature");
      return;
    }
    res.writeHead(200).end("ok");
    var pay = {};
    try { pay = JSON.parse(rawM.toString("utf8") || "{}"); } catch (e) { return; }
    var ownerEm = str(process.env.META_OWNER_EMAIL || process.env.LINE_OWNER_EMAIL, 190).toLowerCase();
    var ownerM = ownerEm ? await store.findUserByEmail(ownerEm) : null;
    if (!ownerM) return;
    var incoming = metaInbox.parseIncoming(pay);
    for (var mi = 0; mi < incoming.length; mi++) {
      var msg = incoming[mi];
      if (!hookProtect.freshTimestamp(msg.createdAt)) continue;
      if (msg.mid && !(await store.claimProcessedEvent("meta:" + msg.mid, "meta"))) continue;
      await store.insertInbox(ownerM.id, { platform: "meta", senderId: msg.senderId, text: msg.text, mid: msg.mid, direction: "in" });
      await store.addNotification(ownerM.id, {
        type: "meta_inbox",
        title: "ข้อความใหม่ในอินบ็อกซ์ Meta",
        body: (msg.text || "").slice(0, 80) || "ข้อความไม่มีตัวอักษร",
        leadId: "",
        dedupeKey: "meta_in:" + (msg.mid || msg.senderId + Date.now())
      });
    }
    return;
  }

  if (p === "/api/content/morning" && m === "GET") {
    if (!ADMIN_KEY) return json(res, 404, { error: "ไม่พบหน้านี้" });
    if (!safeEqual(String(url.searchParams.get("key") || ""), ADMIN_KEY)) return json(res, 404, { error: "ไม่พบหน้านี้" });
    var pack = morning.packFor(new Date());
    pack.source = "calendar";
    if (grok.configured()) {
      try {
        var live = await grok.captionPack(pack.hook || pack.headline || "บาทต่อคลิก");
        pack.grok = live.text;
        pack.source = live.cached ? "grok-cache" : "grok";
      } catch (ge) {
        pack.grokError = String(ge.message || "grok").slice(0, 180);
      }
    }
    return json(res, 200, pack);
  }

  if (p === "/api/hooks/status" && m === "GET") {
    if (!ADMIN_KEY) return json(res, 404, { error: "ไม่พบหน้านี้" });
    if (!safeEqual(String(url.searchParams.get("key") || ""), ADMIN_KEY)) return json(res, 404, { error: "ไม่พบหน้านี้" });
    return json(res, 200, {
      httpsHint: !!(process.env.PUBLIC_BASE_URL && /^https:\/\//i.test(process.env.PUBLIC_BASE_URL)),
      line: lineHook.configured(),
      lineAlert: !!lineHook.alertUserId(),
      metaInbox: metaInbox.configured(),
      metaOauth: metaOAuth.configured(),
      grok: grok.configured(),
      email: outbound.emailConfigured(),
      sms: outbound.smsConfigured()
    });
  }

  if (p === "/api/grok/status" && m === "GET") {
    return json(res, 200, { configured: grok.configured(), model: process.env.XAI_MODEL || "grok-4.6" });
  }
  if (p === "/api/grok/caption" && m === "POST") {
    if (!ADMIN_KEY) return json(res, 404, { error: "ไม่พบหน้านี้" });
    var gk = String(url.searchParams.get("key") || "");
    if (!safeEqual(gk, ADMIN_KEY)) return json(res, 404, { error: "ไม่พบหน้านี้" });
    if (!grok.configured()) return json(res, 400, { error: "ยังไม่ได้ตั้ง XAI_API_KEY" });
    var gb = await readBody(req);
    try {
      var pack = await grok.captionPack(str(gb.topic, 120) || "บาทต่อคลิก");
      return json(res, 200, { text: pack.text, cached: !!pack.cached, model: process.env.XAI_MODEL || "grok-4.6" });
    } catch (ge) {
      return json(res, 400, { error: ge.message || "เรียก Grok ไม่สำเร็จ" });
    }
  }

  if (p === "/api/register" && m === "POST") {
    var b = await readBody(req);
    var email = str(b.email, 190).toLowerCase();
    var pw = String(b.password || "");
    if (!validEmail(email)) return json(res, 400, { error: "อีเมลไม่ถูกต้อง" });
    if (pw.length < 8) return json(res, 400, { error: "รหัสผ่านต้องยาวอย่างน้อย 8 ตัวอักษร" });
    if (pw.length > 200) return json(res, 400, { error: "รหัสผ่านยาวเกินไป" });
    var salt = crypto.randomBytes(16).toString("hex");
    var hash = await hashPassword(pw, salt);
    var u = await store.createUser(email, hash, salt, b.consent === true);
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

  /* ดึงรายชื่ออีเมลคนที่ยินยอมรับข่าวสาร — สำหรับเจ้าของแอปเท่านั้น
     เปิดใช้ได้ต่อเมื่อตั้งตัวแปร ADMIN_KEY ไว้ ถ้าไม่ตั้งจะไม่มีทางนี้อยู่เลย */
  if (p === "/api/subscribers" && m === "GET") {
    if (!ADMIN_KEY) return json(res, 404, { error: "ไม่พบหน้านี้" });
    var given = String(url.searchParams.get("key") || "");
    if (!safeEqual(given, ADMIN_KEY)) return json(res, 404, { error: "ไม่พบหน้านี้" });
    var subs = await store.listSubscribers();
    var counts = await store.countUsers();
    if (url.searchParams.get("format") === "json") {
      return json(res, 200, { total: counts.total, subscribers: counts.subs, list: subs });
    }
    var csv = "email,signed_up_at\n" + subs.map(function (s) {
      return '"' + String(s.email).replace(/"/g, '""') + '","' + new Date(s.createdAt).toISOString() + '"';
    }).join("\n") + "\n";
    res.writeHead(200, {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="adeasy-subscribers.csv"',
      "cache-control": "no-store",
      "x-robots-tag": "noindex"
    });
    return res.end("﻿" + csv);
  }

  if (p === "/api/connect/meta/callback" && m === "GET") {
    var errQ = url.searchParams.get("error_description") || url.searchParams.get("error");
    if (errQ) return redirect(res, "/?meta=denied");
    var state = String(url.searchParams.get("state") || "");
    var code = String(url.searchParams.get("code") || "");
    var st = state ? await store.takeOauthState(state) : null;
    if (!st || st.platform !== "meta" || !code) return redirect(res, "/?meta=bad_state");
    try {
      var tok = await metaOAuth.exchangeCode(req, code);
      var listed = await metaOAuth.listAdAccounts(tok.accessToken);
      var selected = listed.accounts[0] ? listed.accounts[0].id : null;
      await store.upsertAdConnection(st.user_id, "meta", {
        metaUserId: listed.user.id,
        metaUserName: listed.user.name,
        tokenEnc: secret.encrypt(tok.accessToken),
        tokenExpires: tok.expiresAt,
        accounts: listed.accounts,
        selectedAct: selected
      });
      return redirect(res, "/?meta=ok");
    } catch (e) {
      console.error("[ad-easy] meta oauth", e && e.message);
      return redirect(res, "/?meta=fail");
    }
  }

  var me = await currentUser(req);

  if (p === "/api/me" && m === "GET") {
    if (!me) return json(res, 200, { user: null });
    var camps = await store.listCampaigns(me.id);
    var guide = await store.getGuide(me.id);
    var metaConn = await publicMetaConnection(me.id);
    var leadList = await store.listLeads(me.id);
    await syncFollowUpNotices(me.id);
    var noteList = await store.listNotifications(me.id);
    return json(res, 200, {
      user: { email: me.email },
      campaigns: camps,
      leads: leadList,
      notifications: noteList,
      guide: guide,
      meta: metaConn,
      metaConfigured: metaOAuth.configured(),
      inbox: await store.listInbox(me.id),
      inboxConfigured: metaInbox.configured(),
      outbound: { email: outbound.emailConfigured(), sms: outbound.smsConfigured() },
      morning: morning.packFor(new Date()),
      integrations: { pipedrive: false, salesforce: false },
      grokConfigured: grok.configured()
    });
  }

  if (!me) return json(res, 401, { error: "ต้องเข้าสู่ระบบก่อน" });

  if (p === "/api/connect/meta/start" && m === "GET") {
    if (!metaOAuth.configured()) {
      return json(res, 400, { error: "ยังไม่ได้ตั้ง META_APP_ID และ META_APP_SECRET บนเซิร์ฟเวอร์" });
    }
    var state2 = crypto.randomBytes(24).toString("hex");
    await store.saveOauthState(state2, me.id, "meta");
    return json(res, 200, { url: metaOAuth.authUrl(req, state2) });
  }

  if (p === "/api/ad-accounts" && m === "GET") {
    return json(res, 200, { meta: await publicMetaConnection(me.id), metaConfigured: metaOAuth.configured() });
  }

  if (p === "/api/ad-accounts" && m === "PUT") {
    var ab = await readBody(req);
    var act = str(ab.selectedAct, 40);
    if (!act) return json(res, 400, { error: "เลือกบัญชีโฆษณาก่อน" });
    var okSel = await store.setSelectedAdAccount(me.id, "meta", act);
    if (!okSel) return json(res, 404, { error: "ยังไม่ได้เชื่อมบัญชี Meta" });
    return json(res, 200, { meta: await publicMetaConnection(me.id) });
  }

  if (p === "/api/ad-accounts" && m === "POST") {
    var row = await store.getAdConnection(me.id, "meta");
    if (!row || !row.tokenEnc) return json(res, 400, { error: "ยังไม่ได้เชื่อมบัญชี Meta" });
    try {
      var listed2 = await metaOAuth.listAdAccounts(secret.decrypt(row.tokenEnc));
      await store.upsertAdConnection(me.id, "meta", {
        metaUserId: listed2.user.id,
        metaUserName: listed2.user.name,
        tokenEnc: row.tokenEnc,
        tokenExpires: row.tokenExpires,
        accounts: listed2.accounts,
        selectedAct: row.selectedAct || (listed2.accounts[0] && listed2.accounts[0].id) || null
      });
      return json(res, 200, { meta: await publicMetaConnection(me.id) });
    } catch (e2) {
      return json(res, 400, { error: e2.message || "รีเฟรชบัญชีโฆษณาไม่สำเร็จ ลองเชื่อมใหม่" });
    }
  }

  if (p === "/api/connect/meta" && m === "DELETE") {
    await store.deleteAdConnection(me.id, "meta");
    return json(res, 200, { ok: true, meta: { connected: false, accounts: [] } });
  }

  if (p === "/api/notifications" && m === "GET") {
    await syncFollowUpNotices(me.id);
    return json(res, 200, { notifications: await store.listNotifications(me.id) });
  }
  if (p === "/api/notifications" && m === "POST") {
    var nb2 = await readBody(req);
    await store.markNotificationsRead(me.id, str(nb2.id, 64) || null);
    return json(res, 200, { notifications: await store.listNotifications(me.id) });
  }

  if (p === "/api/inbox" && m === "GET") {
    return json(res, 200, { inbox: await store.listInbox(me.id), configured: metaInbox.configured() });
  }
  if (p === "/api/inbox/reply" && m === "POST") {
    var rb = await readBody(req);
    var psid = str(rb.senderId, 64);
    var text = str(rb.text, 2000);
    if (!psid || !text) return json(res, 400, { error: "ใส่ผู้ส่งและข้อความ" });
    if (!metaInbox.configured()) return json(res, 400, { error: "ยังไม่ได้ตั้ง META_PAGE_ACCESS_TOKEN และ META_WEBHOOK_VERIFY_TOKEN" });
    var sent = await metaInbox.sendText(psid, text);
    if (sent && sent.error) return json(res, 400, { error: sent.error.message || "ส่งไม่สำเร็จ" });
    await store.insertInbox(me.id, { platform: "meta", senderId: psid, text: text, mid: "", direction: "out" });
    return json(res, 200, { inbox: await store.listInbox(me.id) });
  }

  if (p === "/api/leads/" && false) {}
  var om = p.match(/^\/api\/leads\/([A-Za-z0-9_-]{1,64})\/(email|sms)$/);
  if (om && m === "POST") {
    var allLeads = await store.listLeads(me.id);
    var target = allLeads.filter(function (x) { return x.id === om[1]; })[0];
    if (!target) return json(res, 404, { error: "ไม่พบลูกค้า" });
    var ob = await readBody(req);
    var bodyTxt = str(ob.text, 1000) || ("สวัสดี " + target.name + " ติดตามจากโฆษณา");
    try {
      if (om[2] === "email") {
        if (!target.email) return json(res, 400, { error: "ลูกค้าคนนี้ยังไม่มีอีเมล" });
        await outbound.sendEmail(target.email, str(ob.subject, 120) || "ข้อความจากร้าน", bodyTxt);
        await store.logOutbound(me.id, { leadId: target.id, channel: "email", to: target.email, body: bodyTxt, status: "sent" });
      } else {
        if (!target.phone) return json(res, 400, { error: "ลูกค้าคนนี้ยังไม่มีเบอร์" });
        await outbound.sendSms(target.phone, bodyTxt);
        await store.logOutbound(me.id, { leadId: target.id, channel: "sms", to: target.phone, body: bodyTxt, status: "sent" });
      }
    } catch (oe) {
      return json(res, 400, { error: oe.message || "ส่งไม่สำเร็จ" });
    }
    return json(res, 200, { ok: true });
  }

  if (p === "/api/leads" && m === "GET") {
    return json(res, 200, { leads: await store.listLeads(me.id) });
  }
  if (p === "/api/leads" && m === "POST") {
    var lb = shapeLead(await readBody(req));
    if (!lb.name) return json(res, 400, { error: "ต้องใส่ชื่อลูกค้า" });
    if (!lb.followUpOn && (lb.status === "new" || lb.status === "contacted")) lb.followUpOn = plusDays(2);
    var createdLead = await store.insertLead(me.id, lb);
    await notifyNewLead(me.id, createdLead);
    return json(res, 200, { lead: createdLead, notifications: await store.listNotifications(me.id) });
  }
  var lm = p.match(/^\/api\/leads\/([A-Za-z0-9_-]{1,64})$/);
  if (lm && m === "PUT") {
    var lp = shapeLead(await readBody(req));
    if (!lp.name) return json(res, 400, { error: "ต้องใส่ชื่อลูกค้า" });
    var lu = await store.updateLead(me.id, lm[1], lp);
    if (!lu) return json(res, 404, { error: "ไม่พบรายการนี้" });
    await syncFollowUpNotices(me.id);
    return json(res, 200, { lead: lu, notifications: await store.listNotifications(me.id) });
  }
  if (lm && m === "DELETE") {
    var okL = await store.deleteLead(me.id, lm[1]);
    return json(res, okL ? 200 : 404, okL ? { ok: true } : { error: "ไม่พบรายการนี้" });
  }

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
  server.listen(PORT, function () {
    console.log("[ad-easy] พร้อมใช้งานที่พอร์ต " + PORT);
    runCleanup().catch(function (e) { console.error("[ad-easy] cleanup", e && e.message); });
  });
}).catch(function (e) {
  console.error("[ad-easy] เริ่มระบบไม่สำเร็จ:", e);
  process.exit(1);
});

module.exports = server;
