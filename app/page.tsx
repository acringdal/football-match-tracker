"use client";

import { useEffect, useMemo, useState } from "react";

type Gender = "Girls" | "Boys";
type Tab = "matches" | "qualification" | "teams";
type MatchesTab = "live-upcoming" | "played";

type Category = {
  id: number;
  name: string;
  shortName: string;
  gender: Gender;
  age: number;
};

type Team = {
  id: number;
  name: string;
  fullName: string | null;
  categoryName: string | null;
  suffix: string | null;
};

type MatchTeam = {
  id: number | null;
  name: string | null;
  winnerOfMatch?: string | null;
  qualificationLabel?: string | null;
};

type MatchScore = {
  home: number;
  away: number;
  for: number | null;
  against: number | null;
  penalties: boolean;
  walkover: boolean;
};

type Match = {
  id: number;
  matchNumber?: string | null;

  selectedTeam?: {
    id: number;
    name: string;
  };

  opponent?: {
    id: number | null;
    name: string | null;
  };

  homeTeam?: MatchTeam;
  awayTeam?: MatchTeam;

  homeAway?: "home" | "away" | "unknown";

  start: number | null;
  end: number | null;
  duration?: number | null;

  arena?: {
    id: number | null;
    name: string | null;
    locationId: number | null;
  } | null;

  score?: MatchScore | null;

  live?: boolean;
  finished?: boolean;
  scheduled?: boolean;

  status?: "live" | "upcoming" | "played";

  group?: string | null;
  stageName?: string | null;
  roundName?: string | null;
  competitionLabel?: string | null;
};

type DisplayMatch = Match & {
  classLabel: string | null;
};

type CategoriesResponse = {
  ok: boolean;
  categories?: Category[];
};

type TeamsResponse = {
  ok: boolean;
  categoryId: number;
  teams?: Team[];
};

type MatchesResponse = {
  ok: boolean;
  live?: Match[];
  upcoming?: Match[];
  played?: Match[];
  possible?: Match[];
};

type TeamMatches = {
  team: Team;
  response: MatchesResponse;
};

const FAVOURITES_STORAGE_KEY =
  "fotballfest-favourites";

function formatDay(timestamp: number | null) {
  if (!timestamp) {
    return "DATE TBD";
  }

  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Oslo",
  })
    .format(new Date(timestamp))
    .toUpperCase();
}

function formatTime(timestamp: number | null) {
  if (!timestamp) {
    return "--:--";
  }

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Oslo",
  }).format(new Date(timestamp));
}

function matchTime(match: Match) {
  return `${formatTime(match.start)}–${formatTime(
    match.end
  )}`;
}

function displayTeamName(
  team: MatchTeam | undefined,
  fallback = "TBD"
) {
  if (!team) {
    return fallback;
  }

  if (team.qualificationLabel) {
    return `🏆 ${team.qualificationLabel}`;
  }

  if (team.winnerOfMatch) {
    return `🏆 #${team.winnerOfMatch}`;
  }

  return team.name ?? fallback;
}

function getTeamClass(team: Team) {
  const source = [
    team.categoryName,
    team.fullName,
    team.name,
  ]
    .filter(Boolean)
    .join(" ");

  const result = source.match(
    /\b([JG])\s*(\d{2})\b/i
  );

  if (!result) {
    return null;
  }

  return `${result[1].toUpperCase()}${result[2]}`;
}

function withClassLabel(
  matches: Match[] | undefined,
  team: Team
): DisplayMatch[] {
  if (!Array.isArray(matches)) {
    return [];
  }

  const classLabel =
    getTeamClass(team);

  return matches.map((match) => ({
    ...match,
    classLabel,
  }));
}

function uniqueMatches(
  matches: DisplayMatch[]
) {
  return Array.from(
    new Map(
      matches.map((match) => [
        match.id,
        match,
      ])
    ).values()
  );
}

