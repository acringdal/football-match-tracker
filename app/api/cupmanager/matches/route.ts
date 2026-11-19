import { NextRequest, NextResponse } from "next/server";

const TOURNAMENT_ID = 75678338;

const BASE_URL =
  "https://fotballfest.cupmanager.net/rest/results_api/call";

type RecordValue = Record<string, unknown>;

type TeamSummary = {
  id: number | null;
  name: string;
  winnerOfMatch?: string | null;
  qualificationLabel?: string | null;
};

type ArenaSummary = {
  id: number | null;
  name: string | null;
  locationId: number | null;
};

type ScoreSummary = {
  home: number;
  away: number;
  for: number | null;
  against: number | null;
  penalties: boolean;
  walkover: boolean;
};

type MatchSummary = {
  id: number;
  matchNumber: string | null;

  selectedTeam: TeamSummary;
  opponent: TeamSummary;

  homeTeam: TeamSummary;
  awayTeam: TeamSummary;

  homeAway: "home" | "away" | "unknown";

  start: number | null;
  end: number | null;
  duration: number | null;

  arena: ArenaSummary;

  score: ScoreSummary | null;

  live: boolean;
  finished: boolean;
  scheduled: boolean;

  status: "live" | "played" | "upcoming";

  group: string | null;
  stageName: string | null;
  roundName: string | null;
  competitionLabel: string | null;

  nextMatchWinner: string | null;
  nextMatchLoser: string | null;
};

function isRecord(
  value: unknown
): value is RecordValue {
  return (
    typeof value === "object" &&
    value !== null
  );
}

function getString(
  value: unknown,
  key: string
): string | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const item = value[key];

  return typeof item === "string"
    ? item
    : undefined;
}

function getNumber(
  value: unknown,
  key: string
): number | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const item = value[key];

  return typeof item === "number"
    ? item
    : undefined;
}

function getBoolean(
  value: unknown,
  key: string
): boolean | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const item = value[key];

  return typeof item === "boolean"
    ? item
    : undefined;
}

function getRecord(
  value: unknown,
  key: string
): RecordValue | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const item = value[key];

  return isRecord(item)
    ? item
    : undefined;
}

function getHref(
  value: unknown,
  key: string
): string | undefined {
  const reference =
    getRecord(value, key);

  return getString(
    reference,
    "href"
  );
}

function getEntity(
  responses: RecordValue,
  reference: string | undefined
): RecordValue | undefined {
  if (!reference) {
    return undefined;
  }

  const item =
    responses[reference];

  if (!isRecord(item)) {
    return undefined;
  }

  const entity = item.entity;

  return isRecord(entity)
    ? entity
    : undefined;
}

function extractIdFromReference(
  reference: string | undefined,
  pattern: RegExp
): number | null {
  if (!reference) {
    return null;
  }

  const match =
    reference.match(pattern);

  if (!match?.[1]) {
    return null;
  }

  const id = Number(match[1]);

  return Number.isFinite(id)
    ? id
    : null;
}

function getLocalizedText(
  value: unknown
): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  return (
    getString(value, "nb") ??
    getString(value, "en") ??
    getString(value, "no") ??
    Object.values(value).find(
      (item): item is string =>
        typeof item === "string"
    )
  );
}

function getTeamName(
  entity: RecordValue | undefined
): string | null {
  if (!entity) {
    return null;
  }

  const name =
    getRecord(entity, "name");

  return (
    getString(name, "clubName") ??
    getString(name, "fullName") ??
    getLocalizedText(name) ??
    getString(
      entity,
      "originalName"
    ) ??
    getString(
      entity,
      "shortName"
    ) ??
    null
  );
}

