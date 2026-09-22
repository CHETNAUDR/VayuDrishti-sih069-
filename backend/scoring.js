function computeIntelligence(report = {}) {
  // Normalize values
  const ai = Number(report.ai_confidence || 0);
  const src = Number(report.source_credibility || 0);
  const dup = Number(report.duplicate_score || 0);
  const coro = Number(report.corroboration_score || 0);

  // Basic weights
  const weights = {
    ai: 0.35,
    source: 0.25,
    corroboration: 0.25,
    duplicate: 0.15,
  };

  // Duplicate reduces confidence: transform duplicate_score (0..1) into confidence factor
  const dupFactor = Math.max(0, 1 - dup);

  // severity adjustment
  let severityBoost = 0;
  if (report.severity === "high") severityBoost = 5;
  else if (report.severity === "medium") severityBoost = 2;

  let score =
    ai * 100 * weights.ai +
    src * 100 * weights.source +
    coro * weights.corroboration * 100 +
    dupFactor * 100 * weights.duplicate +
    severityBoost;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const reasons = [];
  reasons.push(`AI confidence: ${ai}`);
  reasons.push(`Source credibility: ${src}`);
  reasons.push(`Corroboration score: ${coro}`);
  reasons.push(`Duplicate penalty factor: ${dup}`);
  if (severityBoost) reasons.push(`Severity boost: ${severityBoost}`);

  return {
    intelligence_score: score,
    intelligence_reasons: reasons.join("; "),
  };
}

module.exports = {
  computeIntelligence,
};
