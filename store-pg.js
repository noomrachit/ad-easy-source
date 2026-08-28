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
        "  created_at    TIMESTAMPTZ NOT NULL DEFAULT now())"
      );
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
      // เก็บกวาด session ที่หมดอายุ
      await pool.query("DELETE FROM sessions WHERE expires < now()");
    },

    async createUser(email, hash, salt) {
      var id = "u" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      try {
        await pool.query("INSERT INTO users (id, email, hash, salt) VALUES ($1,$2,$3,$4)", [id, email, hash, salt]);
      } catch (e) {
        if (e && e.code === "23505") return null; // อีเมลซ้ำ
        throw e;
      }
      return { id: id, email: email };
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
    }
  };
}

module.exports = { makePgStore: makePgStore };
