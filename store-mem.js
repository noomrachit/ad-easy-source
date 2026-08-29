/* ที่เก็บข้อมูลในหน่วยความจำ — ใช้ตอนทดสอบเท่านั้น ไม่ได้ใช้ตอนใช้งานจริง */
"use strict";

function makeMemStore() {
  var users = new Map();       // email -> user
  var byId = new Map();        // id -> user
  var sessions = new Map();    // token -> {userId, expires}
  var campaigns = new Map();   // id -> campaign
  var guides = new Map();      // userId -> array
  var seq = 1;

  return {
    async init() {},

    async createUser(email, hash, salt, consent) {
      if (users.has(email)) return null;
      var u = { id: "u" + seq++, email: email, hash: hash, salt: salt, consent: !!consent, createdAt: new Date().toISOString() };
      users.set(email, u); byId.set(u.id, u);
      return { id: u.id, email: u.email };
    },
    async listSubscribers() {
      return Array.from(users.values())
        .filter(function (u) { return u.consent; })
        .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; })
        .map(function (u) { return { email: u.email, createdAt: u.createdAt }; });
    },
    async countUsers() {
      var all = Array.from(users.values());
      return { total: all.length, subs: all.filter(function (u) { return u.consent; }).length };
    },
    async findUserByEmail(email) { return users.get(email) || null; },
    async findUserById(id) {
      var u = byId.get(id);
      return u ? { id: u.id, email: u.email } : null;
    },

    async createSession(userId, token, expires) { sessions.set(token, { userId: userId, expires: expires }); },
    async findSession(token) {
      var s = sessions.get(token);
      if (!s) return null;
      if (new Date(s.expires) < new Date()) { sessions.delete(token); return null; }
      return s;
    },
    async deleteSession(token) { sessions.delete(token); },
    async deleteUserSessions(userId) {
      for (var t of Array.from(sessions.keys())) if (sessions.get(t).userId === userId) sessions.delete(t);
    },

    async listCampaigns(userId) {
      return Array.from(campaigns.values())
        .filter(function (c) { return c.userId === userId; })
        .sort(function (a, b) { return b.sortKey - a.sortKey; })
        .map(function (c) { var o = Object.assign({}, c); delete o.userId; delete o.sortKey; return o; });
    },
    async getCampaign(userId, id) {
      var c = campaigns.get(id);
      return c && c.userId === userId ? c : null;
    },
    async findCampaignByName(userId, name) {
      var lower = name.trim().toLowerCase();
      for (var c of campaigns.values()) {
        if (c.userId === userId && c.name.trim().toLowerCase() === lower) return c;
      }
      return null;
    },
    async insertCampaign(userId, c) {
      var id = "c" + seq++;
      var rec = Object.assign({}, c, { id: id, userId: userId, sortKey: seq });
      campaigns.set(id, rec);
      var o = Object.assign({}, rec); delete o.userId; delete o.sortKey;
      return o;
    },
    async updateCampaign(userId, id, patch) {
      var c = campaigns.get(id);
      if (!c || c.userId !== userId) return null;
      Object.assign(c, patch);
      var o = Object.assign({}, c); delete o.userId; delete o.sortKey;
      return o;
    },
    async deleteCampaign(userId, id) {
      var c = campaigns.get(id);
      if (!c || c.userId !== userId) return false;
      campaigns.delete(id);
      return true;
    },

    async getGuide(userId) { return guides.get(userId) || [false, false, false, false, false]; },
    async setGuide(userId, arr) { guides.set(userId, arr); return arr; }
  };
}

module.exports = { makeMemStore: makeMemStore };
