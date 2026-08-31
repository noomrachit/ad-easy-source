"use strict";

var GRAPH = "https://graph.facebook.com/v22.0";
var DIALOG = "https://www.facebook.com/v22.0/dialog/oauth";
var SCOPES = "ads_management,ads_read,business_management,public_profile,pages_show_list,pages_messaging";

function configured() {
  return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
}

function publicBase(req) {
  var fromEnv = (process.env.PUBLIC_BASE_URL || "").replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  var proto = (req.headers["x-forwarded-proto"] || "http").split(",")[0].trim();
  var host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return proto + "://" + host;
}

function callbackUrl(req) {
  return publicBase(req) + "/api/connect/meta/callback";
}

function authUrl(req, state) {
  var q = new URLSearchParams({
    client_id: process.env.META_APP_ID || "",
    redirect_uri: callbackUrl(req),
    state: state,
    scope: SCOPES,
    response_type: "code"
  });
  return DIALOG + "?" + q.toString();
}

function graphGet(path, token, params) {
  var u = new URL(GRAPH + path);
  if (params) Object.keys(params).forEach(function (k) { u.searchParams.set(k, params[k]); });
  u.searchParams.set("access_token", token);
  return fetch(u).then(function (r) {
    return r.json().then(function (j) {
      if (j.error) {
        var e = new Error(j.error.message || "meta_error");
        e.meta = j.error;
        throw e;
      }
      return j;
    });
  });
}

function graphPostForm(path, fields) {
  var body = new URLSearchParams(fields);
  return fetch(GRAPH + path, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: body
  }).then(function (r) { return r.json(); });
}

async function exchangeCode(req, code) {
  var shortTok = await graphPostForm("/oauth/access_token", {
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    redirect_uri: callbackUrl(req),
    code: code
  });
  if (shortTok.error || !shortTok.access_token) {
    throw new Error((shortTok.error && shortTok.error.message) || "\u0e41\u0e25\u0e01\u0e42\u0e04\u0e49\u0e14\u0e44\u0e21\u0e48\u0e2a\u0e33\u0e40\u0e23\u0e47\u0e08");
  }
  var longTok = await graphPostForm("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: process.env.META_APP_ID,
    client_secret: process.env.META_APP_SECRET,
    fb_exchange_token: shortTok.access_token
  });
  var token = (longTok && longTok.access_token) || shortTok.access_token;
  var expiresIn = Number((longTok && longTok.expires_in) || shortTok.expires_in || 60 * 24 * 3600);
  return { accessToken: token, expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString() };
}

async function listAdAccounts(token) {
  var j = await graphGet("/me/adaccounts", token, {
    fields: "id,name,account_id,account_status,currency,timezone_name",
    limit: "50"
  });
  var me = await graphGet("/me", token, { fields: "id,name" }).catch(function () { return {}; });
  var list = (j.data || []).map(function (a) {
    return {
      id: a.id,
      accountId: a.account_id || String(a.id || "").replace(/^act_/, ""),
      name: a.name || a.id,
      status: a.account_status,
      currency: a.currency || "",
      timezone: a.timezone_name || ""
    };
  });
  return { user: { id: me.id || "", name: me.name || "" }, accounts: list };
}

module.exports = {
  configured: configured,
  authUrl: authUrl,
  callbackUrl: callbackUrl,
  exchangeCode: exchangeCode,
  listAdAccounts: listAdAccounts
};
