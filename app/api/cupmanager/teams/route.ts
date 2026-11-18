import { NextRequest, NextResponse } from "next/server";

const TOURNAMENT_ID = 75678338;

const BASE_URL =
  "https://fotballfest.cupmanager.net/rest/results_api/call";

type ResponseItem = {
  entity?: {
    __typename?: string;
    id?: number;

    name?: {
      clubName?: string;
      fullName?: string;
      categoryName?: string;
      suffix?: string;
    };

    originalName?: string;
    shortName?: string;
  };
};

type CupManagerResponse = {
  responses?: Record<string, ResponseItem>;
};

type Team = {
  id: number;
  name: string;
  fullName: string | null;
  categoryName: string | null;
  suffix: string | null;
};

export async function GET(request: NextRequest) {
  const categoryIdParam =
    request.nextUrl.searchParams.get("categoryId");

  if (
    !categoryIdParam ||
    !/^\d+$/.test(categoryIdParam)
  ) {
    return NextResponse.json(
      {
        error: "Valid categoryId is required",
      },
      { status: 400 }
    );
  }

  const categoryId = Number(categoryIdParam);

  const call =
    `Category({categoryId:${categoryId},` +
    `tournamentId:${TOURNAMENT_ID}})` +
    `{teams:[{}]}`;

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
        { status: 502 }
      );
    }

    const data =
      JSON.parse(body) as CupManagerResponse;

    const responses = data.responses ?? {};

    const teams: Team[] = Object.entries(
      responses
    )
      .filter(([key, value]) => {
        return (
          key.startsWith("Team({id:") &&
          value?.entity?.__typename === "Team"
        );
      })
      .map(([key, value]) => {
        const entity = value.entity ?? {};
        const name = entity.name ?? {};

        const idFromKey = key.match(
          /Team\(\{id:(\d+)\}\)/
        )?.[1];

        const id =
          typeof entity.id === "number"
            ? entity.id
            : idFromKey
              ? Number(idFromKey)
              : null;

        const teamName =
          name.clubName ??
          name.fullName ??
          entity.originalName ??
          entity.shortName ??
          null;

        if (
          id === null ||
          teamName === null
        ) {
          return null;
        }

        return {
          id,
          name: teamName,
          fullName:
            name.fullName ?? null,
          categoryName:
            name.categoryName ?? null,
          suffix:
            name.suffix ?? null,
        };
      })
      .filter(
        (team): team is Team =>
          team !== null
      );

    const uniqueTeams = Array.from(
      new Map(
        teams.map((team) => [
          team.id,
          team,
        ])
      ).values()
    ).sort((a, b) =>
      a.name.localeCompare(b.name, "nb")
    );

    return NextResponse.json({
      ok: true,
      tournament: "Fotballfest 2026",
      tournamentId: TOURNAMENT_ID,
      categoryId,
      count: uniqueTeams.length,
      teams: uniqueTeams,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown CupManager error",
        categoryId,
      },
      { status: 500 }
    );
  }
}