function groupByDay(
  matches: DisplayMatch[]
) {
  const days =
    new Map<
      string,
      DisplayMatch[]
    >();

  for (const match of matches) {
    const day =
      formatDay(match.start);

    const existing =
      days.get(day) ?? [];

    existing.push(match);
    days.set(day, existing);
  }

  return Array.from(
    days.entries()
  );
}

function safeCompetitionLabel(
  value: string | null | undefined
) {
  if (!value) {
    return null;
  }

  if (
    value.includes("Match(") ||
    value.includes("Stage(") ||
    value.includes("$")
  ) {
    return null;
  }

  return value;
}

function ScoreRows({
  match,
}: {
  match: DisplayMatch;
}) {
  if (!match.score) {
    return null;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns:
          "minmax(0, 1fr) 34px",
        columnGap: "12px",
        rowGap: "5px",
        alignItems: "center",
        marginTop: "8px",
      }}
    >
      <div
        style={{
          minWidth: 0,
          fontWeight: 700,
          fontSize: "16px",
          lineHeight: 1.35,
          overflowWrap: "anywhere",
        }}
      >
        {displayTeamName(match.homeTeam)}
      </div>

      <div
        style={{
          width: "34px",
          textAlign: "left",
          fontWeight: 800,
          fontSize: "18px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {match.score.home}
      </div>

      <div
        style={{
          minWidth: 0,
          fontWeight: 700,
          fontSize: "16px",
          lineHeight: 1.35,
          overflowWrap: "anywhere",
        }}
      >
        {displayTeamName(match.awayTeam)}
      </div>

      <div
        style={{
          width: "34px",
          textAlign: "left",
          fontWeight: 800,
          fontSize: "18px",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {match.score.away}
      </div>
    </div>
  );
}

function MatchMeta({
  match,
}: {
  match: DisplayMatch;
}) {
  const competition =
    safeCompetitionLabel(
      match.competitionLabel
    );

  const primaryParts = [
    match.classLabel,
    competition,
  ].filter(
    (item): item is string =>
      Boolean(item)
  );

  if (
    primaryParts.length === 0 &&
    !match.matchNumber
  ) {
    return null;
  }

  return (
    <div
      style={{
        marginTop: "8px",
        fontSize: "14px",
        color: "#344054",
        lineHeight: 1.4,
      }}
    >
      {primaryParts.length > 0 && (
        <strong>
          {primaryParts.join(" · ")}
        </strong>
      )}

      {primaryParts.length > 0 &&
        match.matchNumber && (
          <span> · </span>
        )}

      {match.matchNumber && (
        <span
          style={{
            fontWeight: 400,
          }}
        >
          ⚽ #{match.matchNumber}
        </span>
      )}
    </div>
  );
}

function MatchCard({
  match,
  qualification = false,
}: {
  match: DisplayMatch;
  qualification?: boolean;
}) {
  const selectedTeamName =
    match.selectedTeam?.name ??
    "Favourite team";

  return (
    <article
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "14px",
        marginBottom: "10px",
        boxShadow:
          "0 1px 2px rgba(16,24,40,0.06)",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          color: "#344054",
          fontWeight: 700,
        }}
      >
        {match.live === true ? (
          <>
            <span
              style={{
                color: "#b42318",
              }}
            >
              🔴 LIVE
            </span>

            <span> · </span>

            <span>
              {matchTime(match)}
            </span>
          </>
        ) : (
          <span>
            {matchTime(match)}
          </span>
        )}
      </div>

      {match.score ? (
        <ScoreRows match={match} />
      ) : (
        <div
          style={{
            marginTop: "8px",
            fontWeight: 700,
            fontSize: "16px",
            lineHeight: 1.35,
            overflowWrap: "anywhere",
          }}
        >
          {displayTeamName(
            match.homeTeam
          )}

          {" – "}

          {displayTeamName(
            match.awayTeam
          )}
        </div>
      )}

      <MatchMeta match={match} />

      <div
        style={{
          marginTop: "5px",
          fontSize: "14px",
          color: "#667085",
        }}
      >
        📍{" "}
        {match.arena?.name ??
          "Venue TBD"}
      </div>

      {qualification && (
        <div
          style={{
            marginTop: "9px",
            color: "#166534",
            fontWeight: 600,
            fontSize: "13px",
          }}
        >
          ↓ {selectedTeamName} can reach this match
        </div>
      )}
    </article>
  );
}

