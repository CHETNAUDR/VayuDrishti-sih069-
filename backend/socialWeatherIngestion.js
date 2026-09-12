const db = require("./database");
const socialConfig = require("./socialConfig");
const { classifyWeatherEvent } = require("./aiClassifier");
const {
  analyzeReport,
  corroborateReport,
} = require("./reportVerifier");
const { findDuplicateReport } = require("./duplicateDetector");

function cleanHtml(html = "") {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}
function isWeatherRelated(text = "") {
  const weatherKeywords = [
    "weather",
    "rain",
    "rainfall",
    "heavy rain",
    "flood",
    "flooding",
    "thunderstorm",
    "thunder",
    "lightning",
    "heatwave",
    "heat wave",
    "fog",
    "dense fog",
    "dust storm",
    "duststorm",
    "strong wind",
    "strong winds",
    "wind",
    "cyclone",
    "storm",
    "cloudburst",
    "hail",
    "hailstorm",
    "monsoon",
    "temperature",
    "forecast",
    "alert",
    "warning",
    "imd weather",
  ];

  const normalizedText = text.toLowerCase();

  return weatherKeywords.some((keyword) =>
    normalizedText.includes(keyword)
  );
}

async function fetchHashtagPosts(hashtag) {
  if (!socialConfig.enabled) {
    return [];
  }

  if (!socialConfig.instanceUrl) {
    throw new Error("Social feed instance URL is not configured.");
  }

  const url =
    `${socialConfig.instanceUrl}/api/v1/timelines/tag/` +
    `${encodeURIComponent(hashtag)}?limit=40`;

  const headers = {};

  if (socialConfig.accessToken) {
    headers.Authorization = `Bearer ${socialConfig.accessToken}`;
  }

  const response = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    throw new Error(
      `Social feed request failed: ${response.status}`
    );
  }

  return await response.json();
}

function getMediaUrls(post) {
  const attachments = post.media_attachments || [];

  let imageUrl = null;
  let videoUrl = null;

  for (const media of attachments) {
    if (!imageUrl && media.type === "image") {
      imageUrl = media.url;
    }

    if (!videoUrl && media.type === "video") {
      videoUrl = media.url;
    }
  }

  return {
    imageUrl,
    videoUrl,
  };
}

function insertSocialReport(post, hashtag) {
  const description = cleanHtml(post.content || "");
  if (!isWeatherRelated(description)) {
  return null;
}

  const title =
    description.length > 100
      ? description.substring(0, 100) + "..."
      : description || `Social weather report #${hashtag}`;

  const aiText = `${title} ${description}`;

  const aiResult = classifyWeatherEvent(aiText);

  const verificationResult = analyzeReport({
    title,
    description,
    source_type: "social_media",
    city: null,
    state: null,
    latitude: null,
    longitude: null,
  });

  const duplicateResult = findDuplicateReport(db, {
    title,
    description,
    city: null,
    state: null,
    event_category: aiResult.category,
  });

  const corroborationResult = corroborateReport({
    title,
    description,
    city: null,
    state: null,
    event_category: aiResult.category,
  });

  const media = getMediaUrls(post);

  const accountName =
    post.account?.display_name ||
    post.account?.username ||
    "Social User";

  const sourceName =
    socialConfig.instanceUrl
      .replace(/^https?:\/\//, "")
      .replace(/\/$/, "");

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
      image_url,
      video_url,
      ai_category,
      ai_confidence,
      source_credibility,
      duplicate_of,
      duplicate_score,
      verification_status,
      verification_reason,
      risk_score,
      risk_level,
      verification_recommendation,
      corroboration_score,
      corroboration_status,
      evidence_summary,
      verified_by,
      verified_at,
      raw_data
    )
    VALUES (
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
      @image_url,
      @video_url,
      @ai_category,
      @ai_confidence,
      @source_credibility,
      @duplicate_of,
      @duplicate_score,
      @verification_status,
      @verification_reason,
      @risk_score,
      @risk_level,
      @verification_recommendation,
      @corroboration_score,
      @corroboration_status,
      @evidence_summary,
      @verified_by,
      @verified_at,
      @raw_data
    )
  `);

  const result = insert.run({
    source_type: "social_media",
    source_name: `${sourceName} / ${accountName}`,
    title,
    description,
    event_category: aiResult.category,
    severity:
      verificationResult.risk_level === "High"
        ? "high"
        : verificationResult.risk_level === "Medium"
        ? "medium"
        : "low",
    city: null,
    state: null,
    latitude: null,
    longitude: null,
    event_time: post.created_at || new Date().toISOString(),
    image_url: media.imageUrl,
    video_url: media.videoUrl,
    ai_category: aiResult.category,
    ai_confidence: aiResult.confidence,
    source_credibility: 0.5,
    duplicate_of: duplicateResult.duplicate_of,
    duplicate_score: duplicateResult.duplicate_score,
    verification_status:
      duplicateResult.duplicate_of
        ? "pending"
        : "pending",
    verification_reason:
      verificationResult.verification_reason,
    risk_score: verificationResult.risk_score,
    risk_level: verificationResult.risk_level,
    verification_recommendation:
      verificationResult.verification_recommendation,
    corroboration_score:
      corroborationResult.corroboration_score,
    corroboration_status:
      corroborationResult.corroboration_status,
    evidence_summary:
      corroborationResult.evidence_summary,
    verified_by: null,
    verified_at: null,
    raw_data: JSON.stringify({
      social_post_id: post.id,
      hashtag,
      account: post.account
        ? {
            id: post.account.id,
            username: post.account.username,
            display_name: post.account.display_name,
          }
        : null,
      url: post.url || null,
      created_at: post.created_at || null,
      tags: post.tags || [],
      media_attachments: post.media_attachments || [],
    }),
  });

  return {
    id: Number(result.lastInsertRowid),
    title,
    event_category: aiResult.category,
    risk_level: verificationResult.risk_level,
    corroboration_status:
      corroborationResult.corroboration_status,
  };
}

async function ingestSocialWeather() {
  if (!socialConfig.enabled) {
    console.log("Social weather ingestion is disabled.");

    return {
      success: true,
      enabled: false,
      collected: 0,
      inserted: 0,
      reports: [],
    };
  }

  let collected = 0;
  let inserted = 0;
  const reports = [];

  for (const hashtag of socialConfig.hashtags) {
    try {
      const posts = await fetchHashtagPosts(hashtag);

      console.log(
        `#${hashtag}: ${posts.length} public posts received`
      );

      collected += posts.length;

      for (const post of posts) {
        try {
        const report = insertSocialReport(
  post,
  hashtag
);

if (report) {
  reports.push(report);
  inserted++;
}      } catch (error) {
          console.error(
            `Social report processing error:`,
            error.message
          );
        }
      }
    } catch (error) {
      console.error(
        `Social ingestion error for #${hashtag}:`,
        error.message
      );
    }
  }

  return {
    success: true,
    enabled: true,
    collected,
    inserted,
    reports,
  };
}

module.exports = {
  fetchHashtagPosts,
  ingestSocialWeather,
};