import { NextResponse } from "next/server";

const TOURNAMENT_ID = "75678338";
const CATEGORY_ID = "75678349";
const STAGE_ID = "75678335";

const CUPMANAGER_API =
  "https://fotballfest.cupmanager.net/rest/results_api/call";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null;
}

function getNestedRecord(
  value: unknown,
  key: string
): UnknownRecord | undefined {
  if (!isRecord(value)) return undefined;

  const child = value[key];

  return isRecord(child) ? child : undefined;
}

function getString(
  value: unknown,
  key: string
): string | undefined {
  if (!isRecord(value)) return undefined;

  const child = value[key];

  return typeof child === "string" ? child : undefined;
}

function getNumber(
  value: unknown,
  key: string
): number | undefined {
  if (!isRecord(value)) return undefined;

  const child = value[key];

  return typeof child === "number" ? child : undefined;
}

function collectTeamEntities(value: unknown): UnknownRecord[] {
  const teams: UnknownRecord[] = [];

  function walk(node: unknown) {
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }

    if (!isRecord(node)) return;

    const typename = getString(node, "__typename");

    if (typename === "Team") {
      teams.push(node);
    }

    Object.values(node).forEach(walk);
  }

  walk(value);

  return teams;
}

export async function GET() {
  try {
    const call =
      `Stage({categoryId:${CATEGORY_ID},` +
      `stageId:${STAGE_ID},` +
      `tournamentId:${TOURNAMENT_ID}})` +
      `{category:{},` +
      `divisions:[{... on Conference:{table:{rows:[{team:{club:{nation:{}}}}]}}},` +
      `... on Playoff:{}}],` +
      `matches:[{... on Match:{arena:{},away:{team:{club:{nation:{}}}},` +
      `division:{category:{},stage:{name:{}}},` +
      `home:{team:{club:{nation:{}}}},` +
      `protests:[{}],result:{},roundName:{},stage:{},video:{}}}],` +
      `name:{},nextStages:[{name:{}}],previousStages:[{name:{}}],statistics:{}}`;

    const url = new URL(CUPMANAGER_API);

    url.searchParams.set("call", call);
    url.searchParams.set("lang", "nb");
    url.searchParams.set("tournamentId", TOURNAMENT_ID);

    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
      },
      next: {
        revalidate: 60,
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "CupManager request failed",
          status: response.status,
        },
        { status: 502 }
      );
    }

    const data: unknown = await response.json();

    const entities = collectTeamEntities(data);

    const teams = entities
      .map((team) => {
        const name = getNestedRecord(team, "name");

        return {
          id: getNumber(team, "id"),
          name:
            getString(name, "clubName") ??
            getString(name, "fullName") ??
            getString(name, "categoryName"),
          fullName: getString(name, "fullName"),
          categoryName: getString(name, "categoryName"),
          suffix: getString(name, "suffix"),
        };
      })
      .filter(
        (team): team is {
          id: number;
          name: string;
          fullName: string | undefined;
          categoryName: string | undefined;
          suffix: string | undefined;
        } =>
          typeof team.id === "number" &&
          typeof team.name === "string"
      );

    const uniqueTeams = Array.from(
      new Map(teams.map((team) => [team.id, team])).values()
    ).sort((a, b) =>
      a.name.localeCompare(b.name, "nb")
    );

    return NextResponse.json({
      tournamentId: Number(TOURNAMENT_ID),
      categoryId: Number(CATEGORY_ID),
      stageId: Number(STAGE_ID),
      count: uniqueTeams.length,
      teams: uniqueTeams,
    });
  } catch (error) {
    console.error("CupManager teams error:", error);

    return NextResponse.json(
      {
        error: "Unable to retrieve CupManager teams",
      },
      { status: 500 }
    );
  }
}
