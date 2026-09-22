const exifr = require("exifr");

const LOCATION_TOLERANCE_KM = 10;

// Photo aur reported event ke beech maximum acceptable time gap
const TIME_TOLERANCE_HOURS = 24;

// ------------------------------------------
// DISTANCE CALCULATION
// ------------------------------------------

function distanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat =
    ((lat2 - lat1) * Math.PI) / 180;

  const dLon =
    ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return R * c;
}

// ------------------------------------------
// CITY / STATE GEOCODING
// ------------------------------------------
async function geocodeLocation(city, state) {
  if (!city) {
    return null;
  }

  const searches = [];

  // First: City + State
  if (state) {
    searches.push(
      `${city.trim()}, ${state.trim()}, India`
    );
  }

  // Fallback: City only
  searches.push(
    `${city.trim()}, India`
  );

  for (const query of searches) {
    const url =
      `https://nominatim.openstreetmap.org/search` +
      `?format=jsonv2&limit=1&countrycodes=in` +
      `&q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent":
            "VayuDrishti-SIH26069/1.0",
          "Accept":
            "application/json",
        },
      });

      if (!response.ok) {
        continue;
      }

      const results =
        await response.json();

      if (results.length > 0) {
        return {
          latitude:
            Number(results[0].lat),

          longitude:
            Number(results[0].lon),

          displayName:
            results[0].display_name,
        };
      }
    } catch (error) {
      console.error(
        "Geocoding attempt failed:",
        error.message
      );
    }
  }

  return null;
}
// ------------------------------------------
// PHOTO EXIF DATA
// ------------------------------------------

async function extractPhotoMetadata(
  photoPath
) {
  try {
    const exif =
      await exifr.parse(photoPath, {
        gps: true,
        DateTimeOriginal: true,
        CreateDate: true,
        ModifyDate: true,
      });

    if (!exif) {
      return null;
    }

    const metadata = {
      latitude:
        typeof exif.latitude === "number"
          ? exif.latitude
          : null,

      longitude:
        typeof exif.longitude === "number"
          ? exif.longitude
          : null,

      photo_time:
        exif.DateTimeOriginal ||
        exif.CreateDate ||
        exif.ModifyDate ||
        null,
    };

    return metadata;
  } catch (error) {
    console.error(
      "Photo EXIF extraction error:",
      error
    );

    return null;
  }
}

// ------------------------------------------
// PHOTO TIME DIFFERENCE
// ------------------------------------------

function getTimeDifferenceHours(
  photoTime,
  eventTime
) {
  if (!photoTime || !eventTime) {
    return null;
  }

  const photoDate =
    new Date(photoTime);

  const eventDate =
    new Date(eventTime);

  if (
    Number.isNaN(photoDate.getTime()) ||
    Number.isNaN(eventDate.getTime())
  ) {
    return null;
  }

  const differenceMs =
    Math.abs(
      photoDate.getTime() -
        eventDate.getTime()
    );

  return differenceMs /
    (1000 * 60 * 60);
}

// ------------------------------------------
// MAIN VALIDATION
// ------------------------------------------

async function validateReportLocation({
  city,
  state,
  latitude,
  longitude,
  photoPath,
  event_time,
}) {
  const result = {
    status: "not_checked",
    message: "",

    entered: null,

    photo: null,

    api: null,

    distance_km: null,

    photo_time: null,

    time_difference_hours: null,
  };

  // ----------------------------------------
  // ENTERED GPS
  // ----------------------------------------

  if (
    latitude != null &&
    longitude != null
  ) {
    result.entered = {
      latitude: Number(latitude),
      longitude: Number(longitude),
    };
  }

  // ----------------------------------------
  // CITY / STATE VALIDATION
  // ----------------------------------------

  const geocoded =
    await geocodeLocation(
      city,
      state
    );

  if (!geocoded) {
    result.status =
      "invalid_location";

    result.message =
      "The entered city/state could not be validated.";

    return result;
  }

  result.api = geocoded;

  // ----------------------------------------
  // ENTERED GPS VS CITY
  // ----------------------------------------

  if (result.entered) {
    const apiDistance =
      distanceKm(
        result.entered.latitude,
        result.entered.longitude,
        result.api.latitude,
        result.api.longitude
      );

    if (
      apiDistance >
      LOCATION_TOLERANCE_KM
    ) {
      result.status =
        "location_mismatch";

      result.distance_km =
        Number(
          apiDistance.toFixed(2)
        );

      result.message =
        `Entered coordinates are ${result.distance_km} km ` +
        `away from the selected city/state.`;

      return result;
    }
  }

  // ----------------------------------------
  // PHOTO EXIF VALIDATION
  // ----------------------------------------

  if (photoPath) {
    const photoMetadata =
      await extractPhotoMetadata(
        photoPath
      );

    if (photoMetadata) {
      result.photo = {
        latitude:
          photoMetadata.latitude,

        longitude:
          photoMetadata.longitude,
      };

      result.photo_time =
        photoMetadata.photo_time;

      // --------------------------------------
      // PHOTO GPS VS CITY
      // --------------------------------------

      if (
        photoMetadata.latitude !== null &&
        photoMetadata.longitude !== null
      ) {
        const photoDistance =
          distanceKm(
            photoMetadata.latitude,
            photoMetadata.longitude,
            result.api.latitude,
            result.api.longitude
          );

        result.distance_km =
          Number(
            photoDistance.toFixed(2)
          );

        if (
          photoDistance >
          LOCATION_TOLERANCE_KM
        ) {
          result.status =
            "photo_location_mismatch";

          result.message =
            `Photo GPS is ${result.distance_km} km away ` +
            `from the entered location.`;

          return result;
        }
      }

      // --------------------------------------
      // PHOTO TIME VS EVENT TIME
      // --------------------------------------

      if (
        photoMetadata.photo_time &&
        event_time
      ) {
        const timeDifference =
          getTimeDifferenceHours(
            photoMetadata.photo_time,
            event_time
          );

        if (
          timeDifference !== null
        ) {
          result.time_difference_hours =
            Number(
              timeDifference.toFixed(2)
            );

          if (
            timeDifference >
            TIME_TOLERANCE_HOURS
          ) {
            result.status =
              "photo_time_mismatch";

            result.message =
              `Photo capture time differs from ` +
              `reported event time by ` +
              `${result.time_difference_hours} hours.`;

            return result;
          }
        }
      }

      // --------------------------------------
      // EVERYTHING PASSED
      // --------------------------------------

      result.status = "verified";

      result.message =
        "Location, photo GPS and photo timing are consistent.";

      return result;
    }
  }

  // ----------------------------------------
  // NO PHOTO EXIF
  // ----------------------------------------

  result.status =
    "verified_without_photo_gps";

  result.message =
    "Location API validation passed, but the photo does not contain usable GPS/time metadata.";

  return result;
}

module.exports = {
  validateReportLocation,
  distanceKm,
};