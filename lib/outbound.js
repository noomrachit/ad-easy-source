"use strict";

var net = require("node:net");
var tls = require("node:tls");

function emailConfigured() {
  return !!(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM);
}
function smsConfigured() {
  return !!(process.env.SMS_API_URL && process.env.SMS_API_KEY);
}

function sendEmail(to, subject, text) {
  if (!emailConfigured()) return Promise.reject(new Error("SMTP not configured"));
  return Promise.reject(new Error("SMTP send requires deployed SMTP_* vars"));
}
function sendSms(to, text) {
  if (!smsConfigured()) return Promise.reject(new Error("SMS not configured"));
  var url = process.env.SMS_API_URL;
  var body = JSON.stringify({ to: String(to), text: String(text || "").slice(0, 160), from: process.env.SMS_FROM || "AdEasy" });
  return fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + process.env.SMS_API_KEY },
    body: body
  }).then(function (r) {
    if (!r.ok) return r.text().then(function (t) { throw new Error("sms " + r.status); });
    return { ok: true };
  });
}

module.exports = {
  emailConfigured: emailConfigured,
  smsConfigured: smsConfigured,
  sendEmail: sendEmail,
  sendSms: sendSms
};
