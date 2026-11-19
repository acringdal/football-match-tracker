"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Gender =
  | "Girls"
  | "Boys";

type MainTab =
  | "matches"
  | "qualification"
  | "teams";

type MatchesTab =
  | "live-upcoming"
  | "played";

type Category = {
  id: number;
  name: string;
  shortName: string;
  gender: Gender;
  age: number;
};

type Team = {
  id: number;
  name: string;
  fullName: string | null;
  categoryName: string | null;
  suffix: string | null;
};

type MatchTeam = {
  id: number | null;
  name: string | null;
  winnerOfMatch?: string | null;
  qualificationLabel?: string | null;
};

type MatchScore = {
  home: number;
  away: number;
  for: number | null;
  against: number | null;
  penalties: boolean;
  walkover: boolean;
};

type Match = {
  id: number;
  matchNumber?: string | null;

  selectedTeam?: {
    id: number;
    name: string;
  };

  opponent?: {
    id: number | null;
    name: string | null;
  };

  homeTeam?: MatchTeam;
  awayTeam?: MatchTeam;

  homeAway?:
    | "home"
    | "away"
    | "unknown";

  start: number | null;
  end: number | null;
  duration?: number | null;

  arena?: {
    id: number | null;
    name: string | null;
    locationId: number | null;
  } | null;

  score?: MatchScore | null;

  live?: boolean;
  finished?: boolean;
  scheduled?: boolean;

  status?:
    | "live"
    | "upcoming"
    | "played";

  group?: string | null;
  stageName?: string | null;
  roundName?: string | null;
  competitionLabel?: string | null;
};

type DisplayMatch =
  Match & {
    classLabel: string | null;
  };

type CategoriesResponse = {
  ok: boolean;
  categories?: Category[];
};

type TeamsResponse = {
  ok: boolean;
  categoryId: number;
  teams?: Team[];
};

type MatchesResponse = {
  ok: boolean;
  live?: Match[];
  upcoming?: Match[];
  played?: Match[];
  possible?: Match[];
};

type WeatherResponse = {
  ok: boolean;
  available: boolean;
  provider?: string;
  locationId?: number;
  venue?: string;

  coordinates?: {
    latitude: number;
    longitude: number;
  };

  requestedTime?: number;
  forecastTime?: string | null;

  temperature?: number | null;
  windSpeed?: number | null;
  precipitation?: number | null;

  symbolCode?: string | null;
  emoji?: string | null;
  reason?: string;
};

type TeamMatches = {
  team: Team;
  response: MatchesResponse;
};

const FAVOURITES_STORAGE_KEY =
  "fotballfest-favourites";

const TIME_ZONE =
  "Europe/Oslo";

function formatDay(
  timestamp: number | null
) {
  if (
    typeof timestamp !== "number"
  ) {
    return "DATE TBD";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      weekday: "long",
      day: "numeric",
      month: "long",
      timeZone: TIME_ZONE,
    }
  )
    .format(
      new Date(timestamp)
    )
    .toUpperCase();
}

function formatTime(
  timestamp: number | null
) {
  if (
    typeof timestamp !== "number"
  ) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: TIME_ZONE,
    }
  ).format(
    new Date(timestamp)
  );
}

function matchTime(
  match: Match
) {
  return `${formatTime(
    match.start
  )}–${formatTime(
    match.end
  )}`;
}

function displayTeamName(
  team:
    | MatchTeam
    | undefined,
  fallback = "TBD"
) {
  if (!team) {
    return fallback;
  }

  if (
    team.qualificationLabel
  ) {
    return `🏆 ${team.qualificationLabel}`;
  }

  if (
    team.winnerOfMatch
  ) {
    return `🏆 #${team.winnerOfMatch}`;
  }

  return (
    team.name ??
    fallback
  );
}

