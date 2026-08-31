"use strict";

var crypto = require("node:crypto");
var GRAPH = "https://graph.facebook.com/v22.0";

function pageToken() {
  return process.env.META_PAGE_ACCESS_TOKEN || "";
}
function verifyToken() {
  return process.env.META_WEBHOOK_VERIFY_TOKEN || "";
}
function configured() {
  return !!(process.env.META_APP_SECRET && pageToken() && verifyToken());
}

function verifySubscribe(query) {
  if (String(query.get("hub.mode") || "") !== "subscribe") return null;
  if (String(query.get("hub.verify_token") || "") !== verifyToken()) return null;
  return String(query.get("hub.challenge") || "");
}

function verifySignature(raw, header) {
  var secret = process.env.META_APP_SECRET || "";
  if (!secret || !header) return false;
  var got = String(header).replace(/^sha256=/, "");
  var expect = crypto.createHmac("sha256", secret).update(raw).digest("hex");
  var a = Buffer.from(expect, "hex");
  var b = Buffer.from(got, "hex");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function parseIncoming(payload) {
  var out = [];
  var entries = (payload && payload.entry) || [];
  entries.forEach(function (en) {
    (en.messaging || []).forEach(function (m) {
      if (!m.message || m.message.is_echo) return;
      out.push({
        pageId: en.id || "",
        senderId: (m.sender && m.sender.id) || "",
        text: (m.message && m.message.text) || "",
        mid: (m.message && m.message.mid) || "",
        createdAt: m.timestamp ? new Date(m.timestamp).toISOString() : new Date().toISOString()
      });
    });
  });
  return out;
}

function sendText(psid, text) {
  if (!pageToken() || !psid || !text) return Promise.resolve({ ok: false });
  var body = JSON.stringify({
    recipient: { id: psid },
    messaging_type: "RESPONSE",
    message: { text: String(text).slice(0, 2000) }
  });
  return fetch(GRAPH + "/me/messages?access_token=" + encodeURIComponent(pageToken()), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body
  }).then(function (r) { return r.json(); });
}

module.exports = {
  configured: configured,
  verifySubscribe: verifySubscribe,
  verifySignature: verifySignature,
  parseIncoming: parseIncoming,
  sendText: sendText
};
