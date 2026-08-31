/* ที่เก็บข้อมูลจริงบน PostgreSQL — ใช้ตอนรันบน Railway */
"use strict";

var Pool = require("pg").Pool;

function makePgStore(connectionString) {
  var pool = new Pool({
    connectionString: connectionString,
    ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? false : { rejectUnauthorized: false },
    max: 8
  });

  function rowToCampaign(r) {
    return {
      id: r.id, name: r.name, platform: r.platform, objective: r.objective, status: r.status,
      budgetPerDay: Number(r.budget_per_day), spent: Number(r.spent),
      reach: Number(r.reach), clicks: Number(r.clicks),
      audience: r.audience || "", duration: Number(r.duration),
      createdAt: r.created_on
    };
  }

  return {
    async init() {
      await pool.query(
        "CREATE TABLE IF NOT EXISTS users (" +
        "  id            TEXT PRIMARY KEY," +
        "  email         TEXT UNIQUE NOT NULL," +
        "  hash          TEXT NOT NULL," +
        "  salt          TEXT NOT NULL," +
        "  consent       BOOLEAN NOT NULL DEFAULT false," +
        "  created_at    TIMESTAMPTZ NOT NULL DEFAULT now())"
      );
      // สำหรับฐานข้อมูลที่สร้างไว้ก่อนจะมีคอลัมน์ consent
      await pool.query("ALTER TABLE users ADD COLUMN IF NOT EXISTS consent BOOLEAN NOT NULL DEFAULT false");
      await pool.query(
        "CREATE TABLE IF NOT EXISTS sessions (" +
        "  token      TEXT PRIMARY KEY," +
        "  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE," +
        "  expires    TIMESTAMPTZ NOT NULL)"
      );
      await pool.query("CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id)");
      await pool.query(
        "CREATE TABLE IF NOT EXISTS campaigns (" +
        "  id             TEXT PRIMARY KEY," +
        "  user_id        TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE," +
        "  name           TEXT NOT NULL," +
        "  platform       TEXT NOT NULL," +
        "  objective      TEXT NOT NULL," +
        "  status         TEXT NOT NULL," +
        "  budget_per_day NUMERIC NOT NULL DEFAULT 0," +
        "  spent          NUMERIC NOT NULL DEFAULT 0," +
        "  reach          NUMERIC NOT NULL DEFAULT 0," +
        "  clicks         NUMERIC NOT NULL DEFAULT 0," +
        "  audience       TEXT NOT NULL DEFAULT ''," +
        "  duration       NUMERIC NOT NULL DEFAULT 0," +
        "  created_on     TEXT NOT NULL," +
        "  created_at     TIMESTAMPTZ NOT NULL DEFAULT now())"
      );
      await pool.query("CREATE INDEX IF NOT EXISTS campaigns_user_idx ON campaigns(user_id)");
      await pool.query(
        "CREATE TABLE IF NOT EXISTS guides (" +
        "  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE," +
        "  steps   JSONB NOT NULL)"
      );
      await pool.query(
        "CREATE TABLE IF NOT EXISTS oauth_states (" +
        "  state      TEXT PRIMARY KEY," +
        "  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE," +
        "  platform   TEXT NOT NULL," +
        "  created_at TIMESTAMPTZ NOT NULL DEFAULT now())"
      );
      await pool.query(
        "CREATE TABLE IF NOT EXISTS ad_connections (" +
        "  user_id         TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE," +
        "  platform        TEXT NOT NULL," +
        "  meta_user_id    TEXT," +
        "  meta_user_name  TEXT," +
        "  token_enc       TEXT NOT NULL," +
        "  token_expires   TIMESTAMPTZ," +
        "  accounts        JSONB NOT NULL DEFAULT '[]'," +
        "  selected_act    TEXT," +
        "  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()," +
        "  PRIMARY KEY (user_id, platform))"
      );
      await pool.query(
        "CREATE TABLE IF NOT EXISTS leads (" +
        "  id           TEXT PRIMARY KEY," +
        "  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE," +
        "  name         TEXT NOT NULL," +
        "  phone        TEXT NOT NULL DEFAULT ''," +
        "  email        TEXT NOT NULL DEFAULT ''," +
        "  platform     TEXT NOT NULL DEFAULT ''," +
        "  campaign_id  TEXT," +
        "  status       TEXT NOT NULL DEFAULT 'new'," +
        "  value        NUMERIC NOT NULL DEFAULT 0," +
        "  note         TEXT NOT NULL DEFAULT ''," +
        "  follow_up_on TEXT NOT NULL DEFAULT ''," +
        "  created_at   TIMESTAMPTZ NOT NULL DEFAULT now())"
      );
      await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS follow_up_on TEXT NOT NULL DEFAULT ''");
      await pool.query("ALTER TABLE leads ADD COLUMN IF NOT EXISTS line_user_id TEXT NOT NULL DEFAULT ''");
      await pool.query("CREATE INDEX IF NOT EXISTS leads_user_idx ON leads(user_id)");
      await pool.query(
        "CREATE TABLE IF NOT EXISTS notifications (" +
        "  id         TEXT PRIMARY KEY," +
        "  user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE," +
        "  type       TEXT NOT NULL," +
        "  title      TEXT NOT NULL," +
        "  body       TEXT NOT NULL DEFAULT ''," +
        "  lead_id    TEXT," +
        "  dedupe_key TEXT NOT NULL," +
        "  read       BOOLEAN NOT NULL DEFAULT false," +
        "  created_at TIMESTAMPTZ NOT NULL DEFAULT now()," +
        "  UNIQUE (user_id, dedupe_key))"
      );
      await pool.query("CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, read)");
      await pool.query(
        "CREATE TABLE IF NOT EXISTS inbox_messages (" +
        "  id          TEXT PRIMARY KEY," +
        "  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE," +
        "  platform    TEXT NOT NULL," +
        "  sender_id   TEXT NOT NULL," +
        "  text        TEXT NOT NULL DEFAULT ''," +
        "  mid         TEXT NOT NULL DEFAULT ''," +
        "  direction   TEXT NOT NULL DEFAULT 'in'," +
        "  created_at  TIMESTAMPTZ NOT NULL DEFAULT now())"
      );
      await pool.query("CREATE INDEX IF NOT EXISTS inbox_user_idx ON inbox_messages(user_id, created_at DESC)");
      await pool.query(
        "CREATE TABLE IF NOT EXISTS outbound_log (" +
        "  id          TEXT PRIMARY KEY," +
        "  user_id     TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE," +
        "  lead_id     TEXT," +
        "  channel     TEXT NOT NULL," +
        "  to_addr     TEXT NOT NULL," +
        "  body        TEXT NOT NULL DEFAULT ''," +
        "  status      TEXT NOT NULL," +
        "  created_at  TIMESTAMPTZ NOT NULL DEFAULT now())"
      );
      await pool.query("DELETE FROM sessions WHERE expires < now()");
      await pool.query("DELETE FROM oauth_states WHERE created_at < now() - interval '20 minutes'");
    },

    async createUser(email, hash, salt, consent) {
      var id = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      try {
        await pool.query("INSERT INTO users (id, email, hash, salt, consent) VALUES ($1,$2,$3,$4,$5)", [id, email, hash, salt, !!consent]);
      } catch (e) {
        if (e && e.code === "23505") return null; // อีเมลซ้ำ
        throw e;
      }
      return { id: id, email: email };
    },
    async listSubscribers() {
      var r = await pool.query("SELECT email, created_at FROM users WHERE consent = true ORDER BY created_at DESC");
      return r.rows.map(function (x) { return { email: x.email, createdAt: x.created_at }; });
    },
    async countUsers() {
      var r = await pool.query("SELECT count(*)::int AS total, count(*) FILTER (WHERE consent) ::int AS subs FROM users");
      return { total: r.rows[0].total, subs: r.rows[0].subs };
    },
    async findUserByEmail(email) {
      var r = await pool.query("SELECT id, email, hash, salt FROM users WHERE email=$1", [email]);
      return r.rows[0] || null;
    },
    async findUserById(id) {
      var r = await pool.query("SELECT id, email FROM users WHERE id=$1", [id]);
      return r.rows[0] || null;
    },

    async createSession(userId, token, expires) {
      await pool.query("INSERT INTO sessions (token, user_id, expires) VALUES ($1,$2,$3)", [token, userId, expires]);
    },
    async findSession(token) {
      var r = await pool.query("SELECT user_id, expires FROM sessions WHERE token=$1 AND expires > now()", [token]);
      return r.rows[0] ? { userId: r.rows[0].user_id, expires: r.rows[0].expires } : null;
    },
    async deleteSession(token) { await pool.query("DELETE FROM sessions WHERE token=$1", [token]); },
    async deleteUserSessions(userId) { await pool.query("DELETE FROM sessions WHERE user_id=$1", [userId]); },

    async listCampaigns(userId) {
      var r = await pool.query("SELECT * FROM campaigns WHERE user_id=$1 ORDER BY created_at DESC", [userId]);
      return r.rows.map(rowToCampaign);
    },
    async getCampaign(userId, id) {
      var r = await pool.query("SELECT * FROM campaigns WHERE user_id=$1 AND id=$2", [userId, id]);
      return r.rows[0] ? rowToCampaign(r.rows[0]) : null;
    },
    async findCampaignByName(userId, name) {
      var r = await pool.query("SELECT * FROM campaigns WHERE user_id=$1 AND lower(btrim(name))=lower(btrim($2)) LIMIT 1", [userId, name]);
      return r.rows[0] ? rowToCampaign(r.rows[0]) : null;
    },
    async insertCampaign(userId, c) {
      var id = "c" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      var r = await pool.query(
        "INSERT INTO campaigns (id,user_id,name,platform,objective,status,budget_per_day,spent,reach,clicks,audience,duration,created_on)" +
        " VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *",
        [id, userId, c.name, c.platform, c.objective, c.status, c.budgetPerDay, c.spent, c.reach, c.clicks, c.audience, c.duration, c.createdAt]
      );
      return rowToCampaign(r.rows[0]);
    },
    async updateCampaign(userId, id, p) {
      var r = await pool.query(
        "UPDATE campaigns SET name=COALESCE($3,name), platform=COALESCE($4,platform), objective=COALESCE($5,objective)," +
        " status=COALESCE($6,status), budget_per_day=COALESCE($7,budget_per_day), spent=COALESCE($8,spent)," +
        " reach=COALESCE($9,reach), clicks=COALESCE($10,clicks), audience=COALESCE($11,audience), duration=COALESCE($12,duration)" +
        " WHERE user_id=$1 AND id=$2 RETURNING *",
        [userId, id,
          p.name == null ? null : p.name, p.platform == null ? null : p.platform,
          p.objective == null ? null : p.objective, p.status == null ? null : p.status,
          p.budgetPerDay == null ? null : p.budgetPerDay, p.spent == null ? null : p.spent,
          p.reach == null ? null : p.reach, p.clicks == null ? null : p.clicks,
          p.audience == null ? null : p.audience, p.duration == null ? null : p.duration]
      );
      return r.rows[0] ? rowToCampaign(r.rows[0]) : null;
    },
    async deleteCampaign(userId, id) {
      var r = await pool.query("DELETE FROM campaigns WHERE user_id=$1 AND id=$2", [userId, id]);
      return r.rowCount > 0;
    },

    async getGuide(userId) {
      var r = await pool.query("SELECT steps FROM guides WHERE user_id=$1", [userId]);
      return r.rows[0] ? r.rows[0].steps : [false, false, false, false, false];
    },
    async setGuide(userId, arr) {
      await pool.query(
        "INSERT INTO guides (user_id, steps) VALUES ($1,$2) ON CONFLICT (user_id) DO UPDATE SET steps=EXCLUDED.steps",
        [userId, JSON.stringify(arr)]
      );
      return arr;
    },

    async saveOauthState(state, userId, platform) {
      await pool.query(
        "INSERT INTO oauth_states (state, user_id, platform) VALUES ($1,$2,$3)",
        [state, userId, platform]
      );
    },
    async takeOauthState(state) {
      var r = await pool.query(
        "DELETE FROM oauth_states WHERE state=$1 AND created_at > now() - interval '20 minutes' RETURNING user_id, platform",
        [state]
      );
      return r.rows[0] || null;
    },

    async upsertAdConnection(userId, platform, row) {
      await pool.query(
        "INSERT INTO ad_connections (user_id, platform, meta_user_id, meta_user_name, token_enc, token_expires, accounts, selected_act, updated_at)" +
        " VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())" +
        " ON CONFLICT (user_id, platform) DO UPDATE SET" +
        " meta_user_id=EXCLUDED.meta_user_id, meta_user_name=EXCLUDED.meta_user_name," +
        " token_enc=EXCLUDED.token_enc, token_expires=EXCLUDED.token_expires," +
        " accounts=EXCLUDED.accounts, selected_act=EXCLUDED.selected_act, updated_at=now()",
        [
          userId, platform,
          row.metaUserId || "", row.metaUserName || "",
          row.tokenEnc, row.tokenExpires || null,
          JSON.stringify(row.accounts || []),
          row.selectedAct || null
        ]
      );
    },
    async getAdConnection(userId, platform) {
      var r = await pool.query(
        "SELECT meta_user_id, meta_user_name, token_enc, token_expires, accounts, selected_act, updated_at" +
        " FROM ad_connections WHERE user_id=$1 AND platform=$2",
        [userId, platform]
      );
      if (!r.rows[0]) return null;
      var x = r.rows[0];
      return {
        metaUserId: x.meta_user_id,
        metaUserName: x.meta_user_name,
        tokenEnc: x.token_enc,
        tokenExpires: x.token_expires,
        accounts: x.accounts || [],
        selectedAct: x.selected_act,
        updatedAt: x.updated_at
      };
    },
    async setSelectedAdAccount(userId, platform, actId) {
      var r = await pool.query(
        "UPDATE ad_connections SET selected_act=$3, updated_at=now() WHERE user_id=$1 AND platform=$2 RETURNING selected_act",
        [userId, platform, actId]
      );
      return r.rowCount > 0;
    },
    async deleteAdConnection(userId, platform) {
      var r = await pool.query("DELETE FROM ad_connections WHERE user_id=$1 AND platform=$2", [userId, platform]);
      return r.rowCount > 0;
    },

    async findLeadByLineUser(userId, lineUserId) {
      if (!lineUserId) return null;
      var r = await pool.query("SELECT * FROM leads WHERE user_id=$1 AND line_user_id=$2 LIMIT 1", [userId, lineUserId]);
      return r.rows[0] ? rowToLead(r.rows[0]) : null;
    },
    async listLeads(userId) {
      var r = await pool.query("SELECT * FROM leads WHERE user_id=$1 ORDER BY created_at DESC", [userId]);
      return r.rows.map(rowToLead);
    },
    async insertLead(userId, L) {
      var id = "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      var r = await pool.query(
        "INSERT INTO leads (id,user_id,name,phone,email,platform,campaign_id,status,value,note,follow_up_on,line_user_id)" +
        " VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *",
        [id, userId, L.name, L.phone || "", L.email || "", L.platform || "", L.campaignId || null, L.status || "new", L.value || 0, L.note || "", L.followUpOn || "", L.lineUserId || ""]
      );
      return rowToLead(r.rows[0]);
    },
    async updateLead(userId, id, L) {
      var r = await pool.query(
        "UPDATE leads SET name=COALESCE($3,name), phone=COALESCE($4,phone), email=COALESCE($5,email)," +
        " platform=COALESCE($6,platform), campaign_id=$7, status=COALESCE($8,status), value=COALESCE($9,value), note=COALESCE($10,note), follow_up_on=COALESCE($11,follow_up_on)" +
        " WHERE user_id=$1 AND id=$2 RETURNING *",
        [userId, id, L.name, L.phone, L.email, L.platform, L.campaignId || null, L.status, L.value, L.note, L.followUpOn == null ? null : L.followUpOn]
      );
      return r.rows[0] ? rowToLead(r.rows[0]) : null;
    },
    async deleteLead(userId, id) {
      var r = await pool.query("DELETE FROM leads WHERE user_id=$1 AND id=$2", [userId, id]);
      return r.rowCount > 0;
    },

    async addNotification(userId, n) {
      var id = "n" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      try {
        await pool.query(
          "INSERT INTO notifications (id,user_id,type,title,body,lead_id,dedupe_key) VALUES ($1,$2,$3,$4,$5,$6,$7)",
          [id, userId, n.type, n.title, n.body || "", n.leadId || null, n.dedupeKey]
        );
        return true;
      } catch (e) {
        if (e && e.code === "23505") return false;
        throw e;
      }
    },
    async listNotifications(userId) {
      var r = await pool.query(
        "SELECT id, type, title, body, lead_id, read, created_at FROM notifications WHERE user_id=$1 ORDER BY created_at DESC LIMIT 50",
        [userId]
      );
      return r.rows.map(function (x) {
        return { id: x.id, type: x.type, title: x.title, body: x.body, leadId: x.lead_id || "", read: !!x.read, createdAt: x.created_at };
      });
    },
    async markNotificationsRead(userId, id) {
      if (id) await pool.query("UPDATE notifications SET read=true WHERE user_id=$1 AND id=$2", [userId, id]);
      else await pool.query("UPDATE notifications SET read=true WHERE user_id=$1 AND read=false", [userId]);
    },
    async insertInbox(userId, row) {
      var id = "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      var r = await pool.query(
        "INSERT INTO inbox_messages (id,user_id,platform,sender_id,text,mid,direction) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
        [id, userId, row.platform || "meta", row.senderId || "", row.text || "", row.mid || "", row.direction || "in"]
      );
      var x = r.rows[0];
      return { id: x.id, platform: x.platform, senderId: x.sender_id, text: x.text, mid: x.mid, direction: x.direction, createdAt: x.created_at };
    },
    async listInbox(userId) {
      var r = await pool.query(
        "SELECT id, platform, sender_id, text, mid, direction, created_at FROM inbox_messages WHERE user_id=$1 ORDER BY created_at DESC LIMIT 100",
        [userId]
      );
      return r.rows.map(function (x) {
        return { id: x.id, platform: x.platform, senderId: x.sender_id, text: x.text, mid: x.mid, direction: x.direction, createdAt: x.created_at };
      });
    },
    async logOutbound(userId, row) {
      var id = "o" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      await pool.query(
        "INSERT INTO outbound_log (id,user_id,lead_id,channel,to_addr,body,status) VALUES ($1,$2,$3,$4,$5,$6,$7)",
        [id, userId, row.leadId || null, row.channel, row.to || "", row.body || "", row.status || "sent"]
      );
    }
  };
}

function rowToLead(r) {
  return {
    id: r.id,
    name: r.name,
    phone: r.phone || "",
    email: r.email || "",
    platform: r.platform || "",
    campaignId: r.campaign_id || "",
    status: r.status,
    value: Number(r.value) || 0,
    note: r.note || "",
    followUpOn: r.follow_up_on || "",
    lineUserId: r.line_user_id || "",
    createdAt: r.created_at
  };
}

module.exports = { makePgStore: makePgStore };
