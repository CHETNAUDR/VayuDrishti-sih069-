

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const db = require("./database");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const {
  getIndiaLiveWeather,
} = require("./weatherIntelligence");
const {
  verifyWeatherImage,
} = require("./imageVerifier");
const { classifyWeatherEvent } = require("./aiClassifier");
const {
  analyzeReport,
  corroborateReport,
} = require("./reportVerifier");
const {
  validateReportLocation,
} = require("./locationValidator");
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
const { runOrchestrator } = require("./ingestionOrchestrator");
const { getAlerts } = require("./weatherAlerts");
const { computeIntelligence } = require("./scoring");
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
app.get("/api/weather/india-live", async (req, res) => {
  try {
    const weather = await getIndiaLiveWeather();

    res.json({
      success: true,
      source: "Open-Meteo",
      generated_at: new Date().toISOString(),
      count: weather.length,
      weather,
    });
  } catch (error) {
    console.error(
      "India live weather error:",
      error
    );

    res.status(500).json({
      success: false,
      message: "Failed to fetch India live weather",
      error: error.message,
    });
  }
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

app.post("/api/dev/sample-events", (req, res) => {
  try {
    const sampleReports = [
      {
        source_type: "demo",
        source_name: "Demo Seed",
        title: "Heavy Rainfall Across Jaipur",
        description: "Intense showers caused waterlogging in low-lying areas of Jaipur and surrounding roads.",
        event_category: "rainfall",
        severity: "high",
        city: "Jaipur",
        state: "Rajasthan",
        latitude: 26.9124,
        longitude: 75.7873,
        event_time: new Date().toISOString(),
        verification_status: "verified",
        risk_score: 82,
        risk_level: "High",
        verification_recommendation: "Escalate to district monitoring unit",
      },
      {
        source_type: "demo",
        source_name: "Demo Seed",
        title: "Thunderstorm Activity in Mumbai",
        description: "Lightning and gusty winds were reported across coastal areas of Mumbai during evening hours.",
        event_category: "thunderstorm",
        severity: "medium",
        city: "Mumbai",
        state: "Maharashtra",
        latitude: 19.076,
        longitude: 72.8777,
        event_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        verification_status: "pending",
        risk_score: 64,
        risk_level: "Moderate",
        verification_recommendation: "Confirm with local weather station",
      },
      {
        source_type: "demo",
        source_name: "Demo Seed",
        title: "Heatwave Conditions in Delhi",
        description: "Afternoon temperatures remained unusually high with heat stress advisories issued for vulnerable groups.",
        event_category: "heatwave",
        severity: "high",
        city: "Delhi",
        state: "Delhi",
        latitude: 28.6139,
        longitude: 77.209,
        event_time: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
        verification_status: "verified",
        risk_score: 76,
        risk_level: "High",
        verification_recommendation: "Activate public health warning",
      },
      {
        source_type: "demo",
        source_name: "Demo Seed",
        title: "Flooding Risk in Kolkata",
        description: "Sustained rainfall raised water levels in several drainage channels around Kolkata suburbs.",
        event_category: "flooding",
        severity: "critical",
        city: "Kolkata",
        state: "West Bengal",
        latitude: 22.5726,
        longitude: 88.3639,
        event_time: new Date(Date.now() - 9 * 60 * 60 * 1000).toISOString(),
        verification_status: "pending",
        risk_score: 91,
        risk_level: "Critical",
        verification_recommendation: "Coordinate emergency response",
      }
    ];

    const insert = db.prepare(`
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
        verification_status,
        risk_score,
        risk_level,
        verification_recommendation
      ) VALUES (
        @source_type,
        @source_name,
        @title,
        @description,
        @event_category,
        @severity,
        @city,
        @state,
        @latitude,
        @longitude,
        @event_time,
        @verification_status,
        @risk_score,
        @risk_level,
        @verification_recommendation
      )
    `);

    const inserted = sampleReports.map((report) => insert.run(report).lastInsertRowid);

    res.json({
      success: true,
      inserted: inserted.length,
      message: "Sample weather events added successfully.",
    });
  } catch (error) {
    console.error("Sample events creation error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create sample events.",
      error: error.message,
    });
  }
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
  async (req, res) => {
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

    let imageVerification = null;

    if (photoFile?.path) {
      try {
        imageVerification = await verifyWeatherImage({
          imagePath: photoFile.path,
          eventCategory: event_category,
          title,
          description,
        });

        console.log("IMAGE AI VERIFICATION:", imageVerification);
      } catch (error) {
        console.error("Image AI verification error:", error);

        if (photoFile?.path && fs.existsSync(photoFile.path)) {
          fs.unlinkSync(photoFile.path);
        }

        if (videoFile?.path && fs.existsSync(videoFile.path)) {
          fs.unlinkSync(videoFile.path);
        }

        return res.status(503).json({
          success: false,
          code: "IMAGE_VERIFICATION_UNAVAILABLE",
          message:
            "Image verification service is currently unavailable. Report was not submitted.",
        });
      }

      if (!imageVerification.is_weather_related || imageVerification.confidence < 0.6) {
        if (photoFile?.path && fs.existsSync(photoFile.path)) {
          fs.unlinkSync(photoFile.path);
        }

        if (videoFile?.path && fs.existsSync(videoFile.path)) {
          fs.unlinkSync(videoFile.path);
        }

        return res.status(400).json({
          success: false,
          code: "IMAGE_NOT_WEATHER_RELATED",
          message: "The uploaded image does not appear to show a weather-related event.",
          image_verification: imageVerification,
        });
      }
    }
  let locationValidation;

try {
  locationValidation = await validateReportLocation({
    city,
    state,
    latitude,
    longitude,
    photoPath: photoFile?.path || null,
     event_time,

  });

  console.log(
    "LOCATION VALIDATION:",
    locationValidation
  );
} catch (error) {
  console.error(
    "Location validation error:",
    error
  );

  return res.status(503).json({
    success: false,
    code: "LOCATION_VALIDATION_UNAVAILABLE",
    message:
      "Location verification service is currently unavailable. Report was not submitted.",
  });
}
const RELAX_LOCATION =
  (process.env.RELAX_LOCATION_VALIDATION || "").toLowerCase() === "1" ||
  (process.env.RELAX_LOCATION_VALIDATION || "").toLowerCase() === "true";

if (
  locationValidation.status === "invalid_location" ||
  locationValidation.status === "location_mismatch" ||
  locationValidation.status === "photo_location_mismatch"
) {
  if (!RELAX_LOCATION) {
    if (photoFile?.path && fs.existsSync(photoFile.path)) {
      fs.unlinkSync(photoFile.path);
    }

    if (videoFile?.path && fs.existsSync(videoFile.path)) {
      fs.unlinkSync(videoFile.path);
    }

    return res.status(400).json({
      success: false,
      code: locationValidation.status,
      message: locationValidation.message,
      location_validation: locationValidation,
    });
  } else {
    console.warn(
      "Location validation failed but RELAX_LOCATION_VALIDATION enabled:",
      locationValidation
    );

    // Mark as a warning so downstream logic can record it in verification reason
    locationValidation.warning = true;
  }
}

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
  latitude,
  longitude,
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
if (duplicateResult.is_duplicate) {
  if (photoFile?.path && fs.existsSync(photoFile.path)) {
    fs.unlinkSync(photoFile.path);
  }

  if (videoFile?.path && fs.existsSync(videoFile.path)) {
    fs.unlinkSync(videoFile.path);
  }

  return res.status(409).json({
    success: false,
    code: "DUPLICATE_REPORT",
    message: "A similar weather report already exists.",
    duplicate_of: duplicateResult.duplicate_of,
    duplicate_score: duplicateResult.duplicate_score,
    distance_km: duplicateResult.distance_km,
  });
}


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
      `${verificationResult.verification_reason || ""} Location validation: ${locationValidation.message}`,
        corroborationResult.corroboration_score,
corroborationResult.corroboration_status,
corroborationResult.evidence_summary,
        duplicateResult.duplicate_of,
  duplicateResult.duplicate_score

      );
    // compute intelligence score and persist
    try {
      const reportRow = db
        .prepare(`SELECT * FROM reports WHERE id = ?`)
        .get(result.lastInsertRowid);

      const intel = computeIntelligence(reportRow);

      db.prepare(`UPDATE reports SET intelligence_score = ?, intelligence_reasons = ? WHERE id = ?`).run(
        intel.intelligence_score,
        intel.intelligence_reasons,
        result.lastInsertRowid
      );
    } catch (e) {
      console.error("Failed to compute/persist intelligence score:", e.message);
    }
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

// ==========================================
// MAP DATA (combined live weather, reports, official alerts)
// ==========================================

app.get("/api/map/data", async (req, res) => {
  try {
    const { getIndiaWeather } = require("./weatherIngestion");

    const live = await getIndiaWeather();

    const reports = db
      .prepare(`SELECT id, title, event_category, city, state, latitude, longitude, event_time, severity, verification_status, intelligence_score FROM reports ORDER BY id DESC LIMIT 200`)
      .all();

    const alertsResp = await getAlerts();

    res.json({
      success: true,
      live_weather: live,
      reports,
      alerts: alertsResp.success ? alertsResp.alerts : [],
      alerts_status: alertsResp.success ? "ok" : "unavailable",
    });
  } catch (error) {
    console.error("Map data error:", error);

    res.status(500).json({ success: false, message: error.message });
  }
});
// ==========================================
// UNIFIED INGESTION ORCHESTRATOR
// ==========================================

app.post("/api/ingest/orchestrator", async (req, res) => {
  try {
    const summary = await runOrchestrator();

    // Broadcast a high-level ingestion completed event
    broadcastEvent("ingestion_completed", {
      timestamp: new Date().toISOString(),
      summary,
    });

    res.json({ success: true, summary });
  } catch (error) {
    console.error("Orchestrator error:", error);

    res.status(500).json({
      success: false,
      message: "Unified ingestion orchestrator failed",
      error: error.message,
    });
  }
});

// ==========================================
// WEATHER ALERTS
// ==========================================

app.get("/api/weather/alerts", async (req, res) => {
  try {
    const alerts = await getAlerts();

    if (!alerts.success) {
      return res.status(503).json(alerts);
    }

    // Broadcast each alert as SSE (non-fabricated)
    for (const alert of alerts.alerts || []) {
      broadcastEvent("new_alert", {
        title: alert.title,
        issue_time: alert.issue_time,
        source: alert.source,
        url: alert.url,
        timestamp: new Date().toISOString(),
      });
    }

    res.json(alerts);
  } catch (error) {
    console.error("Weather alerts error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch weather alerts",
      error: error.message,
    });
  }
});

// ==========================================
// STATS / ANALYTICS
// ==========================================

app.get("/api/stats", (req, res) => {
  try {
    const counts = db
      .prepare(
        `SELECT source_type, COUNT(*) as cnt FROM reports GROUP BY source_type`
      )
      .all();

    const recent = db
      .prepare(
        `SELECT id, title, event_category, city, state, event_time, source_type, ai_confidence, source_credibility, duplicate_score, corroboration_score, severity FROM reports ORDER BY id DESC LIMIT 10`
      )
      .all();

    // attach intelligence score for recent reports
    const enrichedRecent = recent.map((r) => {
      const score = computeIntelligence(r);

      return {
        ...r,
        intelligence_score: score.intelligence_score,
        intelligence_reasons: score.intelligence_reasons,
      };
    });

    res.json({
      success: true,
      total_reports: counts.reduce((s, c) => s + c.cnt, 0),
      counts_by_source: counts,
      recent_reports: enrichedRecent,
    });
  } catch (error) {
    console.error("Stats error:", error);

    res.status(500).json({
      success: false,
      message: "Failed to compute stats",
      error: error.message,
    });
  }
});

// Recompute intelligence scores for recent reports
app.post("/api/reports/recompute-intelligence", (req, res) => {
  try {
    const rows = db
      .prepare("SELECT id FROM reports ORDER BY id DESC LIMIT 500")
      .all();

    let updated = 0;

    const stmtGet = db.prepare("SELECT * FROM reports WHERE id = ?");
    const stmtUpdate = db.prepare(
      "UPDATE reports SET intelligence_score = ?, intelligence_reasons = ? WHERE id = ?"
    );

    for (const row of rows) {
      const r = stmtGet.get(row.id);

      const intel = computeIntelligence(r);

      stmtUpdate.run(intel.intelligence_score, intel.intelligence_reasons, row.id);

      updated++;
    }

    res.json({ success: true, updated });
  } catch (error) {
    console.error("Recompute intelligence error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});