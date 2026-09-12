

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./database");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { classifyWeatherEvent } = require("./aiClassifier");
const {
  analyzeReport,
  corroborateReport,
} = require("./reportVerifier");
const {
  ingestPublicWebWeather,
} = require("./publicWebIngestion");
const {
  updateSourceStatus,
} = require("./sourceRegistry");
const { findDuplicateReport } = require("./duplicateDetector");
const { getSources } = require("./sourceRegistry");
const { ingestGovernmentRainfallData } = require("./governmentDataIngestion");

const { ingestIMDRSS } = require("./imdRssIngestion");
const {
  ingestSocialWeather,
} = require("./socialWeatherIngestion");
const app = express();
const PORT = 5000;
const sseClients = new Set();
app.use(cors());
app.use(express.json());

app.get("/api/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.flushHeaders();

  sseClients.add(res);

  req.on("close", () => {
    sseClients.delete(res);
  });
});

function broadcastEvent(event, data) {
  const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

  for (const client of sseClients) {
    client.write(message);
  }
}

app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, "uploads");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },

  filename: (req, file, cb) => {
    const uniqueName =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(null, uniqueName + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});
app.use("/uploads", express.static(uploadDir));
// ==========================================
// HEALTH CHECK
// ==========================================


app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    platform: "VayuDrishti",
    status: "online",
    database: "connected",
    message: "VayuDrishti backend is running",
  });
});
app.get("/api/sources", (req, res) => {
  res.json({
    success: true,
    count: getSources().length,
    sources: getSources(),
  });
});
app.post("/api/ingest/government-rainfall", (req, res) => {
  try {
    const result = ingestGovernmentRainfallData();
    console.log(
  "GOVERNMENT MONITOR COUNT:",
  result.inserted + result.skipped
);
    updateSourceStatus(
  "government_dataset",
  new Date().toISOString(),
 result.inserted + result.skipped,
  "healthy"
);

    res.json(result);
  } catch (error) {
    console.error("Government data ingestion error:", error);

    res.status(500).json({
      success: false,
      message: "Government rainfall data ingestion failed",
      error: error.message,
    });
  }
});

// ==========================================
// IMD OFFICIAL RSS INGESTION
// ==========================================

app.post("/api/ingest/imd-rss", async (req, res) => {
  try {
    const result = await ingestIMDRSS();

updateSourceStatus(
  "web_sources",
  new Date().toISOString(),
  result.inserted,
  "healthy"
);
    res.json(result);
  } catch (error) {
    console.error("IMD RSS ingestion error:", error);

    res.status(500).json({
      success: false,
      message: "IMD RSS ingestion failed",
      error: error.message,
    });
  }
});
// ==========================================
// PUBLIC WEB WEATHER INGESTION
// ==========================================

app.post("/api/ingest/public-web", async (req, res) => {
  try {
    const result = await ingestPublicWebWeather();
    updateSourceStatus(
  "web_sources",
  new Date().toISOString(),
  result.inserted,
  "healthy"
);

    res.json(result);
  } catch (error) {
    console.error("Public web ingestion error:", error);

    res.status(500).json({
      success: false,
      message: "Public web weather ingestion failed",
      error: error.message,
    });
  }
});
// ==========================================
// SOCIAL / #IMD WEATHER INGESTION
// ==========================================

app.post("/api/ingest/social", async (req, res) => {
  try {
    const result = await ingestSocialWeather();

    updateSourceStatus(
      "social_feed",
      new Date().toISOString(),
      result.collected || 0,
      "healthy"
    );

    res.json(result);
  } catch (error) {
    console.error("Social weather ingestion error:", error);

    res.status(500).json({
      success: false,
      message: "Social weather ingestion failed",
      error: error.message,
    });
  }
});
// ==========================================
// GET ALL REPORTS
// ==========================================

app.get("/api/reports", (req, res) => {
  try {
    const reports = db
      .prepare("SELECT * FROM reports ORDER BY id DESC")
      .all();

    res.json({
      success: true,
      count: reports.length,
      reports,
    });
  } catch (error) {
    console.error("Get reports error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch reports",
      error: error.message,
    });
  }
});

// ==========================================
// LIVE WEATHER
// ==========================================

app.get("/api/weather/live", async (req, res) => {
  try {
    const { getIndiaWeather } = require("./weatherIngestion");

    const weather = await getIndiaWeather();
    updateSourceStatus(
  "open_meteo",
  new Date().toISOString(),
  weather.length,
  "healthy"
);

    res.json({
      success: true,
      source: "Open-Meteo",
      count: weather.length,
      weather,
    });
  } catch (error) {
    console.error("Live weather error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch live weather data",
      error: error.message,
    });
  }
});

// ==========================================
// WEATHER DATA INGESTION
// ==========================================

app.post("/api/ingest/weather", async (req, res) => {
  try {
    const { ingestWeatherApi } = require("./dataIngestion");

    const result = await ingestWeatherApi();

    res.json(result);
  } catch (error) {
    console.error("Weather ingestion error:", error);

    res.status(500).json({
      success: false,
      message: "Weather ingestion failed",
      error: error.message,
    });
  }
});

