import { NextResponse } from "next/server";

const CUPMANAGER_URL =
  "https://fotballfest.cupmanager.net/rest/results_api/call?call=Tournament%28%7Bid%3A75678338%7D%29%24lotCategories%5B%7Bstatistics%3A%7B%7D%7D%5D&lang=nb&tournamentId=75678338";

type CategoryEntity = {
  __typename?: string;
  id?: number;
  name?: string;
  shortName?: string;
  gender?: string;
  age?: number;
};

type CupManagerResponse = {
  responses?: Record<
    string,
    {
      entity?: CategoryEntity;
    }
  >;
};

type Category = {
  id: number;
  name: string;
  shortName: string;
  gender: "Girls" | "Boys";
  age: number;
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

    const data = JSON.parse(body) as CupManagerResponse;

    const responses = data.responses ?? {};

    const categories: Category[] = Object.values(responses)
      .map((item) => item.entity)
      .filter(
        (entity): entity is Required<
          Pick<
            CategoryEntity,
            "__typename" | "id" | "name" | "shortName" | "gender" | "age"
          >
        > =>
          entity?.__typename === "Category" &&
          typeof entity.id === "number" &&
          typeof entity.name === "string" &&
          typeof entity.shortName === "string" &&
          typeof entity.gender === "string" &&
          typeof entity.age === "number"
      )
      .map((entity) => ({
        id: entity.id,
        name: entity.name,
        shortName: entity.shortName,
        gender:
          entity.gender === "women"
            ? ("Girls" as const)
            : ("Boys" as const),
        age: entity.age,
      }));

    const uniqueCategories = Array.from(
      new Map(
        categories.map((category) => [category.id, category])
      ).values()
    ).sort((a, b) => {
      if (a.gender !== b.gender) {
        return a.gender.localeCompare(b.gender);
      }

      return a.age - b.age;
    });

    const ages = Array.from(
      new Set(uniqueCategories.map((category) => category.age))
    ).sort((a, b) => a - b);

    return NextResponse.json({
      ok: true,
      tournament: "Fotballfest 2026",
      tournamentId: 75678338,
      count: uniqueCategories.length,
      ages,
      categories: uniqueCategories,
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