export default function Home() {
  const [tab, setTab] =
    useState<Tab>("matches");

  const [
    matchesTab,
    setMatchesTab,
  ] =
    useState<MatchesTab>(
      "live-upcoming"
    );

  const [
    categories,
    setCategories,
  ] =
    useState<Category[]>([]);

  const [teams, setTeams] =
    useState<Team[]>([]);

  const [
    favourites,
    setFavourites,
  ] =
    useState<Team[]>([]);

  const [
    favouritesLoaded,
    setFavouritesLoaded,
  ] =
    useState(false);

  const [
    teamMatches,
    setTeamMatches,
  ] =
    useState<TeamMatches[]>([]);

  const [
    showTeamPicker,
    setShowTeamPicker,
  ] =
    useState(false);

  const [gender, setGender] =
    useState<Gender>("Girls");

  const [age, setAge] =
    useState<number>(14);

  const [search, setSearch] =
    useState("");

  const [
    categoriesLoading,
    setCategoriesLoading,
  ] =
    useState(true);

  const [
    teamsLoading,
    setTeamsLoading,
  ] =
    useState(false);

  const [
    matchesLoading,
    setMatchesLoading,
  ] =
    useState(false);

  const [error, setError] =
    useState("");

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          FAVOURITES_STORAGE_KEY
        );

      if (saved) {
        const parsed =
          JSON.parse(saved);

        if (
          Array.isArray(parsed)
        ) {
          setFavourites(parsed);
        }
      }
    } catch {
      localStorage.removeItem(
        FAVOURITES_STORAGE_KEY
      );
    } finally {
      setFavouritesLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!favouritesLoaded) {
      return;
    }

    localStorage.setItem(
      FAVOURITES_STORAGE_KEY,
      JSON.stringify(favourites)
    );
  }, [
    favourites,
    favouritesLoaded,
  ]);

  useEffect(() => {
    const controller =
      new AbortController();

    async function loadCategories() {
      try {
        setCategoriesLoading(true);
        setError("");

        const response =
          await fetch(
            "/api/cupmanager/categories",
            {
              cache: "no-store",
              signal:
                controller.signal,
            }
          );

        if (!response.ok) {
          throw new Error(
            "Could not load categories"
          );
        }

        const data:
          CategoriesResponse =
            await response.json();

        if (
          !controller.signal.aborted
        ) {
          setCategories(
            Array.isArray(
              data.categories
            )
              ? data.categories
              : []
          );
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        if (
          !controller.signal.aborted
        ) {
          setError(
            "Could not load Fotballfest categories."
          );
        }
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setCategoriesLoading(
            false
          );
        }
      }
    }

    loadCategories();

    return () => {
      controller.abort();
    };
  }, []);

  const availableAges =
    useMemo(() => {
      return Array.from(
        new Set(
          categories
            .filter(
              (category) =>
                category.gender === gender
            )
            .map(
              (category) =>
                category.age
            )
        )
      ).sort(
        (a, b) => a - b
      );
    }, [
      categories,
      gender,
    ]);

  const selectedCategory =
    useMemo(() => {
      return categories.find(
        (category) =>
          category.gender === gender &&
          category.age === age
      );
    }, [
      categories,
      gender,
      age,
    ]);

  useEffect(() => {
    if (
      !showTeamPicker ||
      !selectedCategory
    ) {
      setTeams([]);
      setTeamsLoading(false);
      return;
    }

    const controller =
      new AbortController();

    const categoryId =
      selectedCategory.id;

    async function loadTeams() {
      try {
        setTeamsLoading(true);
        setTeams([]);
        setSearch("");
        setError("");

        const response =
          await fetch(
            `/api/cupmanager/teams?categoryId=${categoryId}`,
            {
              cache: "no-store",
              signal:
                controller.signal,
            }
          );

        if (!response.ok) {
          throw new Error(
            "Could not load teams"
          );
        }

        const data:
          TeamsResponse =
            await response.json();

        if (
          !controller.signal.aborted &&
          data.categoryId ===
            categoryId
        ) {
          setTeams(
            Array.isArray(
              data.teams
            )
              ? data.teams
              : []
          );
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        if (
          !controller.signal.aborted
        ) {
          setTeams([]);
          setError(
            "Could not load teams."
          );
        }
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setTeamsLoading(false);
        }
      }
    }

    loadTeams();

    return () => {
      controller.abort();
    };
  }, [
    showTeamPicker,
    selectedCategory,
  ]);

  useEffect(() => {
    if (!favouritesLoaded) {
      return;
    }

    if (
      favourites.length === 0
    ) {
      setTeamMatches([]);
      setMatchesLoading(false);
      return;
    }

    const controller =
      new AbortController();

    async function loadMatches() {
      try {
        setMatchesLoading(true);
        setError("");

        const results =
          await Promise.all(
            favourites.map(
              async (team) => {
                const response =
                  await fetch(
                    `/api/cupmanager/matches?teamId=${team.id}`,
                    {
                      cache:
                        "no-store",
                      signal:
                        controller.signal,
                    }
                  );

                if (!response.ok) {
                  throw new Error(
                    "Could not load matches"
                  );
                }

                const data:
                  MatchesResponse =
                    await response.json();

                return {
                  team,
                  response: data,
                };
              }
            )
          );

        if (
          !controller.signal.aborted
        ) {
          setTeamMatches(results);
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        if (
          !controller.signal.aborted
        ) {
          setTeamMatches([]);
          setError(
            "Could not load matches."
          );
        }
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setMatchesLoading(false);
        }
      }
    }

    loadMatches();

    return () => {
      controller.abort();
    };
  }, [
    favourites,
    favouritesLoaded,
  ]);

  const filteredTeams =
    useMemo(() => {
      const text =
        search
          .trim()
          .toLowerCase();

      if (!text) {
        return teams;
      }

      return teams.filter(
        (team) =>
          [
            team.name,
            team.fullName,
            team.categoryName,
            team.suffix,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase()
            .includes(text)
      );
    }, [
      teams,
      search,
    ]);

  const liveMatches =
    useMemo(() => {
      const all =
        teamMatches.flatMap(
          ({ team, response }) =>
            withClassLabel(
              response.live,
              team
            )
        );

      return uniqueMatches(all).sort(
        (a, b) =>
          (a.start ?? 0) -
          (b.start ?? 0)
      );
    }, [teamMatches]);

  const upcomingMatches =
    useMemo(() => {
      const all =
        teamMatches.flatMap(
          ({ team, response }) =>
            withClassLabel(
              response.upcoming,
              team
            )
        );

      return uniqueMatches(all).sort(
        (a, b) =>
          (a.start ?? 0) -
          (b.start ?? 0)
      );
    }, [teamMatches]);

  const liveAndUpcoming =
    useMemo(() => {
      return uniqueMatches([
        ...liveMatches,
        ...upcomingMatches,
      ]).sort(
        (a, b) =>
          (a.start ?? 0) -
          (b.start ?? 0)
      );
    }, [
      liveMatches,
      upcomingMatches,
    ]);

  const playedMatches =
    useMemo(() => {
      const all =
        teamMatches.flatMap(
          ({ team, response }) =>
            withClassLabel(
              response.played,
              team
            )
        );

      return uniqueMatches(all).sort(
        (a, b) =>
          (b.start ?? 0) -
          (a.start ?? 0)
      );
    }, [teamMatches]);

  const qualificationMatches =
    useMemo(() => {
      const all =
        teamMatches.flatMap(
          ({ team, response }) =>
            withClassLabel(
              response.possible,
              team
            )
        );

      return uniqueMatches(all).sort(
        (a, b) =>
          (a.start ?? 0) -
          (b.start ?? 0)
      );
    }, [teamMatches]);

  function handleGenderChange(
    value: Gender
  ) {
    setGender(value);
    setTeams([]);
    setSearch("");
    setError("");

    const ages =
      categories
        .filter(
          (category) =>
            category.gender === value
        )
        .map(
          (category) =>
            category.age
        )
        .sort(
          (a, b) => a - b
        );

    if (
      ages.length > 0 &&
      !ages.includes(age)
    ) {
      setAge(
        ages.includes(14)
          ? 14
          : ages[0]
      );
    }
  }

  function addFavourite(
    team: Team
  ) {
    setFavourites(
      (current) => {
        if (
          current.some(
            (item) =>
              item.id === team.id
          )
        ) {
          return current;
        }

        return [
          ...current,
          team,
        ];
      }
    );

    setShowTeamPicker(false);
    setTab("matches");
    setMatchesTab(
      "live-upcoming"
    );
  }

  function removeFavourite(
    teamId: number
  ) {
    setFavourites(
      (current) =>
        current.filter(
          (team) =>
            team.id !== teamId
        )
    );
  }

  function mainTabButton(
    value: Tab,
    label: string
  ) {
    return (
      <button
        type="button"
        onClick={() =>
          setTab(value)
        }
        style={{
          flex: 1,
          padding: "11px 4px",
          border: 0,
          borderBottom:
            tab === value
              ? "3px solid #166534"
              : "3px solid transparent",
          background:
            "transparent",
          color:
            tab === value
              ? "#166534"
              : "#667085",
          fontSize: "13px",
          fontWeight:
            tab === value
              ? 700
              : 600,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  }

  function matchesTabButton(
    value: MatchesTab,
    label: string
  ) {
    const selected =
      matchesTab === value;

    return (
      <button
        type="button"
        onClick={() =>
          setMatchesTab(value)
        }
        style={{
          flex: 1,
          padding: "9px",
          border:
            selected
              ? "1px solid #166534"
              : "1px solid #d0d5dd",
          background:
            selected
              ? "#ecfdf3"
              : "white",
          color:
            selected
              ? "#166534"
              : "#667085",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        {label}
      </button>
    );
  }

  function renderMatchDays(
    matches: DisplayMatch[],
    qualification = false
  ) {
    return groupByDay(matches).map(
      ([day, dayMatches]) => (
        <section
          key={day}
          style={{
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              marginBottom: "9px",
              fontSize: "13px",
              fontWeight: 800,
              color: "#475467",
              letterSpacing:
                "0.03em",
            }}
          >
            {day}
          </div>

          {dayMatches.map(
            (match) => (
              <MatchCard
                key={match.id}
                match={match}
                qualification={
                  qualification
                }
              />
            )
          )}
        </section>
      )
    );
  }

  return (
    <main
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding:
          "20px 16px 60px",
      }}
    >
      <div
        style={{
          fontSize: "13px",
          color: "#667085",
        }}
      >
        Fotballfest 2026
      </div>

      <h1
        style={{
          margin: "5px 0 16px",
          fontSize: "27px",
        }}
      >
        ⚽ Match Tracker
      </h1>

      <div
        style={{
          display: "flex",
          marginBottom: "18px",
          borderBottom:
            "1px solid #eaecf0",
        }}
      >
        {mainTabButton(
          "matches",
          "MATCHES"
        )}

        {mainTabButton(
          "qualification",
          "QUALIFICATION"
        )}

        {mainTabButton(
          "teams",
          "TEAMS"
        )}
      </div>

      {error && (
        <div
          style={{
            background: "#fef3f2",
            color: "#b42318",
            padding: "12px",
            borderRadius: "8px",
            marginBottom: "16px",
          }}
        >
          {error}
        </div>
      )}

      {tab === "matches" && (
        <>
          <div
            style={{
              display: "flex",
              marginBottom: "18px",
            }}
          >
            {matchesTabButton(
              "live-upcoming",
              "LIVE & UPCOMING"
            )}

            {matchesTabButton(
              "played",
              "PLAYED"
            )}
          </div>

          {matchesLoading && (
            <p
              style={{
                color: "#667085",
              }}
            >
              Loading matches...
            </p>
          )}

          {!matchesLoading &&
            favouritesLoaded &&
            favourites.length === 0 && (
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "24px",
                  textAlign: "center",
                }}
              >
                <strong>
                  No favourite teams yet
                </strong>

                <p
                  style={{
                    color: "#667085",
                  }}
                >
                  Add a team to start
                  following matches.
                </p>

                <button
                  type="button"
                  onClick={() =>
                    setTab("teams")
                  }
                  style={{
                    padding: "11px 16px",
                    border: 0,
                    borderRadius: "8px",
                    background: "#166534",
                    color: "white",
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Add team
                </button>
              </div>
            )}

          {!matchesLoading &&
            favourites.length > 0 &&
            matchesTab ===
              "live-upcoming" &&
            liveAndUpcoming.length === 0 && (
              <p
                style={{
                  color: "#667085",
                }}
              >
                No live or upcoming
                matches.
              </p>
            )}

          {!matchesLoading &&
            matchesTab ===
              "live-upcoming" &&
            renderMatchDays(
              liveAndUpcoming
            )}

          {!matchesLoading &&
            favourites.length > 0 &&
            matchesTab ===
              "played" &&
            playedMatches.length === 0 && (
              <p
                style={{
                  color: "#667085",
                }}
              >
                No played matches
                available.
              </p>
            )}

          {!matchesLoading &&
            matchesTab ===
              "played" &&
            renderMatchDays(
              playedMatches
            )}
        </>
      )}

      {tab === "qualification" && (
        <>
          {qualificationMatches.length === 0 ? (
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "24px",
                textAlign: "center",
                color: "#667085",
              }}
            >
              No qualification paths
              to show yet.
            </div>
          ) : (
            renderMatchDays(
              qualificationMatches,
              true
            )
          )}
        </>
      )}

      {tab === "teams" && (
        <>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setTeams([]);
              setError("");
              setShowTeamPicker(
                true
              );
            }}
            style={{
              width: "100%",
              padding: "13px",
              border: 0,
              borderRadius: "10px",
              background: "#166534",
              color: "white",
              fontSize: "15px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            + Add favourite team
          </button>

          <div
            style={{
              marginTop: "18px",
            }}
          >
            {!favouritesLoaded ? (
              <p
                style={{
                  color: "#667085",
                }}
              >
                Loading favourites...
              </p>
            ) : favourites.length ===
              0 ? (
              <p
                style={{
                  color: "#667085",
                }}
              >
                No favourite teams
                yet.
              </p>
            ) : (
              favourites.map(
                (team) => (
                  <div
                    key={team.id}
                    style={{
                      background: "white",
                      padding: "14px",
                      borderRadius: "10px",
                      marginBottom: "9px",
                      display: "flex",
                      justifyContent:
                        "space-between",
                      gap: "12px",
                    }}
                  >
                    <div>
                      <strong>
                        {team.name}
                      </strong>

                      {team.categoryName && (
                        <div
                          style={{
                            fontSize: "13px",
                            color: "#667085",
                            marginTop: "3px",
                          }}
                        >
                          {
                            team.categoryName
                          }
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        removeFavourite(
                          team.id
                        )
                      }
                      style={{
                        border: 0,
                        background:
                          "transparent",
                        color: "#b42318",
                        cursor: "pointer",
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )
              )
            )}
          </div>
        </>
      )}

      {showTeamPicker && (
        <section
          style={{
            marginTop: "22px",
            padding: "18px",
            background: "white",
            borderRadius: "12px",
            border:
              "1px solid #eaecf0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems: "center",
            }}
          >
            <strong>
              Add team
            </strong>

            <button
              type="button"
              aria-label="Close team selector"
              onClick={() =>
                setShowTeamPicker(
                  false
                )
              }
              style={{
                border: 0,
                background:
                  "transparent",
                fontSize: "22px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          {categoriesLoading ? (
            <p
              style={{
                color: "#667085",
              }}
            >
              Loading categories...
            </p>
          ) : (
            <>
              <div
                style={{
                  marginTop: "18px",
                }}
              >
                <strong>
                  Gender
                </strong>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "7px",
                  }}
                >
                  {(
                    [
                      "Girls",
                      "Boys",
                    ] as Gender[]
                  ).map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          handleGenderChange(
                            value
                          )
                        }
                        style={{
                          flex: 1,
                          padding: "10px",
                          borderRadius: "8px",
                          border:
                            gender === value
                              ? "2px solid #166534"
                              : "1px solid #d0d5dd",
                          background:
                            gender === value
                              ? "#ecfdf3"
                              : "white",
                          cursor: "pointer",
                        }}
                      >
                        {value}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: "18px",
                }}
              >
                <strong>
                  Age
                </strong>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "7px",
                    flexWrap: "wrap",
                  }}
                >
                  {availableAges.map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => {
                          setAge(value);
                          setTeams([]);
                          setSearch("");
                          setError("");
                        }}
                        style={{
                          minWidth: "58px",
                          padding: "10px",
                          borderRadius: "8px",
                          border:
                            age === value
                              ? "2px solid #166534"
                              : "1px solid #d0d5dd",
                          background:
                            age === value
                              ? "#ecfdf3"
                              : "white",
                          cursor: "pointer",
                        }}
                      >
                        {value}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: "18px",
                }}
              >
                <strong>
                  Team
                </strong>

                {selectedCategory && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#667085",
                      marginTop: "3px",
                    }}
                  >
                    {
                      selectedCategory.name
                    }
                  </div>
                )}

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(
                      event.target.value
                    )
                  }
                  placeholder="Search team..."
                  autoComplete="off"
                  disabled={
                    teamsLoading ||
                    !selectedCategory
                  }
                  style={{
                    width: "100%",
                    boxSizing:
                      "border-box",
                    padding: "11px",
                    marginTop: "8px",
                    borderRadius: "8px",
                    border:
                      "1px solid #d0d5dd",
                    fontSize: "16px",
                    background:
                      teamsLoading ||
                      !selectedCategory
                        ? "#f2f4f7"
                        : "white",
                  }}
                />

                <div
                  style={{
                    marginTop: "8px",
                  }}
                >
                  {teamsLoading ? (
                    <p
                      style={{
                        color: "#667085",
                      }}
                    >
                      Loading teams...
                    </p>
                  ) : (
                    filteredTeams.map(
                      (team) => (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() =>
                            addFavourite(
                              team
                            )
                          }
                          style={{
                            display: "block",
                            width: "100%",
                            textAlign: "left",
                            padding: "11px 3px",
                            border: 0,
                            borderBottom:
                              "1px solid #eaecf0",
                            background: "white",
                            cursor: "pointer",
                          }}
                        >
                          <strong>
                            {team.name}
                          </strong>

                          {team.categoryName && (
                            <div
                              style={{
                                fontSize: "12px",
                                color: "#667085",
                              }}
                            >
                              {
                                team.categoryName
                              }
                            </div>
                          )}
                        </button>
                      )
                    )
                  )}

                  {!teamsLoading &&
                    selectedCategory &&
                    filteredTeams.length ===
                      0 && (
                      <p
                        style={{
                          color: "#667085",
                        }}
                      >
                        No matching teams.
                      </p>
                    )}
                </div>
              </div>
            </>
          )}
        </section>
      )}
    </main>
  );
}
