import { NextRequest, NextResponse } from "next/server";

const TOURNAMENT_ID = 75678338;

const BASE_URL =
  "https://fotballfest.cupmanager.net/rest/results_api/call";

type ResponseItem = {
  entity?: {
    __typename?: string;
    id?: number;
    start?: number;
    end?: number;
    duration?: number;
    live?: boolean;
    finished?: boolean;
  };
};

type CupManagerResponse = {
  responses?: Record<string, ResponseItem>;
};

type Match = {
  id: number;
  start: number | null;
  end: number | null;
  duration: number | null;
  live: boolean;
  finished: boolean;
};

export async function GET(request: NextRequest) {
  const teamIdParam =
    request.nextUrl.searchParams.get("teamId");

  if (
    !teamIdParam ||
    !/^\d+$/.test(teamIdParam)
  ) {
    return NextResponse.json(
      {
        error: "Valid teamId is required",
      },
      {
        status: 400,
      }
    );
  }

  const teamId = Number(teamIdParam);

  const call =
    `Team({id:${teamId}})` +
    `{matches:[{... on Match:{` +
    `arena:{},` +
    `away:{team:{}},` +
    `division:{category:{},stage:{name:{}}},` +
    `home:{team:{}},` +
    `result:{},` +
    `roundName:{},` +
    `stage:{}` +
    `}}],` +
    `extraMatches:[{matches:[{... on Match:{` +
    `arena:{},` +
    `away:{team:{}},` +
    `division:{category:{},stage:{name:{}}},` +
    `home:{team:{}},` +
    `result:{},` +
    `roundName:{},` +
    `stage:{}` +
    `}}]}]}`;

  const url = new URL(BASE_URL);

  url.searchParams.set("call", call);
  url.searchParams.set("lang", "nb");
  url.searchParams.set(
    "tournamentId",
    String(TOURNAMENT_ID)
  );

  try {
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
        Referer: "https://fotballfest.cupmanager.net/",
      },
      cache: "no-store",
    });

    const body = await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "CupManager request failed",
          cupManagerStatus: response.status,
        },
        {
          status: 502,
        }
      );
    }

    const data =
      JSON.parse(body) as CupManagerResponse;

    const responses = data.responses ?? {};

    const matches: Match[] = Object.entries(
      responses
    )
      .filter(([key, value]) => {
        return (
          key.startsWith("Match({id:") &&
          value?.entity?.__typename === "Match"
        );
      })
      .map(([key, value]) => {
        const entity = value.entity ?? {};

        const idFromKey = key.match(
          /Match\(\{id:(\d+)\}\)/
        )?.[1];

        const id =
          typeof entity.id === "number"
            ? entity.id
            : idFromKey
              ? Number(idFromKey)
              : null;

        if (id === null) {
          return null;
        }

        return {
          id,
          start:
            typeof entity.start === "number"
              ? entity.start
              : null,
          end:
            typeof entity.end === "number"
              ? entity.end
              : null,
          duration:
            typeof entity.duration === "number"
              ? entity.duration
              : null,
          live:
            entity.live === true,
          finished:
            entity.finished === true,
        };
      })
      .filter(
        (match): match is Match =>
          match !== null
      );

    const uniqueMatches = Array.from(
      new Map(
        matches.map((match) => [
          match.id,
          match,
        ])
      ).values()
    ).sort(
      (a, b) =>
        (a.start ?? 0) -
        (b.start ?? 0)
    );

    return NextResponse.json({
      ok: true,
      tournament: "Fotballfest 2026",
      tournamentId: TOURNAMENT_ID,
      teamId,
      count: uniqueMatches.length,
      matches: uniqueMatches,
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