function getTeamClass(
  team: Team
) {
  const source = [
    team.categoryName,
    team.fullName,
    team.name,
  ]
    .filter(Boolean)
    .join(" ");

  const result =
    source.match(
      /\b([JG])\s*(\d{2})\b/i
    );

  if (!result) {
    return null;
  }

  return `${result[1].toUpperCase()}${result[2]}`;
}

function addClassLabel(
  matches:
    | Match[]
    | undefined,
  team: Team
): DisplayMatch[] {
  if (
    !Array.isArray(matches)
  ) {
    return [];
  }

  const classLabel =
    getTeamClass(team);

  return matches.map(
    (match) => ({
      ...match,
      classLabel,
    })
  );
}

function uniqueMatches(
  matches: DisplayMatch[]
) {
  return Array.from(
    new Map(
      matches.map(
        (match) => [
          match.id,
          match,
        ]
      )
    ).values()
  );
}

function groupByDay(
  matches: DisplayMatch[]
) {
  const groups =
    new Map<
      string,
      DisplayMatch[]
    >();

  for (
    const match
    of matches
  ) {
    const day =
      formatDay(match.start);

    const existing =
      groups.get(day) ?? [];

    existing.push(match);
    groups.set(
      day,
      existing
    );
  }

  return Array.from(
    groups.entries()
  );
}

function safeCompetitionLabel(
  value:
    | string
    | null
    | undefined
) {
  if (!value) {
    return null;
  }

  if (
    value.includes("Match(") ||
    value.includes("Stage(") ||
    value.includes("$")
  ) {
    return null;
  }

  return value;
}

function weatherEmoji(
  symbolCode:
    | string
    | null
    | undefined,
  fallback:
    | string
    | null
    | undefined
) {
  if (!symbolCode) {
    return (
      fallback ??
      "🌤️"
    );
  }

  const symbol =
    symbolCode.toLowerCase();

  if (
    symbol.includes(
      "thunder"
    )
  ) {
    return "⛈️";
  }

  if (
    symbol.includes(
      "snow"
    ) ||
    symbol.includes(
      "sleet"
    )
  ) {
    return "🌨️";
  }

  if (
    symbol.includes(
      "rain"
    )
  ) {
    return "🌧️";
  }

  if (
    symbol.includes(
      "fog"
    )
  ) {
    return "🌫️";
  }

  if (
    symbol.includes(
      "clearsky"
    )
  ) {
    return symbol.includes(
      "_night"
    )
      ? "🌙"
      : "☀️";
  }

  if (
    symbol.includes(
      "partlycloudy"
    )
  ) {
    return symbol.includes(
      "_night"
    )
      ? "🌙"
      : "⛅";
  }

  if (
    symbol.includes(
      "fair"
    )
  ) {
    return symbol.includes(
      "_night"
    )
      ? "🌙"
      : "🌤️";
  }

  if (
    symbol.includes(
      "cloudy"
    )
  ) {
    return "☁️";
  }

  return (
    fallback ??
    "🌤️"
  );
}

function googleMapsUrl(
  weather:
    | WeatherResponse
    | null
) {
  const latitude =
    weather
      ?.coordinates
      ?.latitude;

  const longitude =
    weather
      ?.coordinates
      ?.longitude;

  if (
    typeof latitude !==
      "number" ||
    typeof longitude !==
      "number"
  ) {
    return null;
  }

  const coordinates =
    `${latitude},${longitude}`;

  return (
    "https://www.google.com/maps/search/?api=1" +
    `&query=${encodeURIComponent(
      coordinates
    )}`
  );
}

function ScoreRows({
  match,
}: {
  match: DisplayMatch;
}) {
  if (!match.score) {
    return null;
  }

  const teamStyle = {
    minWidth: 0,
    fontWeight: 700,
    fontSize: "16px",
    lineHeight: 1.35,
    overflowWrap:
      "anywhere" as const,
  };

  const scoreStyle = {
    width: "34px",
    textAlign:
      "left" as const,
    fontWeight: 800,
    fontSize: "18px",
    fontVariantNumeric:
      "tabular-nums",
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
   
