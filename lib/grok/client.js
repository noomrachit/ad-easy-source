"use strict";

var BASE = (process.env.XAI_API_BASE || "https://api.x.ai/v1").replace(/\/$/, "");
var MODEL = process.env.XAI_MODEL || "grok-4.6";
var TIMEOUT_MS = parseInt(process.env.XAI_TIMEOUT_MS || "20000", 10);
var MAX_TOKENS = parseInt(process.env.XAI_MAX_TOKENS || "400", 10);
var CACHE_MS = parseInt(process.env.XAI_CACHE_MS || "900000", 10);

var cache = new Map();
var inflight = new Map();

function configured() {
  return !!process.env.XAI_API_KEY;
}

function extractText(j) {
  if (j && typeof j.output_text === "string" && j.output_text.trim()) return j.output_text.trim();
  var bits = [];
  ((j && j.output) || []).forEach(function (item) {
    ((item && item.content) || []).forEach(function (c) {
      if (c && (c.type === "output_text" || c.type === "text") && c.text) bits.push(c.text);
    });
  });
  if (bits.length) return bits.join("\n").trim();
  var choice = j && j.choices && j.choices[0] && j.choices[0].message && j.choices[0].message.content;
  return String(choice || "").trim();
}

function respond(input, opts) {
  opts = opts || {};
  if (!configured()) return Promise.reject(new Error("ยังไม่ได้ตั้ง XAI_API_KEY"));
  var ac = new AbortController();
  var timer = setTimeout(function () { ac.abort(); }, TIMEOUT_MS);
  return fetch(BASE + "/responses", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: "Bearer " + process.env.XAI_API_KEY
    },
    body: JSON.stringify({
      model: opts.model || MODEL,
      input: input,
      max_output_tokens: opts.max_tokens || MAX_TOKENS
    }),
    signal: ac.signal
  }).then(function (r) {
    return r.text().then(function (txt) {
      var j = {};
      try { j = txt ? JSON.parse(txt) : {}; } catch (e) { j = {}; }
      if (!r.ok) throw new Error(String((j.error && (j.error.message || j.error)) || ("xai " + r.status)).slice(0, 180));
      return { text: extractText(j) };
    });
  }).finally(function () { clearTimeout(timer); }).catch(function (e) {
    if (e && e.name === "AbortError") throw new Error("Grok หมดเวลา");
    throw e;
  });
}

function captionPack(topic) {
  topic = String(topic || "บาทต่อคลิก").trim().slice(0, 80);
  var key = "cap:" + topic;
  if (cache.has(key) && Date.now() - cache.get(key).at < CACHE_MS) {
    return Promise.resolve({ text: cache.get(key).value, cached: true });
  }
  if (inflight.has(key)) return inflight.get(key);
  var job = respond([
    { role: "system", content: "เขียนแคปชันภาษาไทยสั้น มีตัวเลขหรือขั้นตอน ห้ามอันดับ 1 แอปปไม่ยิงแทน" },
    { role: "user", content: topic }
  ]).then(function (r) {
    cache.set(key, { at: Date.now(), value: r.text });
    return { text: r.text, cached: false };
  }).finally(function () { inflight.delete(key); });
  inflight.set(key, job);
  return job;
}

module.exports = { configured: configured, respond: respond, captionPack: captionPack, chat: function (m, o) { return respond(m, o); } };
