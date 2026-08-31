"use strict";

var MAX_AGE_MS = parseInt(process.env.WEBHOOK_MAX_AGE_SEC || "600", 10) * 1000;

function requireHttps(req) {
  var pub = process.env.PUBLIC_BASE_URL || "";
  if (!/^https:\/\//i.test(pub)) return true;
  var proto = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  if (!proto) proto = "http";
  return proto === "https";
}

function freshTimestamp(ts, now) {
  now = now || Date.now();
  if (ts == null || ts === "") return true;
  var n = Number(ts);
  if (!isFinite(n) && typeof ts === "string") n = Date.parse(ts);
  if (!isFinite(n)) return true;
  if (n < 1e12) n *= 1000;
  return Math.abs(now - n) <= MAX_AGE_MS;
}

module.exports = {
  requireHttps: requireHttps,
  freshTimestamp: freshTimestamp,
  MAX_AGE_MS: MAX_AGE_MS
};
