import { NextRequest, NextResponse } from "next/server";

const TOURNAMENT_ID = 75678338;

export async function GET(request: NextRequest) {
  const categoryId = request.nextUrl.searchParams.get("categoryId");

  if (!categoryId || !/^\d+$/.test(categoryId)) {
    return NextResponse.json(
      { error: "Valid categoryId is required" },
      { status: 400 }
    );
  }

  const call =
    `Category({categoryId:${categoryId},` +
    `tournamentId:${TOURNAMENT_ID}})` +
    `{stages:[{}]}`;

  const url = new URL(
    "https://fotballfest.cupmanager.net/rest/results_api/call"
  );

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

    const data = JSON.parse(body);

    return NextResponse.json({
      ok: true,
      categoryId: Number(categoryId),
      responses: data.responses ?? {},
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