function getWinnerMatchNumber(
  name: string | null
): string | null {
  if (!name) {
    return null;
  }

  const match = name.match(
    /^(?:Vinn\.?|Winner(?: of)?(?: match)?)[\s#]*(\d+)$/i
  );

  return match?.[1] ?? null;
}

function getTeamFromActor(
  actorEntity: RecordValue | undefined,
  responses: RecordValue
): TeamSummary {
  if (!actorEntity) {
    return {
      id: null,
      name: "To be decided",
      winnerOfMatch: null,
      qualificationLabel: null,
    };
  }

  const teamReference =
    getHref(actorEntity, "team");

  const teamEntity =
    getEntity(
      responses,
      teamReference
    );

  const teamId =
    getNumber(teamEntity, "id") ??
    extractIdFromReference(
      teamReference,
      /Team\(\{id:(\d+)\}\)/
    );

  const actorName =
    getLocalizedText(
      actorEntity.name
    );

  const teamName =
    getTeamName(teamEntity) ??
    actorName ??
    getString(
      actorEntity,
      "originalName"
    ) ??
    getString(
      actorEntity,
      "shortName"
    ) ??
    "To be decided";

  return {
    id: teamId,
    name: teamName,
    winnerOfMatch:
      getWinnerMatchNumber(
        teamName
      ),
    qualificationLabel: null,
  };
}

function getSelectedTeam(
  responses: RecordValue,
  teamId: number
): TeamSummary {
  const reference =
    `Team({id:${teamId}})`;

  const entity =
    getEntity(
      responses,
      reference
    );

  return {
    id: teamId,
    name:
      getTeamName(entity) ??
      `Team ${teamId}`,
  };
}

function getArena(
  matchEntity: RecordValue,
  responses: RecordValue
): ArenaSummary {
  const arenaReference =
    getHref(
      matchEntity,
      "arena"
    );

  const arenaEntity =
    getEntity(
      responses,
      arenaReference
    );

  const arenaId =
    getNumber(
      arenaEntity,
      "id"
    ) ??
    extractIdFromReference(
      arenaReference,
      /Arena\(\{id:(\d+)/
    );

  const locationReference =
    getHref(
      arenaEntity,
      "location"
    );

  const locationId =
    extractIdFromReference(
      locationReference,
      /Location\(\{id:(\d+)/
    );

  const arenaName =
    getString(
      arenaEntity,
      "completeName"
    ) ??
    getString(
      arenaEntity,
      "fieldName"
    ) ??
    getString(
      arenaEntity,
      "name"
    ) ??
    null;

  return {
    id: arenaId,
    name: arenaName,
    locationId,
  };
}

function getResult(
  matchEntity: RecordValue,
  responses: RecordValue,
  selectedTeamId: number,
  homeTeamId: number | null,
  awayTeamId: number | null
): ScoreSummary | null {
  const resultReference =
    getHref(
      matchEntity,
      "result"
    );

  const resultEntity =
    getEntity(
      responses,
      resultReference
    );

  if (!resultEntity) {
    return null;
  }

  const resultLive =
    getBoolean(
      resultEntity,
      "live"
    ) ?? false;

  const resultFinished =
    getBoolean(
      resultEntity,
      "finished"
    ) ?? false;

  if (
    !resultLive &&
    !resultFinished
  ) {
    return null;
  }

  const homeGoals =
    getNumber(
      resultEntity,
      "homeGoals"
    ) ?? 0;

  const awayGoals =
    getNumber(
      resultEntity,
      "awayGoals"
    ) ?? 0;

  const selectedIsHome =
    homeTeamId ===
    selectedTeamId;

  const selectedIsAway =
    awayTeamId ===
    selectedTeamId;

  let goalsFor: number | null =
    null;

  let goalsAgainst: number | null =
    null;

  if (selectedIsHome) {
    goalsFor = homeGoals;
    goalsAgainst = awayGoals;
  }

  if (selectedIsAway) {
    goalsFor = awayGoals;
    goalsAgainst = homeGoals;
  }

  return {
    home: homeGoals,
    away: awayGoals,
    for: goalsFor,
    against: goalsAgainst,

    penalties:
      getBoolean(
        resultEntity,
        "penalties"
      ) ?? false,

    walkover:
      getBoolean(
        resultEntity,
        "walkover"
      ) ?? false,
  };
}

function getReferenceText(
  entity: RecordValue,
  key: string,
  responses: RecordValue
): string | null {
  const directValue =
    entity[key];

  const directText =
    getLocalizedText(
      directValue
    );

  if (directText) {
    return directText;
  }

  const reference =
    getHref(entity, key);

  const referencedEntity =
    getEntity(
      responses,
      reference
    );

  if (!referencedEntity) {
    return null;
  }

  const referencedName =
    referencedEntity.name;

  return (
    getLocalizedText(
      referencedName
    ) ??
    getString(
      referencedEntity,
      "name"
    ) ??
    getString(
      referencedEntity,
      "title"
    ) ??
    null
  );
}

function getStatus(
  live: boolean,
  finished: boolean
): "live" | "played" | "upcoming" {
  if (live) {
    return "live";
  }

  if (finished) {
    return "played";
  }

  return "upcoming";
}

function getGroup(
  divisionName: string | null
): string | null {
  if (!divisionName) {
    return null;
  }

  const match =
    divisionName.match(
      /(?:Pulje|Group)\s+([A-ZÆØÅ0-9]+)/i
    );

  return (
    match?.[1]?.toUpperCase() ??
    null
  );
}

function normalizeRoundName(
  roundName: string | null
): string | null {
  if (!roundName) {
    return null;
  }

  const lower =
    roundName.toLowerCase();

  if (
    lower.includes("1/4") ||
    lower.includes("quarter")
  ) {
    return "Quarterfinal";
  }

  if (
    lower.includes("1/2") ||
    lower.includes("semi")
  ) {
    return "Semifinal";
  }

  if (
    lower === "final" ||
    lower.includes("finale")
  ) {
    return "Final";
  }

  return roundName;
}

function getCompetitionLabel(
  group: string | null,
  stageName: string | null,
  roundName: string | null
): string | null {
  const stageLower =
    stageName?.toLowerCase() ??
    "";

  if (
    group ||
    stageLower.includes("gruppe")
  ) {
    return group
      ? `Group ${group}`
      : "Group stage";
  }

  const normalizedRound =
    normalizeRoundName(
      roundName
    );

  let prefix = "";

  if (
    stageLower.includes(
      "sluttspill a"
    ) ||
    stageLower.includes(
      "playoff a"
    )
  ) {
    prefix = "A";
  }

  if (
    stageLower.includes(
      "sluttspill b"
    ) ||
    stageLower.includes(
      "playoff b"
    )
  ) {
    prefix = "B";
  }

  const label = [
    prefix,
    normalizedRound,
  ]
    .filter(Boolean)
    .join(" ");

  return label || null;
}

export async function GET(
  request: NextRequest
) {
  const teamIdParam =
    request.nextUrl.searchParams.get(
      "teamId"
    );

  if (
    !teamIdParam ||
    !/^\d+$/.test(
      teamIdParam
    )
  ) {
    return NextResponse.json(
      {
        error:
          "Valid teamId is required",
      },
      {
        status: 400,
      }
    );
  }

  const teamId =
    Number(teamIdParam);

  const call =
    `Team({id:${teamId}})` +
    `{matches:[{... on Match:{` +
    `arena:{},` +
    `away:{team:{club:{nation:{}}}},` +
    `division:{category:{},stage:{name:{}}},` +
    `home:{team:{club:{nation:{}}}},` +
    `nextMatchLoser:{},` +
    `nextMatchWinner:{},` +
    `result:{},` +
    `roundName:{},` +
    `stage:{}` +
    `}}],` +
    `extraMatches:[{matches:[{... on Match:{` +
    `arena:{},` +
    `away:{team:{club:{nation:{}}}},` +
    `division:{category:{},stage:{name:{}}},` +
    `home:{team:{club:{nation:{}}}},` +
    `nextMatchLoser:{},` +
    `nextMatchWinner:{},` +
    `result:{},` +
    `roundName:{},` +
    `stage:{}` +
    `}}]}]}`;

  const url =
    new URL(BASE_URL);

  url.searchParams.set(
    "call",
    call
  );

  url.searchParams.set(
    "lang",
    "nb"
  );

  url.searchParams.set(
    "tournamentId",
    String(
      TOURNAMENT_ID
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
              "Mozilla/5.0",
            Referer:
              "https://fotballfest.cupmanager.net/",
          },
          cache: "no-store",
        }
      );

    const body =
      await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "CupManager request failed",
          cupManagerStatus:
            response.status,
        },
        {
          status: 502,
        }
      );
    }

    const data: unknown =
      JSON.parse(body);

    const responses =
      isRecord(data) &&
      isRecord(
        data.responses
      )
        ? data.responses
        : {};

    const selectedTeam =
      getSelectedTeam(
        responses,
        teamId
      );

    const matches:
      MatchSummary[] = [];

    for (
      const [key, item]
      of Object.entries(
        responses
      )
    ) {
      if (
        !key.startsWith(
          "Match({id:"
        )
      ) {
        continue;
      }

      if (!isRecord(item)) {
        continue;
      }

      const entity =
        item.entity;

      if (!isRecord(entity)) {
        continue;
      }

      if (
        getString(
          entity,
          "__typename"
        ) !== "Match"
      ) {
        continue;
      }

      const id =
        getNumber(
          entity,
          "id"
        );

      if (!id) {
        continue;
      }

      const homeReference =
        getHref(
          entity,
          "home"
        );

      const awayReference =
        getHref(
          entity,
          "away"
        );

      const homeActor =
        getEntity(
          responses,
          homeReference
        );

      const awayActor =
        getEntity(
          responses,
          awayReference
        );

      const homeTeam =
        getTeamFromActor(
          homeActor,
          responses
        );

      const awayTeam =
        getTeamFromActor(
          awayActor,
          responses
        );

      let homeAway:
        | "home"
        | "away"
        | "unknown" =
          "unknown";

      let opponent =
        awayTeam;

      if (
        homeTeam.id ===
        teamId
      ) {
        homeAway = "home";
        opponent = awayTeam;
      } else if (
        awayTeam.id ===
        teamId
      ) {
        homeAway = "away";
        opponent = homeTeam;
      }

      const resultReference =
        getHref(
          entity,
          "result"
        );

      const resultEntity =
        getEntity(
          responses,
          resultReference
        );

      const live =
        getBoolean(
          resultEntity,
          "live"
        ) ??
        getBoolean(
          entity,
          "live"
        ) ??
        false;

      const finished =
        getBoolean(
          resultEntity,
          "finished"
        ) ??
        getBoolean(
          entity,
          "finished"
        ) ??
        false;

      const scheduled =
        getBoolean(
          entity,
          "isScheduled"
        ) ?? true;

      const divisionReference =
        getHref(
          entity,
          "division"
        );

      const divisionEntity =
        getEntity(
          responses,
          divisionReference
        );

      const divisionName =
        getLocalizedText(
          divisionEntity?.name
        ) ?? null;

      const group =
        getGroup(
          divisionName
        );

      const stageName =
        getReferenceText(
          entity,
          "stage",
          responses
        );

      const roundName =
        getReferenceText(
          entity,
          "roundName",
          responses
        );

      const competitionLabel =
        getCompetitionLabel(
          group,
          stageName,
          roundName
        );

      const matchNumberValue =
        entity.matchNr;

      const matchNumber =
        typeof matchNumberValue ===
          "string"
          ? matchNumberValue
          : typeof matchNumberValue ===
              "number"
            ? String(
                matchNumberValue
              )
            : null;

      matches.push({
        id,
        matchNumber,

        selectedTeam,
        opponent,

        homeTeam,
        awayTeam,

        homeAway,

        start:
          getNumber(
            entity,
            "start"
          ) ?? null,

        end:
          getNumber(
            entity,
            "end"
          ) ?? null,

        duration:
          getNumber(
            entity,
            "duration"
          ) ?? null,

        arena:
          getArena(
            entity,
            responses
          ),

        score:
          getResult(
            entity,
            responses,
            teamId,
            homeTeam.id,
            awayTeam.id
          ),

        live,
        finished,
        scheduled,

        status:
          getStatus(
            live,
            finished
          ),

        group,
        stageName,
        roundName,
        competitionLabel,

        nextMatchWinner:
          getHref(
            entity,
            "nextMatchWinner"
          ) ?? null,

        nextMatchLoser:
          getHref(
            entity,
            "nextMatchLoser"
          ) ?? null,
      });
    }

    const uniqueMatches =
      Array.from(
        new Map(
          matches.map(
            (match) => [
              match.id,
              match,
            ]
          )
        ).values()
      ).sort(
        (a, b) =>
          (a.start ?? 0) -
          (b.start ?? 0)
      );

    /*
     * Confirmed matches are matches in which the selected
     * favourite team is already assigned as home or away.
     */
    const confirmedMatches =
      uniqueMatches.filter(
        (match) =>
          match.homeAway !==
          "unknown"
      );

    /*
     * Qualification matches are unresolved future bracket
     * positions that the favourite may reach.
     */
    const possibleMatches =
      uniqueMatches.filter(
        (match) =>
          match.homeAway ===
            "unknown" &&
          match.status !==
            "played"
      );

    const liveMatches =
      confirmedMatches.filter(
        (match) =>
          match.status ===
          "live"
      );

    const upcomingMatches =
      confirmedMatches.filter(
        (match) =>
          match.status ===
          "upcoming"
      );

    const playedMatches =
      confirmedMatches
        .filter(
          (match) =>
            match.status ===
            "played"
        )
        .sort(
          (a, b) =>
            (b.start ?? 0) -
            (a.start ?? 0)
        );

    return NextResponse.json({
      ok: true,

      tournament:
        "Fotballfest 2026",

      tournamentId:
        TOURNAMENT_ID,

      team:
        selectedTeam,

      count:
        uniqueMatches.length,

      counts: {
        live:
          liveMatches.length,

        upcoming:
          upcomingMatches.length,

        played:
          playedMatches.length,

        possible:
          possibleMatches.length,
      },

      live:
        liveMatches,

      upcoming:
        upcomingMatches,

      played:
        playedMatches,

      possible:
        possibleMatches,

      matches:
        uniqueMatches,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown CupManager error",

        teamId,
      },
      {
        status: 500,
      }
    );
  }
}
