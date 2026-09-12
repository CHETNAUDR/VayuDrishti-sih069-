const Database = require("better-sqlite3");

const db = new Database("vayudrishti.db");

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    source_type TEXT NOT NULL,
    source_name TEXT,

    title TEXT,
    description TEXT,

    event_category TEXT,
    severity TEXT DEFAULT 'medium',

    city TEXT,
    state TEXT,
    latitude REAL,
    longitude REAL,

    event_time TEXT,
    collected_at TEXT DEFAULT CURRENT_TIMESTAMP,

    image_url TEXT,
    video_url TEXT,

    ai_category TEXT,
    ai_confidence REAL,

    source_credibility REAL DEFAULT 0,

    duplicate_of INTEGER,
    duplicate_score REAL DEFAULT 0,

    verification_status TEXT DEFAULT 'pending',

    verification_reason TEXT,

    risk_score REAL DEFAULT 0,
    risk_level TEXT DEFAULT 'Low',
    verification_recommendation TEXT,
    corroboration_score REAL DEFAULT 0,
corroboration_status TEXT,
evidence_summary TEXT,

    verified_by TEXT,
    verified_at TEXT,

    raw_data TEXT,

    FOREIGN KEY (duplicate_of) REFERENCES reports(id)
  );
`);

// Existing database mein naye columns add karna
const columns = db
  .prepare("PRAGMA table_info(reports)")
  .all()
  .map((column) => column.name);

if (!columns.includes("risk_score")) {
  db.exec(`
    ALTER TABLE reports
    ADD COLUMN risk_score REAL DEFAULT 0
  `);
}

if (!columns.includes("risk_level")) {
  db.exec(`
    ALTER TABLE reports
    ADD COLUMN risk_level TEXT DEFAULT 'Low'
  `);
}

if (!columns.includes("verification_recommendation")) {
  db.exec(`
    ALTER TABLE reports
    ADD COLUMN verification_recommendation TEXT
  `);
}
if (!columns.includes("corroboration_score")) {
  db.exec(
    `ALTER TABLE reports ADD COLUMN corroboration_score REAL DEFAULT 0`
  );
}

if (!columns.includes("corroboration_status")) {
  db.exec(
    `ALTER TABLE reports ADD COLUMN corroboration_status TEXT`
  );
}

if (!columns.includes("evidence_summary")) {
  db.exec(
    `ALTER TABLE reports ADD COLUMN evidence_summary TEXT`
  );
}

console.log("VayuDrishti database initialized successfully.");

module.exports = db;