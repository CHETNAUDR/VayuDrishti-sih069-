const https = require("https");
const { parse } = require("url");

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (resp) => {
        let data = "";

        resp.on("data", (chunk) => (data += chunk));
        resp.on("end", () => {
          if (resp.statusCode && resp.statusCode >= 200 && resp.statusCode < 300) {
            resolve(data);
          } else {
            reject(new Error(`Request failed with status ${resp.statusCode}`));
          }
        });
      })
      .on("error", reject);
  });
}

function parseRssItems(xml) {
  // Very permissive/simple XML parsing to extract <item> blocks
  const items = [];

  const itemMatches = xml.match(/<item[\s\S]*?<\/item>/gi) || [];

  for (const item of itemMatches) {
    const title = (item.match(/<title>([\s\S]*?)<\/title>/i) || [null, ""])[1].trim();
    const description = (item.match(/<description>([\s\S]*?)<\/description>/i) || [null, ""])[1].trim();
    const pubDate = (item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) || [null, ""])[1].trim();
    const link = (item.match(/<link>([\s\S]*?)<\/link>/i) || [null, ""])[1].trim();

    items.push({
      title,
      description,
      pubDate,
      link,
    });
  }

  return items;
}

async function getAlerts() {
  const imdUrl = process.env.IMD_ALERTS_URL || "";

  if (!imdUrl) {
    return {
      success: false,
      message: "IMD alerts URL not configured",
      alerts: [],
    };
  }

  try {
    const xml = await fetchUrl(imdUrl);

    const items = parseRssItems(xml);

    const alerts = items.map((it) => ({
      title: it.title,
      description: it.description,
      issue_time: it.pubDate,
      source: "IMD RSS",
      url: it.link,
    }));

    return {
      success: true,
      source: "IMD",
      count: alerts.length,
      alerts,
    };
  } catch (err) {
    return {
      success: false,
      message: `Failed to fetch IMD alerts: ${err.message}`,
      alerts: [],
    };
  }
}

module.exports = {
  getAlerts,
};