// ==========================================
// CREATE WEATHER REPORT
// ==========================================
app.get("/api/government-rainfall", (req, res) => {
  try {
    const data = db
      .prepare(`
        SELECT
          id,
          source_name,
          state,
          event_time,
          description,
          raw_data
        FROM reports
        WHERE source_type = 'public_dataset'
        ORDER BY id DESC
      `)
      .all();

    res.json({
      success: true,
      count: data.length,
      source: "IMD - Government of India",
      data,
    });
  } catch (error) {
    console.error("Government rainfall fetch error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch government rainfall data",
      error: error.message,
    });
  }
});
app.post(
  "/api/reports",
  upload.fields([
    { name: "photo", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  (req, res) => {
    const photoFile = req.files?.photo?.[0];
const videoFile = req.files?.video?.[0];

const imageUrl = photoFile
  ? `/uploads/${photoFile.filename}`
  : null;

const videoUrl = videoFile
  ? `/uploads/${videoFile.filename}`
  : null;
  const {
    source_type,
    source_name,
    title,
    description,
    event_category,
    severity,
    city,
    state,
    latitude,
    longitude,
    event_time,
  } = req.body;

  // ------------------------------------------
  // AI EVENT CLASSIFICATION
  // ------------------------------------------

  const aiText = `${title || ""} ${description || ""}`;

  const aiResult = classifyWeatherEvent(aiText);

  console.log("AI RESULT:", aiResult);

  // ------------------------------------------
  // REPORT VERIFICATION / RISK ANALYSIS
  // ------------------------------------------

  const verificationResult = analyzeReport({
    title,
    description,
    source_type,
    city,
    state,
    latitude,
    longitude,
  });
  const duplicateResult = findDuplicateReport(db, {
  title,
  description,
  city,
  state,
  event_category,
});

console.log("DUPLICATE RESULT:", duplicateResult);

  console.log("VERIFICATION RESULT:", verificationResult);
  const corroborationResult = corroborateReport({
  title,
  description,
  city,
  state,
  event_category,
});


console.log("CORROBORATION RESULT:", corroborationResult);
console.log("CORROBORATION STATUS:", corroborationResult.corroboration_status);
console.log("EVIDENCE SUMMARY:", corroborationResult.evidence_summary);

  // ------------------------------------------
  // SAVE REPORT
  // ------------------------------------------

  try {
    const result = db
      .prepare(`
        INSERT INTO reports (
          source_type,
          source_name,
          title,
          description,
          event_category,
          severity,
          city,
          state,
          latitude,
          longitude,
          event_time,
           image_url,
  video_url,
          ai_category,
          ai_confidence,
          risk_score,
          risk_level,
          verification_recommendation,
verification_reason,
corroboration_score,
corroboration_status,
evidence_summary,
duplicate_of,
duplicate_score
        )
      VALUES (
  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,
?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
)
      `)
      .run(
        source_type,
        source_name,
        title,
        description,
        event_category,
        severity || "medium",
        city,
        state,
        latitude,
        longitude,
        event_time,
        imageUrl,
  videoUrl,
        aiResult.category,
        aiResult.confidence,
        verificationResult.risk_score,
        verificationResult.risk_level,
        verificationResult.verification_recommendation,
        verificationResult.verification_reason,
        corroborationResult.corroboration_score,
corroborationResult.corroboration_status,
corroborationResult.evidence_summary,
        duplicateResult.duplicate_of,
  duplicateResult.duplicate_score

      );
    broadcastEvent("new_report", {
      report_id: Number(result.lastInsertRowid),
      title,
      description,
      event_category,
      severity: severity || "medium",
      city,
      state,
      latitude,
      longitude,
      event_time,
      image_url: imageUrl,
      video_url: videoUrl,
      ai_category: aiResult.category,
      ai_confidence: aiResult.confidence,
      risk_score: verificationResult.risk_score,
      risk_level: verificationResult.risk_level,
      verification_recommendation:
        verificationResult.verification_recommendation,
      timestamp: new Date().toISOString(),
    });
    // ----------------------------------------
    // RESPONSE
    // ----------------------------------------

    res.json({
      success: true,
      message: "Weather report saved successfully",

      report_id: result.lastInsertRowid,

      ai_category: aiResult.category,
      ai_confidence: aiResult.confidence,

      risk_score: verificationResult.risk_score,
      risk_level: verificationResult.risk_level,

      verification_recommendation:
        verificationResult.verification_recommendation,

      verification_reason:
        verificationResult.verification_reason,
    });
  } catch (error) {
    console.error("Error saving report:", error);

    res.status(500).json({
      success: false,
      message: "Failed to save weather report",
      error: error.message,
    });
  }
});

// ==========================================
// VERIFY / REJECT WEATHER REPORT
// ==========================================

app.put("/api/reports/:id/verify", (req, res) => {
  const { id } = req.params;
  const { status, reason } = req.body;

  // Only these two statuses are allowed
  if (!["verified", "rejected"].includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid verification status",
    });
  }

  try {
    const result = db
      .prepare(`
        UPDATE reports
        SET
          verification_status = ?,
          verification_reason = ?,
          verified_by = ?,
          verified_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `)
      .run(
        status,
        reason || null,
        "Admin",
        id
      );

    if (result.changes === 0) {
      return res.status(404).json({
        success: false,
        message: "Report not found",
      });
    }

    res.json({
      success: true,
      message: `Report ${status} successfully`,
    });
  } catch (error) {
    console.error("Verification error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to update verification status",
      error: error.message,
    });
  }
});

// ==========================================
// START SERVER
// ==========================================

app.listen(PORT, () => {
  console.log(
    `VayuDrishti backend running on http://localhost:${PORT}`
  );
});