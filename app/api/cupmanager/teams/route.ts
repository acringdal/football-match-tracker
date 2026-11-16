import { NextResponse } from "next/server";

const CUPMANAGER_URL =
  "https://fotballfest.cupmanager.net/rest/results_api/call?call=Stage%28%7BcategoryId%3A75678349%2CstageId%3A75678335%2CtournamentId%3A75678338%7D%29%7Bcategory%3A%7B%7D%2Cdivisions%3A%5B%7B...+on+Conference%3A%7Btable%3A%7Brows%3A%5B%7Bteam%3A%7Bclub%3A%7Bnation%3A%7B%7D%7D%7D%7D%5D%7D%7D%2C...+on+Playoff%3A%7B%7D%7D%5D%2Cmatches%3A%5B%7B...+on+Match%3A%7Barena%3A%7B%7D%2Caway%3A%7Bteam%3A%7Bclub%3A%7Bnation%3A%7B%7D%7D%7D%7D%2Cdivision%3A%7Bcategory%3A%7B%7D%2Cstage%3A%7Bname%3A%7B%7D%7D%7D%2Chome%3A%7Bteam%3A%7Bclub%3A%7Bnation%3A%7B%7D%7D%7D%7D%2Cprotests%3A%5B%7B%7D%5D%2Cresult%3A%7B%7D%2CroundName%3A%7B%7D%2Cstage%3A%7B%7D%2Cvideo%3A%7B%7D%7D%7D%5D%2Cname%3A%7B%7D%2CnextStages%3A%5B%7Bname%3A%7B%7D%7D%5D%2CpreviousStages%3A%5B%7Bname%3A%7B%7D%7D%5D%2Cstatistics%3A%7B%7D%7D&lang=nb&tournamentId=75678338";

type CupManagerResponse = {
  responses?: Record<
    string,
    {
      entity?: {
        __typename?: string;
        id?: number;
        originalName?: string;
        shortName?: string;
        name?: {
          clubName?: string;
          fullName?: string;
          categoryName?: string;
          suffix?: string;
        };
      };
    }
  >;
};

type Team = {
  id: number;
  name: string;
  fullName: string | null;
  categoryName: string | null;
  suffix: string | null;
};

export async function GET() {
  try {
    const response = await fetch(CUPMANAGER_URL, {
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

    let data: CupManagerResponse;

    try {
      data = JSON.parse(body) as CupManagerResponse;
    } catch {
      return NextResponse.json(
        {
          error: "CupManager response could not be parsed",
          contentType: response.headers.get("content-type"),
          preview: body.slice(0, 500),
        },
        { status: 502 }
      );
    }

    const responses = data.responses ?? {};

    const teams: Team[] = Object.entries(responses)
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

        if (id === null || teamName === null) {
          return null;
        }

        return {
          id,
          name: teamName,
          fullName: name.fullName ?? null,
          categoryName: name.categoryName ?? null,
          suffix: name.suffix ?? null,
        };
      })
      .filter((team): team is Team => team !== null);

    const uniqueTeams = Array.from(
      new Map(
        teams.map((team) => [team.id, team])
      ).values()
    ).sort((a, b) => a.name.localeCompare(b.name, "nb"));

    return NextResponse.json({
      ok: true,
      tournament: "Fotballfest 2026",
      tournamentId: 75678338,
      category: {
        id: 75678349,
        gender: "Girls",
        age: 14,
      },
      stageId: 75678335,
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
      },
      { status: 500 }
    );
  }
}
