import {
  NextRequest,
  NextResponse,
} from "next/server";

import {
  getVenueByLocationId,
} from "../../../lib/venues";

const MET_API =
  "https://api.met.no/weatherapi/locationforecast/2.0/compact";

type RecordValue =
  Record<string, unknown>;

function isRecord(
  value: unknown
): value is RecordValue {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function getNumber(
  value: unknown,
  key: string
): number | null {
  if (!isRecord(value)) {
    return null;
  }

  const item = value[key];

  return typeof item === "number"
    ? item
    : null;
}

function getString(
  value: unknown,
  key: string
): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const item = value[key];

  return typeof item === "string"
    ? item
    : null;
}

function weatherEmoji(
  symbolCode: string | null
) {
  if (!symbolCode) {
    return "🌤️";
  }

  const symbol =
    symbolCode.toLowerCase();

  if (
    symbol.includes("thunder")
  ) {
    return "⛈️";
  }

  if (
    symbol.includes("snow") ||
    symbol.includes("sleet")
  ) {
    return "🌨️";
  }

  if (
    symbol.includes("rain")
  ) {
    return "🌧️";
  }

  if (
    symbol.includes("fog")
  ) {
    return "🌫️";
  }

  if (
    symbol.includes("cloudy")
  ) {
    return "☁️";
  }

  if (
    symbol.includes(
      "partlycloudy"
    )
  ) {
    return "⛅";
  }

  if (
    symbol.includes(
      "fair"
    )
  ) {
    return "🌤️";
  }

  if (
    symbol.includes(
      "clearsky"
    )
  ) {
    return "☀️";
  }

  return "🌤️";
}

export async function GET(
  request: NextRequest
) {
  const locationIdParam =
    request.nextUrl.searchParams.get(
      "locationId"
    );

  const timeParam =
    request.nextUrl.searchParams.get(
      "time"
    );

  if (
    !locationIdParam ||
    !/^\d+$/.test(
      locationIdParam
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Valid locationId is required",
      },
      {
        status: 400,
      }
    );
  }

  const locationId =
    Number(locationIdParam);

  const venue =
    getVenueByLocationId(
      locationId
    );

  if (!venue) {
    return NextResponse.json(
      {
        ok: false,
        available: false,
        reason:
          "Venue coordinates are not configured",
        locationId,
      }
    );
  }

  let targetTime =
    Date.now();

  if (timeParam) {
    const numericTime =
      Number(timeParam);

    if (
      Number.isFinite(
        numericTime
      )
    ) {
      targetTime =
        numericTime;
    }
  }

  const url =
    new URL(MET_API);

  url.searchParams.set(
    "lat",
    String(
      venue.latitude
    )
  );

  url.searchParams.set(
    "lon",
    String(
      venue.longitude
    )
  );

  try {
    const response =
      await fetch(
        url.toString(),
        {
          headers: {
            Accept:
              "application/json",

            "User-Agent":
              "fotballfest-match-tracker/1.0 https://football-match-tracker-liard.vercel.app",
          },

          next: {
            revalidate: 1800,
          },
        }
      );

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "Weather provider request failed",

          weatherStatus:
            response.status,
        },
        {
          status: 502,
        }
      );
    }

    const data: unknown =
      await response.json();

    if (!isRecord(data)) {
      throw new Error(
        "Invalid weather response"
      );
    }

    const properties =
      data.properties;

    if (
      !isRecord(
        properties
      )
    ) {
      throw new Error(
        "Weather response has no properties"
      );
    }

    const timeseries =
      properties.timeseries;

    if (
      !Array.isArray(
        timeseries
      ) ||
      timeseries.length === 0
    ) {
      return NextResponse.json({
        ok: true,
        available: false,
        reason:
          "No weather forecast available",
        locationId,
        venue:
          venue.name,
      });
    }

    let bestEntry:
      RecordValue | null =
        null;

    let bestDifference =
      Number.POSITIVE_INFINITY;

    for (
      const item
      of timeseries
    ) {
      if (
        !isRecord(item)
      ) {
        continue;
      }

      const time =
        getString(
          item,
          "time"
        );

      if (!time) {
        continue;
      }

      const forecastTime =
        new Date(
          time
        ).getTime();

      if (
        !Number.isFinite(
          forecastTime
        )
      ) {
        continue;
      }

      const difference =
        Math.abs(
          forecastTime -
            targetTime
        );

      if (
        difference <
        bestDifference
      ) {
        bestDifference =
          difference;

        bestEntry =
          item;
      }
    }

    if (!bestEntry) {
      return NextResponse.json({
        ok: true,
        available: false,
        reason:
          "No matching forecast time",
        locationId,
        venue:
          venue.name,
      });
    }

    const forecastTime =
      getString(
        bestEntry,
        "time"
      );

    const forecastData =
      bestEntry.data;

    if (
      !isRecord(
        forecastData
      )
    ) {
      throw new Error(
        "Forecast entry has no data"
      );
    }

    const instant =
      forecastData.instant;

    const instantDetails =
      isRecord(instant)
        ? instant.details
        : null;

    const temperature =
      getNumber(
        instantDetails,
        "air_temperature"
      );

    const windSpeed =
      getNumber(
        instantDetails,
        "wind_speed"
      );

    const next1Hours =
      forecastData.next_1_hours;

    const next1Summary =
      isRecord(next1Hours)
        ? next1Hours.summary
        : null;

    const next1Details =
      isRecord(next1Hours)
        ? next1Hours.details
        : null;

    const symbolCode =
      getString(
        next1Summary,
        "symbol_code"
      );

    const precipitation =
      getNumber(
        next1Details,
        "precipitation_amount"
      );

    return NextResponse.json({
      ok: true,
      available: true,

      provider:
        "MET Norway",

      locationId,

      venue:
        venue.name,

      coordinates: {
        latitude:
          venue.latitude,

        longitude:
          venue.longitude,
      },

      requestedTime:
        targetTime,

      forecastTime,

      temperature,

      windSpeed,

      precipitation,

      symbolCode,

      emoji:
        weatherEmoji(
          symbolCode
        ),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown weather error",

        locationId,
      },
      {
        status: 500,
      }
    );
  }
}
