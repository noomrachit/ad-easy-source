"use strict";

var crypto = require("node:crypto");

function keyBuf() {
  var raw = process.env.TOKEN_SECRET || process.env.META_APP_SECRET || "";
  return crypto.createHash("sha256").update(String(raw || "dev-insecure-change-me")).digest();
}

function encrypt(plain) {
  var iv = crypto.randomBytes(12);
  var c = crypto.createCipheriv("aes-256-gcm", keyBuf(), iv);
  var enc = Buffer.concat([c.update(String(plain), "utf8"), c.final()]);
  var tag = c.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString("base64");
}

function decrypt(packed) {
  var buf = Buffer.from(String(packed), "base64");
  var iv = buf.subarray(0, 12);
  var tag = buf.subarray(12, 28);
  var enc = buf.subarray(28);
  var d = crypto.createDecipheriv("aes-256-gcm", keyBuf(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(enc), d.final()]).toString("utf8");
}

module.exports = { encrypt: encrypt, decrypt: decrypt };
