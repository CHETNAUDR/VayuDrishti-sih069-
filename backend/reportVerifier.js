const db = require("./database");

function analyzeReport(report) {
  const text = `${report.title || ""} ${report.description || ""}`.toLowerCase();

  let riskScore = 0;
  const reasons = [];

  // 1. Very weak / missing description
  if (!report.description || report.description.trim().length < 15) {
    riskScore += 20;
    reasons.push("Insufficient report description");
  }

  // 2. Missing location
  if (
    !report.city ||
    !report.state ||
    report.latitude == null ||
    report.longitude == null
  ) {
    riskScore += 20;
    reasons.push("Location information is incomplete");
  }

  // 3. Suspicious language
  const suspiciousWords = [
    "100% confirmed",
    "guaranteed",
    "fake news",
    "everyone is dead",
    "apocalypse",
    "share immediately",
    "forward this",
    "breaking!!!",
  ];

  for (const word of suspiciousWords) {
    if (text.includes(word)) {
      riskScore += 20;
      reasons.push(`Suspicious phrase detected: "${word}"`);
    }
  }

  // 4. Unknown source
  if (
    report.source_type !== "weather_api" &&
    report.source_type !== "citizen_report"
  ) {
    riskScore += 15;
    reasons.push("Source type has lower trust");
  }

  riskScore = Math.min(riskScore, 100);

  let riskLevel = "Low";

  if (riskScore >= 60) {
    riskLevel = "High";
  } else if (riskScore >= 30) {
    riskLevel = "Medium";
  }

  return {
    risk_score: riskScore,
    risk_level: riskLevel,
    verification_recommendation:
      riskScore >= 60
        ? "Manual verification required"
        : "Likely trustworthy",
    verification_reason:
      reasons.length > 0
        ? reasons.join("; ")
        : "No major suspicious indicators detected",
  };
}

// ==========================================
// CROSS-SOURCE CORROBORATION
// ==========================================

function corroborateReport(report) {
  const evidence = [];
  let corroborationScore = 0;

  const reportText =
    `${report.title || ""} ${report.description || ""}`.toLowerCase();

  const category = (report.event_category || "").toLowerCase();

  // ------------------------------------------
  // 1. Check official IMD RSS evidence
  // ------------------------------------------

  const imdReports = db
    .prepare(`
      SELECT
        id,
        title,
        description,
        event_category,
        event_time
      FROM reports
      WHERE source_type = 'web_source'
        AND source_name = 'IMD Official RSS'
      ORDER BY id DESC
      LIMIT 100
    `)
    .all();

  let imdMatch = null;

  for (const imd of imdReports) {
    const imdText =
      `${imd.title || ""} ${imd.description || ""}`.toLowerCase();

    const categoryMatch =
      category &&
      imd.event_category &&
      imd.event_category.toLowerCase() === category;

    const cityMatch =
      report.city &&
      imdText.includes(report.city.toLowerCase());

    const stateMatch =
      report.state &&
      imdText.includes(report.state.toLowerCase());

    const keywordMatch =
      reportText
        .split(/\s+/)
        .filter((word) => word.length >= 5)
        .some((word) => imdText.includes(word));

    if (categoryMatch && (cityMatch || stateMatch || keywordMatch)) {
      imdMatch = imd;
      break;
    }
  }

  if (imdMatch) {
    corroborationScore += 50;

    evidence.push(
      `Official IMD RSS evidence found: ${imdMatch.title}`
    );
  }

  // ------------------------------------------
  // 2. Check other database reports
  // ------------------------------------------

  const similarReports = db
  .prepare(`
    SELECT
      id,
      source_type,
      source_name,
      event_category,
      city,
      state,
      source_credibility
    FROM reports
    WHERE id != ?
      AND event_category = ?
      AND source_type IN (
        'weather_api',
        'citizen_report',
        'web_source'
      )
    ORDER BY id DESC
    LIMIT 100
  `)
  .all(report.id || -1, report.event_category || "");
  const matchingLocation = similarReports.find((item) => {
    const sameCity =
      report.city &&
      item.city &&
      item.city.toLowerCase() === report.city.toLowerCase();

    const sameState =
      report.state &&
      item.state &&
      item.state.toLowerCase() === report.state.toLowerCase();

    return sameCity || sameState;
  });

  if (matchingLocation) {
    corroborationScore += 25;

    evidence.push(
      `Matching weather report found from ${matchingLocation.source_name || matchingLocation.source_type}`
    );
  }

  // ------------------------------------------
  // 3. Determine recommendation
  // ------------------------------------------

  corroborationScore = Math.min(corroborationScore, 100);

  let recommendation = "Needs further verification";

  if (corroborationScore >= 50) {
    recommendation = "Corroborated by available sources";
  } else if (corroborationScore >= 25) {
    recommendation = "Partially corroborated";
  }

  return {
    corroboration_score: corroborationScore,
    corroboration_status: recommendation,
    evidence_summary:
      evidence.length > 0
        ? evidence.join("; ")
        : "No independent corroborating evidence found",
  };
}

module.exports = {
  analyzeReport,
  corroborateReport,
};