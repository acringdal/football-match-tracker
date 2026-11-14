import { NextResponse } from "next/server";

const CUPMANAGER_URL =
  "https://fotballfest.cupmanager.net/rest/results_api/call?call=Stage%28%7BcategoryId%3A75678349%2CstageId%3A75678335%2CtournamentId%3A75678338%7D%29%7Bcategory%3A%7B%7D%2Cdivisions%3A%5B%7B...+on+Conference%3A%7Btable%3A%7Brows%3A%5B%7Bteam%3A%7Bclub%3A%7Bnation%3A%7B%7D%7D%7D%7D%5D%7D%7D%2C...+on+Playoff%3A%7B%7D%7D%5D%2Cmatches%3A%5B%7B...+on+Match%3A%7Barena%3A%7B%7D%2Caway%3A%7Bteam%3A%7Bclub%3A%7Bnation%3A%7B%7D%7D%7D%7D%2Cdivision%3A%7Bcategory%3A%7B%7D%2Cstage%3A%7Bname%3A%7B%7D%7D%7D%2Chome%3A%7Bteam%3A%7Bclub%3A%7Bnation%3A%7B%7D%7D%7D%7D%2Cprotests%3A%5B%7B%7D%5D%2Cresult%3A%7B%7D%2CroundName%3A%7B%7D%2Cstage%3A%7B%7D%2Cvideo%3A%7B%7D%7D%7D%5D%2Cname%3A%7B%7D%2CnextStages%3A%5B%7Bname%3A%7B%7D%7D%5D%2CpreviousStages%3A%5B%7Bname%3A%7B%7D%7D%5D%2Cstatistics%3A%7B%7D%7D&lang=nb&tournamentId=75678338";

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

    return NextResponse.json({
      ok: response.ok,
      cupManagerStatus: response.status,
      contentType: response.headers.get("content-type"),
      preview: body.slice(0, 20000),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unknown request error",
      },
      { status: 500 }
    );
  }
}
