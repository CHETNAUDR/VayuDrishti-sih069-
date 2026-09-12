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

  return commonWords / totalUniqueWords;
}

function findDuplicateReport(db, report) {
  const existingReports = db
    .prepare(`
      SELECT
        id,
        title,
        description,
        city,
        state,
        event_category
      FROM reports
      ORDER BY id DESC
      LIMIT 100
    `)
    .all();

  let bestMatch = null;

  const newText = `${report.title || ""} ${report.description || ""}`;

  for (const existing of existingReports) {
    const existingText =
      `${existing.title || ""} ${existing.description || ""}`;

    const textSimilarity = calculateSimilarity(
      newText,
      existingText
    );

    let score = textSimilarity;

    if (
      report.city &&
      existing.city &&
      report.city.toLowerCase() === existing.city.toLowerCase()
    ) {
      score += 0.15;
    }

    if (
      report.state &&
      existing.state &&
      report.state.toLowerCase() === existing.state.toLowerCase()
    ) {
      score += 0.10;
    }

    if (
      report.event_category &&
      existing.event_category &&
      report.event_category.toLowerCase() ===
        existing.event_category.toLowerCase()
    ) {
      score += 0.10;
    }

    score = Math.min(score, 1);

    if (!bestMatch || score > bestMatch.score) {
      bestMatch = {
        id: existing.id,
        score,
      };
    }
  }

  if (bestMatch && bestMatch.score >= 0.75) {
    return {
      is_duplicate: true,
      duplicate_of: bestMatch.id,
      duplicate_score: Number(bestMatch.score.toFixed(2)),
    };
  }

  return {
    is_duplicate: false,
    duplicate_of: null,
    duplicate_score: bestMatch
      ? Number(bestMatch.score.toFixed(2))
      : 0,
  };
}

module.exports = {
  findDuplicateReport,
};