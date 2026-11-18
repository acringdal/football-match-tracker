import { NextRequest, NextResponse } from "next/server";

const TOURNAMENT_ID = 75678338;

const BASE_URL =
  "https://fotballfest.cupmanager.net/rest/results_api/call";

type RecordValue = Record<string, unknown>;

function isRecord(value: unknown): value is RecordValue {
  return typeof value === "object" && value !== null;
}

function getString(
  value: unknown,
  key: string
): string | undefined {
  if (!isRecord(value)) return undefined;

  const item = value[key];

  return typeof item === "string"
    ? item
    : undefined;
}

function getNumber(
  value: unknown,
  key: string
): number | undefined {
  if (!isRecord(value)) return undefined;

  const item = value[key];

  return typeof item === "number"
    ? item
    : undefined;
}

function getBoolean(
  value: unknown,
  key: string
): boolean | undefined {
  if (!isRecord(value)) return undefined;

  const item = value[key];

  return typeof item === "boolean"
    ? item
    : undefined;
}

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

    const data = JSON.parse(body);

    const responses =
      isRecord(data) &&
      isRecord(data.responses)
        ? data.responses
        : {};

    const matches: Array<{
      id: number;
      start: number | null;
      end: number | null;
      duration: number | null;
      live: boolean;
      finished: boolean;
    }> = [];

    for (const [key, item] of Object.entries(responses)) {
      if (!key.startsWith("Match({id:")) {
        continue;
      }

      if (!isRecord(item)) {
        continue;
      }

      const entity = item.entity;

      if (!isRecord(entity)) {
        continue;
      }

      if (getString(entity, "__typename") !== "Match") {
        continue;
      }

      const id =
        getNumber(entity, "id");

      if (!id) {
        continue;
      }

      matches.push({
        id,
        start:
          getNumber(entity, "start") ??
          null,
        end:
          getNumber(entity, "end") ??
          null,
        duration:
          getNumber(entity, "duration") ??
          null,
        live:
          getBoolean(entity, "live") ??
          false,
        finished:
          getBoolean(entity, "finished") ??
          false,
      });
    }

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
