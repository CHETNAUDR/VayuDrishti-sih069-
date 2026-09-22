const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { GoogleGenAI } = require("@google/genai");

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

function getMimeType(filePath) {
  const extension = path.extname(filePath).toLowerCase();

  const mimeTypes = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".heif": "image/heif",
  };

  return mimeTypes[extension] || "image/jpeg";
}

async function verifyWeatherImage({
  imagePath,
  eventCategory,
  title,
  description,
}) {
  if (!imagePath) {
    return {
      success: true,
      is_weather_related: true,
      confidence: 1,
      weather_event_type: null,
      reason: "No image was provided.",
    };
  }

  if (!fs.existsSync(imagePath)) {
    throw new Error("Uploaded image file was not found.");
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured.");
  }

  const imageData = fs.readFileSync(imagePath, {
    encoding: "base64",
  });

  const mimeType = getMimeType(imagePath);

  const prompt = `
You are the image verification module of VayuDrishti,
a national weather reporting platform.

Determine whether this uploaded image actually shows
a weather-related event.

Allowed weather categories:

rainfall
thunderstorm
flooding
heatwave
fog
dust storm
strong winds

The image can also be unrelated, such as:
- normal scenery
- people
- buildings
- vehicles
- rooms
- screenshots
- documents
- unrelated objects

Submitted report information:

Event category: ${eventCategory || "unknown"}
Title: ${title || "unknown"}
Description: ${description || "unknown"}

IMPORTANT:
Judge primarily from the actual visual content of the image.
Do not assume the image is weather-related just because
the report description says it is.

Return ONLY valid JSON:

{
  "is_weather_related": true,
  "confidence": 0.95,
  "weather_event_type": "rainfall",
  "reason": "Visible rainfall is present in the image."
}

Rules:

- is_weather_related must be true or false.
- confidence must be between 0 and 1.
- weather_event_type must be one of:
  rainfall, thunderstorm, flooding, heatwave,
  fog, dust storm, strong winds, other
- If clearly unrelated to weather, return false.
- If uncertain, return false with lower confidence.
- Do not invent visual evidence.
`;

  const interaction = await ai.interactions.create({
    model: "gemini-3.8-flash",

    input: [
      {
        type: "text",
        text: prompt,
      },
      {
        type: "image",
        data: imageData,
        mime_type: mimeType,
      },
    ],

    response_format: {
      type: "text",
      mime_type: "application/json",
    },
  });

  const text = interaction.output_text;

  if (!text) {
    throw new Error("Gemini returned an empty response.");
  }

  let result;

  try {
    result = JSON.parse(text);
  } catch (error) {
    console.error("Gemini raw response:", text);

    throw new Error(
      "Gemini returned invalid JSON."
    );
  }

  return {
    success: true,

    is_weather_related:
      result.is_weather_related === true,

    confidence: Number(result.confidence || 0),

    weather_event_type:
      result.weather_event_type || "other",

    reason:
      result.reason ||
      "No explanation returned.",
  };
}

module.exports = {
  verifyWeatherImage,
};