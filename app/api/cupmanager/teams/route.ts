import { NextRequest, NextResponse } from "next/server";

const TOURNAMENT_ID = 75678338;

const BASE_URL =
  "https://fotballfest.cupmanager.net/rest/results_api/call";

type ResponseItem = {
  entity?: {
    __typename?: string;
    id?: number;
    type?: string;

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

async function callCupManager(call: string) {
  const url = new URL(BASE_URL);

  url.searchParams.set("call", call);
  url.searchParams.set("lang", "nb");
  url.searchParams.set(
    "tournamentId",
    String(TOURNAMENT_ID)
  );

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
    throw new Error(
      `CupManager request failed with status ${response.status}`
    );
  }

  return JSON.parse(body) as CupManagerResponse;
}

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

  try {
    // Step 1:
    // Ask CupManager which stages belong
    // to the selected category.
    const categoryCall =
      `Category({categoryId:${categoryId},` +
      `tournamentId:${TOURNAMENT_ID}})` +
      `{stages:[{}]}`;

    const categoryData =
      await callCupManager(categoryCall);

    const categoryResponses =
      categoryData.responses ?? {};

    // Step 2:
    // Find the stage that CupManager identifies
    // as the conference/group stage.
    const conferenceStage = Object.values(
      categoryResponses
    )
      .map((item) => item.entity)
      .find(
        (entity) =>
          entity?.__typename === "Stage" &&
          entity?.type === "conference" &&
          typeof entity?.id === "number"
      );

    if (!conferenceStage?.id) {
      return NextResponse.json(
        {
          error:
            "Could not find conference stage for category",
          categoryId,
        },
        { status: 404 }
      );
    }

    const stageId = conferenceStage.id;

    // Step 3:
    // Retrieve the selected category's
    // conference stage, including teams.
    const stageCall =
      `Stage({categoryId:${categoryId},` +
      `stageId:${stageId},` +
      `tournamentId:${TOURNAMENT_ID}})` +
      `{category:{},` +
      `divisions:[{... on Conference:{` +
      `table:{rows:[{team:{club:{nation:{}}}}]}}},` +
      `... on Playoff:{}}],` +
      `isSingleConference:{},` +
      `matches:[{... on Match:{` +
      `arena:{},` +
      `away:{team:{club:{nation:{}}}},` +
      `division:{category:{},stage:{name:{}}},` +
      `home:{team:{club:{nation:{}}}},` +
      `protests:[{}],` +
      `result:{},` +
      `roundName:{},` +
      `stage:{},` +
      `video:{}}}],` +
      `name:{},` +
      `nextStages:[{name:{}}],` +
      `previousStages:[{name:{}}],` +
      `statistics:{}}`;

    const stageData =
      await callCupManager(stageCall);

    const stageResponses =
      stageData.responses ?? {};

    // Step 4:
    // Extract all real Team entities returned
    // by CupManager.
    const teams: Team[] = Object.entries(
      stageResponses
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

    // Remove duplicates and sort alphabetically.
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
      stageId,
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
