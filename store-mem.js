/* ที่เก็บข้อมูลในหน่วยความจำ — ใช้ตอนทดสอบเท่านั้น ไม่ได้ใช้ตอนใช้งานจริง */
"use strict";

function makeMemStore() {
  var users = new Map();       // email -> user
  var byId = new Map();        // id -> user
  var sessions = new Map();    // token -> {userId, expires}
  var campaigns = new Map();   // id -> campaign
  var guides = new Map();      // userId -> array
  var oauthStates = new Map();
  var adConnections = new Map();
  var leads = new Map();
  var notes = new Map();
  var inbox = [];
  var processed = new Map();
  var seq = 1;

  return {
    async init() {},
    async cleanupExpired() {
      var now = Date.now();
      var sessionsN = 0, eventsN = 0;
      for (var tkn of Array.from(sessions.keys())) {
        if (new Date(sessions.get(tkn).expires) < new Date()) { sessions.delete(tkn); sessionsN++; }
      }
      for (var id of Array.from(processed.keys())) {
        if (now - processed.get(id).seen > 7 * 864e5) { processed.delete(id); eventsN++; }
      }
      return { sessions: sessionsN, oauth: 0, events: eventsN };
    },

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
    async setGuide(userId, arr) { guides.set(userId, arr); return arr; },

    async saveOauthState(state, userId, platform) {
      oauthStates.set(state, { userId: userId, platform: platform, created: Date.now() });
    },
    async takeOauthState(state) {
      var s = oauthStates.get(state);
      oauthStates.delete(state);
      if (!s || Date.now() - s.created > 20 * 60 * 1000) return null;
      return { user_id: s.userId, platform: s.platform };
    },
    async upsertAdConnection(userId, platform, row) {
      adConnections.set(userId + "|" + platform, Object.assign({}, row));
    },
    async getAdConnection(userId, platform) {
      return adConnections.get(userId + "|" + platform) || null;
    },
    async setSelectedAdAccount(userId, platform, actId) {
      var row = adConnections.get(userId + "|" + platform);
      if (!row) return false;
      row.selectedAct = actId;
      return true;
    },
    async deleteAdConnection(userId, platform) {
      return adConnections.delete(userId + "|" + platform);
    },

    async findLeadByLineUser(userId, lineUserId) {
      if (!lineUserId) return null;
      var found = Array.from(leads.values()).filter(function (x) {
        return x.userId === userId && x.lineUserId === lineUserId;
      })[0];
      if (!found) return null;
      var o = Object.assign({}, found); delete o.userId; delete o.sortKey;
      return o;
    },
    async listLeads(userId) {
      return Array.from(leads.values())
        .filter(function (x) { return x.userId === userId; })
        .sort(function (a, b) { return (b.sortKey || 0) - (a.sortKey || 0); })
        .map(function (x) {
          return {
            id: x.id, name: x.name, phone: x.phone, email: x.email, platform: x.platform,
            campaignId: x.campaignId || "", status: x.status, value: x.value || 0, note: x.note || "", followUpOn: x.followUpOn || "", lineUserId: x.lineUserId || "", createdAt: x.createdAt
          };
        });
    },
    async insertLead(userId, L) {
      var id = "l" + seq++;
      var rec = {
        id: id, userId: userId, name: L.name, phone: L.phone || "", email: L.email || "",
        platform: L.platform || "", campaignId: L.campaignId || "", status: L.status || "new",
        value: L.value || 0, note: L.note || "", followUpOn: L.followUpOn || "", lineUserId: L.lineUserId || "", createdAt: new Date().toISOString(), sortKey: seq
      };
      leads.set(id, rec);
      var o = Object.assign({}, rec); delete o.userId; delete o.sortKey;
      return o;
    },
    async updateLead(userId, id, L) {
      var x = leads.get(id);
      if (!x || x.userId !== userId) return null;
      if (L.name != null) x.name = L.name;
      if (L.phone != null) x.phone = L.phone;
      if (L.email != null) x.email = L.email;
      if (L.platform != null) x.platform = L.platform;
      if (L.campaignId !== undefined) x.campaignId = L.campaignId || "";
      if (L.status != null) x.status = L.status;
      if (L.value != null) x.value = L.value;
      if (L.note != null) x.note = L.note;
      if (L.followUpOn != null) x.followUpOn = L.followUpOn;
      var o = Object.assign({}, x); delete o.userId; delete o.sortKey;
      return o;
    },
    async deleteLead(userId, id) {
      var x = leads.get(id);
      if (!x || x.userId !== userId) return false;
      leads.delete(id);
      return true;
    },
    async addNotification(userId, n) {
      var key = userId + "|" + n.dedupeKey;
      if (notes.has(key)) return false;
      var id = "n" + seq++;
      notes.set(key, {
        id: id, userId: userId, type: n.type, title: n.title, body: n.body || "",
        leadId: n.leadId || "", dedupeKey: n.dedupeKey, read: false, createdAt: new Date().toISOString()
      });
      return true;
    },
    async listNotifications(userId) {
      return Array.from(notes.values())
        .filter(function (x) { return x.userId === userId; })
        .sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; })
        .slice(0, 50)
        .map(function (x) {
          return { id: x.id, type: x.type, title: x.title, body: x.body, leadId: x.leadId || "", read: !!x.read, createdAt: x.createdAt };
        });
    },
    async markNotificationsRead(userId, id) {
      Array.from(notes.values()).forEach(function (x) {
        if (x.userId !== userId) return;
        if (!id || x.id === id) x.read = true;
      });
    },
    async insertInbox(userId, row) {
      var rec = {
        id: "m" + seq++, userId: userId, platform: row.platform || "meta",
        senderId: row.senderId || "", text: row.text || "", mid: row.mid || "",
        direction: row.direction || "in", createdAt: new Date().toISOString()
      };
      inbox.unshift(rec);
      return { id: rec.id, platform: rec.platform, senderId: rec.senderId, text: rec.text, mid: rec.mid, direction: rec.direction, createdAt: rec.createdAt };
    },
    async listInbox(userId) {
      return inbox.filter(function (x) { return x.userId === userId; }).slice(0, 100).map(function (x) {
        return { id: x.id, platform: x.platform, senderId: x.senderId, text: x.text, mid: x.mid, direction: x.direction, createdAt: x.createdAt };
      });
    },
    async claimProcessedEvent(id, source) {
      if (!id) return true;
      if (processed.has(id)) return false;
      processed.set(id, { source: source || "", seen: Date.now() });
      return true;
    },
    async logOutbound(userId, row) {
      inbox.push({ id: "o" + seq++, userId: userId, kind: "outlog" });
      return true;
    }
  };
}

module.exports = { makeMemStore: makeMemStore };
