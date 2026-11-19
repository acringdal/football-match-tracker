import { NextResponse } from "next/server";

const TOURNAMENT_ID = 75678338;

const BASE_URL =
  "https://fotballfest.cupmanager.net/rest/results_api/call";

type RecordValue = Record<string, unknown>;

type Gender = "Girls" | "Boys";

type Category = {
  id: number;
  name: string;
  shortName: string;
  gender: Gender;
  age: number;
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

function mapGender(
  value: string | undefined
): Gender | null {
  const normalized =
    value?.trim().toLowerCase();

  if (
    normalized === "women" ||
    normalized === "female" ||
    normalized === "girls" ||
    normalized === "jenter"
  ) {
    return "Girls";
  }

  if (
    normalized === "men" ||
    normalized === "male" ||
    normalized === "boys" ||
    normalized === "gutter"
  ) {
    return "Boys";
  }

  return null;
}

export async function GET() {
  /*
   * Request the tournament and its categories.
   * CupManager resolves the linked Category entities
   * into the same responses object.
   */
  const call =
    `Tournament({id:${TOURNAMENT_ID}})` +
    `{categories:[{}]}`;

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
    String(TOURNAMENT_ID)
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
      isRecord(data.responses)
        ? data.responses
        : {};

    const categories: Category[] =
      Object.entries(responses)
        .filter(([key, item]) => {
          if (
            !key.startsWith(
              "Category({"
            ) ||
            !isRecord(item) ||
            !isRecord(item.entity)
          ) {
            return false;
          }

          return (
            getString(
              item.entity,
              "__typename"
            ) === "Category"
          );
        })
        .map(([, item]) => {
          if (
            !isRecord(item) ||
            !isRecord(item.entity)
          ) {
            return null;
          }

          const entity =
            item.entity;

          const id =
            getNumber(entity, "id");

          const name =
            getString(entity, "name");

          const shortName =
            getString(
              entity,
              "shortName"
            );

          const age =
            getNumber(entity, "age");

          const gender =
            mapGender(
              getString(
                entity,
                "gender"
              )
            );

          if (
            typeof id !== "number" ||
            !name ||
            !shortName ||
            typeof age !== "number" ||
            !gender
          ) {
            return null;
          }

          return {
            id,
            name,
            shortName,
            gender,
            age,
          };
        })
        .filter(
          (
            category
          ): category is Category =>
            category !== null
        )
        .filter(
          (category) =>
            [13, 14, 16].includes(
              category.age
            )
        )
        .sort((a, b) => {
          if (
            a.gender !== b.gender
          ) {
            return a.gender ===
              "Girls"
              ? -1
              : 1;
          }

          return a.age - b.age;
        });

    if (
      categories.length === 0
    ) {
      return NextResponse.json(
        {
          error:
            "No tournament categories were returned",

          tournamentId:
            TOURNAMENT_ID,
        },
        {
          status: 502,
        }
      );
    }

    const ages =
      Array.from(
        new Set(
          categories.map(
            (category) =>
              category.age
          )
        )
      ).sort(
        (a, b) => a - b
      );

    return NextResponse.json({
      ok: true,

      tournament:
        "Fotballfest 2026",

      tournamentId:
        TOURNAMENT_ID,

      count:
        categories.length,

      ages,

      categories,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown CupManager error",

        tournamentId:
          TOURNAMENT_ID,
      },
      {
        status: 500,
      }
    );
  }
}
