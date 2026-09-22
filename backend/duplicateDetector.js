function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function getWords(text) {
  return new Set(
    normalizeText(text)
      .split(" ")
      .filter((word) => word.length > 2)
  );
}

function calculateSimilarity(text1, text2) {
  const words1 = getWords(text1);
  const words2 = getWords(text2);

  if (words1.size === 0 || words2.size === 0) {
    return 0;
  }

  let commonWords = 0;

  for (const word of words1) {
    if (words2.has(word)) {
      commonWords++;
    }
  }

  const totalUniqueWords = new Set([
    ...words1,
    ...words2,
  ]).size;

  if (totalUniqueWords === 0) {
    return 0;
  }

  return commonWords / totalUniqueWords;
}

// ------------------------------------------
// COORDINATE DISTANCE
// ------------------------------------------

function distanceKm(lat1, lon1, lat2, lon2) {
  if (
    lat1 == null ||
    lon1 == null ||
    lat2 == null ||
    lon2 == null
  ) {
    return null;
  }

  const R = 6371;

  const dLat =
    ((Number(lat2) - Number(lat1)) * Math.PI) / 180;

  const dLon =
    ((Number(lon2) - Number(lon1)) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(
      (Number(lat1) * Math.PI) / 180
    ) *
      Math.cos(
        (Number(lat2) * Math.PI) / 180
      ) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}

function coordinatesAreNearby(
  lat1,
  lon1,
  lat2,
  lon2,
  maxDistanceKm = 10
) {
  const distance = distanceKm(
    lat1,
    lon1,
    lat2,
    lon2
  );

  if (distance === null) {
    return false;
  }

  return distance <= maxDistanceKm;
}

// ------------------------------------------
// DUPLICATE DETECTION
// ------------------------------------------

function findDuplicateReport(db, report) {
  const existingReports = db
    .prepare(`
      SELECT
        id,
        title,
        description,
        city,
        state,
        latitude,
        longitude,
        event_category
      FROM reports
      ORDER BY id DESC
      LIMIT 100
    `)
    .all();

  let bestMatch = null;

  const newText =
    `${report.title || ""} ${report.description || ""}`;

  for (const existing of existingReports) {
    // --------------------------------------
    // TEXT SIMILARITY
    // --------------------------------------

    const existingText =
      `${existing.title || ""} ${existing.description || ""}`;

    const textSimilarity =
      calculateSimilarity(
        newText,
        existingText
      );

    let score = textSimilarity;

    // --------------------------------------
    // CITY MATCH
    // --------------------------------------

    const sameCity =
      report.city &&
      existing.city &&
      report.city.trim().toLowerCase() ===
        existing.city.trim().toLowerCase();

    if (sameCity) {
      score += 0.15;
    }

    // --------------------------------------
    // STATE MATCH
    // --------------------------------------

    const sameState =
      report.state &&
      existing.state &&
      report.state.trim().toLowerCase() ===
        existing.state.trim().toLowerCase();

    if (sameState) {
      score += 0.10;
    }

    // --------------------------------------
    // EVENT CATEGORY MATCH
    // --------------------------------------

    const sameCategory =
      report.event_category &&
      existing.event_category &&
      report.event_category.trim().toLowerCase() ===
        existing.event_category.trim().toLowerCase();

    if (sameCategory) {
      score += 0.10;
    }

    // --------------------------------------
    // COORDINATE MATCH
    // --------------------------------------

    const coordinateDistance =
      distanceKm(
        report.latitude,
        report.longitude,
        existing.latitude,
        existing.longitude
      );

    const exactCoordinates =
      coordinateDistance !== null &&
      coordinateDistance <= 0.1;

    const nearbyCoordinates =
      coordinateDistance !== null &&
      coordinateDistance <= 10;

    // Same coordinates = very strong duplicate signal
    if (exactCoordinates) {
      score += 0.35;
    } else if (nearbyCoordinates) {
      score += 0.20;
    }

    // --------------------------------------
    // STRONG DUPLICATE RULE
    // --------------------------------------

    // Same city + same category + same coordinates
    // should be considered duplicate even if
    // descriptions are different.

    const strongLocationMatch =
      sameCity &&
      sameCategory &&
      exactCoordinates;

    if (strongLocationMatch) {
      return {
        is_duplicate: true,
        duplicate_of: existing.id,
        duplicate_score: 1.0,
        distance_km:
          Number(
            coordinateDistance.toFixed(2)
          ),
      };
    }

    // --------------------------------------
    // KEEP BEST MATCH
    // --------------------------------------

    if (
      !bestMatch ||
      score > bestMatch.score
    ) {
      bestMatch = {
        id: existing.id,
        score,
        distance_km:
          coordinateDistance !== null
            ? Number(
                coordinateDistance.toFixed(2)
              )
            : null,
      };
    }
  }

  // --------------------------------------
  // GENERAL DUPLICATE THRESHOLD
  // --------------------------------------

  if (
    bestMatch &&
    bestMatch.score >= 0.75
  ) {
    return {
      is_duplicate: true,
      duplicate_of: bestMatch.id,
      duplicate_score: Number(
        bestMatch.score.toFixed(2)
      ),
      distance_km:
        bestMatch.distance_km,
    };
  }

  return {
    is_duplicate: false,
    duplicate_of: null,
    duplicate_score:
      bestMatch
        ? Number(
            bestMatch.score.toFixed(2)
          )
        : 0,
    distance_km:
      bestMatch
        ? bestMatch.distance_km
        : null,
  };
}

module.exports = {
  findDuplicateReport,
  distanceKm,
  coordinatesAreNearby,
};