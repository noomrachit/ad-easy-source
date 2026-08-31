"use strict";

var crypto = require("node:crypto");
var https = require("node:https");

var SECRET = process.env.LINE_CHANNEL_SECRET || "";
var TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || "";
var OFF_START = parseInt(process.env.LINE_OFF_START || "22", 10);
var OFF_END = parseInt(process.env.LINE_OFF_END || "8", 10);

function configured() {
  return !!(SECRET && TOKEN);
}

function verify(raw, header) {
  if (!SECRET || !header) return false;
  var expected = crypto.createHmac("sha256", SECRET).update(raw).digest("base64");
  var a = Buffer.from(expected);
  var b = Buffer.from(String(header));
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function afterHours(now) {
  now = now || new Date();
  var parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok", hour: "2-digit", hour12: false
  }).formatToParts(now);
  var hour = parseInt((parts.filter(function (p) { return p.type === "hour"; })[0] || {}).value || "12", 10);
  if (OFF_START === OFF_END) return false;
  if (OFF_START > OFF_END) return hour >= OFF_START || hour < OFF_END;
  return hour >= OFF_START && hour < OFF_END;
}

function welcomeText() {
  return "\u0e2a\u0e27\u0e31\u0e2a\u0e14\u0e35\u0e04\u0e48\u0e30 \u0e23\u0e31\u0e1a\u0e02\u0e49\u0e2d\u0e04\u0e27\u0e32\u0e21\u0e08\u0e32\u0e01\u0e42\u0e06\u0e29\u0e13\u0e32\u0e44\u0e27\u0e49\u0e41\u0e25\u0e49\u0e27\n\u0e2a\u0e19\u0e43\u0e08\u0e40\u0e23\u0e37\u0e48\u0e2d\u0e07\u0e44\u0e2b\u0e19\u0e40\u0e1b\u0e47\u0e19\u0e1e\u0e34\u0e40\u0e28\u0e29 \u0e1a\u0e2d\u0e01\u0e44\u0e14\u0e49\u0e40\u0e25\u0e22\u0e04\u0e48\u0e30";
}

function afterHoursText() {
  return "\u0e15\u0e2d\u0e19\u0e19\u0e35\u0e49\u0e19\u0e2d\u0e01\u0e40\u0e27\u0e25\u0e32\u0e17\u0e33\u0e01\u0e32\u0e23 \u0e08\u0e30\u0e15\u0e2d\u0e1a\u0e0a\u0e48\u0e27\u0e07 08:00\u201322:00 \u0e19. \u0e15\u0e32\u0e21\u0e40\u0e27\u0e25\u0e32\u0e44\u0e17\u0e22";
}

function reply(replyToken, texts) {
  if (!TOKEN || !replyToken || !texts || !texts.length) return Promise.resolve();
  var body = JSON.stringify({
    replyToken: replyToken,
    messages: texts.map(function (t) { return { type: "text", text: t }; })
  });
  return new Promise(function (resolve) {
    var req = https.request({
      hostname: "api.line.me",
      path: "/v2/bot/message/reply",
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": Buffer.byteLength(body),
        authorization: "Bearer " + TOKEN
      }
    }, function (res) {
      res.resume();
      resolve(res.statusCode);
    });
    req.on("error", function () { resolve(0); });
    req.end(body);
  });
}

module.exports = {
  configured: configured,
  verify: verify,
  afterHours: afterHours,
  welcomeText: welcomeText,
  afterHoursText: afterHoursText,
  reply: reply
};
