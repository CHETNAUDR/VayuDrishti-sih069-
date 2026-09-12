const https = require("https");
const db = require("./database");

const IMD_RSS_URL =
  "https://mausam.imd.gov.in/imd_latest/contents/dist_nowcast_rss.php";

function fetchRSS(url) {
  return new Promise((resolve, reject) => {
    https
      .get(
        url,
        {
          headers: {
            "User-Agent": "VayuDrishti/1.0",
          },
        },
        (response) => {
          let data = "";

          response.on("data", (chunk) => {
            data += chunk;
          });

          response.on("end", () => {
            if (response.statusCode !== 200) {
              reject(
                new Error(`IMD RSS returned status ${response.statusCode}`)
              );
              return;
            }

            resolve(data);
          });
        }
      )
      .on("error", reject);
  });
}

function decodeXML(text) {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function getTag(item, tagName) {
  const regex = new RegExp(
    `<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`,
    "i"
  );

  const match = item.match(regex);

  return match ? decodeXML(match[1].trim()) : "";
}

function classifyIMDText(text) {
  const value = text.toLowerCase();

  if (
    value.includes("flood") ||
    value.includes("flash flood") ||
    value.includes("waterlogging")
  ) {
    return "flooding";
  }

  if (
    value.includes("thunderstorm") ||
    value.includes("thunder storm") ||
    value.includes("lightning")
  ) {
    return "thunderstorm";
  }

  if (
    value.includes("heatwave") ||
    value.includes("heat wave")
  ) {
    return "heatwave";
  }

  if (
    value.includes("dust storm") ||
    value.includes("duststorm")
  ) {
    return "dust storm";
  }

  if (
    value.includes("strong wind") ||
    value.includes("gust") ||
    value.includes("squally wind")
  ) {
    return "strong wind";
  }

  if (
    value.includes("fog") ||
    value.includes("dense fog")
  ) {
    return "fog";
  }

  if (
    value.includes("heavy rain") ||
    value.includes("rainfall") ||
    value.includes("rain")
  ) {
    return "rainfall";
  }

  return "weather alert";
}

async function ingestIMDRSS() {
  console.log("Starting IMD RSS ingestion...");

  const xml = await fetchRSS(IMD_RSS_URL);

  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  let inserted = 0;
  let skipped = 0;

  const insertReport = db.prepare(`
    INSERT INTO reports (
      source_type,
      source_name,
      title,
      description,
      event_category,
      severity,
      event_time,
      collected_at,
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
    VALUES (
      ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP,
      ?, ?, ?, ?, ?, ?, ?, ?, ?
    )
  `);

  const checkExisting = db.prepare(`
    SELECT id
    FROM reports
    WHERE source_type = 'web_source'
      AND source_name = 'IMD Official RSS'
      AND title = ?
    LIMIT 1
  `);

  const transaction = db.transaction(() => {
    for (const item of itemMatches) {
      const title = getTag(item, "title");
      const description = getTag(item, "description");
      const link = getTag(item, "link");
      const pubDate = getTag(item, "pubDate");

      if (!title) {
        skipped++;
        continue;
      }

      const existing = checkExisting.get(title);

      if (existing) {
        skipped++;
        continue;
      }

      const combinedText = `${title} ${description}`;
      const category = classifyIMDText(combinedText);

      insertReport.run(
        "web_source",
        "IMD Official RSS",
        title,
        description,
        category,
        "high",
        pubDate || new Date().toISOString(),
        category,
        0.98,
        1.0,
        "verified",
        "Official IMD RSS source",
        10,
        "Low",
        "Trusted official government source",
        JSON.stringify({
          source: "IMD Official RSS",
          link,
          pubDate,
          title,
          description,
        })
      );

      inserted++;
    }
  });

  transaction();

  console.log(
    `IMD RSS ingestion completed. Inserted: ${inserted}, Skipped: ${skipped}`
  );

  return {
    success: true,
    source: "IMD Official RSS",
    total_items: itemMatches.length,
    inserted,
    skipped,
  };
}

module.exports = {
  ingestIMDRSS,
};