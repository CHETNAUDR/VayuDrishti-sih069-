function classifyWeatherEvent(text) {
  const content = String(text || "").toLowerCase();

  if (
    content.includes("flood") ||
    content.includes("flooding") ||
    content.includes("waterlogging")
  ) {
    return {
      category: "Flooding",
      confidence: 0.95,
    };
  }

  if (
    content.includes("thunder") ||
    content.includes("lightning")
  ) {
    return {
      category: "Thunderstorm",
      confidence: 0.93,
    };
  }

  if (
    content.includes("heatwave") ||
    content.includes("heat wave") ||
    content.includes("extreme heat")
  ) {
    return {
      category: "Heatwave",
      confidence: 0.94,
    };
  }

  if (
    content.includes("fog") ||
    content.includes("dense fog")
  ) {
    return {
      category: "Fog",
      confidence: 0.92,
    };
  }

  if (
    content.includes("dust storm") ||
    content.includes("duststorm")
  ) {
    return {
      category: "Dust Storm",
      confidence: 0.91,
    };
  }

  if (
    content.includes("strong wind") ||
    content.includes("high wind") ||
    content.includes("storm wind")
  ) {
    return {
      category: "Strong Wind",
      confidence: 0.90,
    };
  }

  if (
    content.includes("rain") ||
    content.includes("rainfall") ||
    content.includes("heavy rain")
  ) {
    return {
      category: "Rainfall",
      confidence: 0.90,
    };
  }

  return {
    category: "Other",
    confidence: 0.50,
  };
}

module.exports = {
  classifyWeatherEvent,
};