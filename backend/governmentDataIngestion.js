const fs = require("fs");
const path = require("path");
const db = require("./database");

function parseCSVLine(line) {
  return line.split(",");
}

function ingestGovernmentRainfallData() {
  const filePath = path.join(
    __dirname,
    "Sub_Division_IMD_2017.csv"
  );

  if (!fs.existsSync(filePath)) {
    throw new Error("IMD CSV file not found");
  }

  const csv = fs.readFileSync(filePath, "utf8");

  const lines = csv
    .split(/\r?\n/)
    .filter((line) => line.trim() !== "");

  const headers = parseCSVLine(lines[0]).map((header) =>
    header.trim()
  );

  let inserted = 0;
  let skipped = 0;

  const checkExisting = db.prepare(`
    SELECT id
    FROM reports
    WHERE source_type = 'public_dataset'
      AND source_name = 'IMD - Government of India'
      AND title = ?
    LIMIT 1
  `);

  const insert = db.prepare(`
    INSERT INTO reports (
      source_type,
      source_name,
      title,
      description,
      event_category,
      severity,
      state,
      event_time,
      ai_category,
      ai_confidence,
      source_credibility,
      verification_status,
      verification_reason,
      risk_score,
      risk_level,
      verification_recommendation,
      raw_data
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const transaction = db.transaction(() => {
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);

      if (values.length < headers.length) {
        continue;
      }

      const row = {};

      headers.forEach((header, index) => {
        row[header] = values[index]?.trim();
      });

      const subdivision = row.SUBDIVISION || "Unknown";
      const year = row.YEAR || "";
      const annualRainfall = row.ANNUAL || "NA";

      const title =
        `Historical Rainfall - ${subdivision} - ${year}`;

      const existing = checkExisting.get(title);

      if (existing) {
        skipped++;
        continue;
      }

      const description =
        `IMD historical rainfall data for ${subdivision}, ` +
        `year ${year}. Annual rainfall: ${annualRainfall} mm.`;

      insert.run(
        "public_dataset",
        "IMD - Government of India",
        title,
        description,
        "rainfall",
        "medium",
        subdivision,
        `${year}-01-01`,
        "rainfall",
        0.99,
        1.0,
        "verified",
        "Official IMD Government of India historical dataset",
        0,
        "Low",
        "Trusted government dataset",
        JSON.stringify(row)
      );

      inserted++;
    }
  });

  transaction();

  return {
    success: true,
    source: "IMD - Government of India",
    dataset: "Sub Divisional Monthly Rainfall from 1901 to 2017",
    inserted,
    skipped,
  };
}

module.exports = {
  ingestGovernmentRainfallData,
};