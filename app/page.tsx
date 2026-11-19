"use client";

import { useEffect, useMemo, useState } from "react";

type Gender = "Girls" | "Boys";
type Tab = "matches" | "possible" | "teams";

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
};

type Match = {
  id: number;
  matchNumber: string | null;

  selectedTeam: {
    id: number;
    name: string;
  };

  opponent: {
    id: number | null;
    name: string | null;
  };

  homeTeam: MatchTeam;
  awayTeam: MatchTeam;

  homeAway: "home" | "away" | "unknown";

  start: number | null;
  end: number | null;
  duration: number | null;

  arena: {
    id: number | null;
    name: string | null;
    locationId: number | null;
  };

  score: {
    home: number;
    away: number;
    for: number | null;
    against: number | null;
    penalties: boolean;
    walkover: boolean;
  } | null;

  live: boolean;
  finished: boolean;
  scheduled: boolean;

  status: "live" | "upcoming" | "played";

  group?: string | null;
  stageName?: string | null;
  roundName?: string | null;
  competitionLabel?: string | null;
};

type CategoriesResponse = {
  ok: boolean;
  categories: Category[];
};

type TeamsResponse = {
  ok: boolean;
  categoryId: number;
  teams: Team[];
};

type MatchesResponse = {
  ok: boolean;

  counts: {
    live: number;
    upcoming: number;
    played: number;
    possible: number;
  };

  live: Match[];
  upcoming: Match[];
  played: Match[];
  possible: Match[];
};

type TeamMatches = {
  team: Team;
  response: MatchesResponse;
};

function formatDay(timestamp: number | null) {
  if (!timestamp) return "DATE TBD";

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
  if (!timestamp) return "--:--";

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Europe/Oslo",
  }).format(new Date(timestamp));
}

function matchTime(match: Match) {
  return `${formatTime(match.start)}–${formatTime(match.end)}`;
}

function displayTeamName(team: MatchTeam) {
  if (team.winnerOfMatch) {
    return `🏆 #${team.winnerOfMatch}`;
  }

  return team.name ?? "TBD";
}

function scoreLine(match: Match) {
  const home = displayTeamName(match.homeTeam);
  const away = displayTeamName(match.awayTeam);

  if (match.score) {
    return `${home} ${match.score.home}–${match.score.away} ${away}`;
  }

  return `${home} – ${away}`;
}

function metadataLine(match: Match) {
  const parts: string[] = [];

  parts.push(matchTime(match));

  if (match.matchNumber) {
    parts.push(`⚽ #${match.matchNumber}`);
  }

  if (match.competitionLabel) {
    parts.push(match.competitionLabel);
  }

  return parts.join(" · ");
}

function groupByDay(matches: Match[]) {
  const map = new Map<string, Match[]>();

  for (const match of matches) {
    const key = formatDay(match.start);

    const existing = map.get(key) ?? [];
    existing.push(match);
    map.set(key, existing);
  }

  return Array.from(map.entries());
}

function MatchCard({
  match,
  possible = false,
}: {
  match: Match;
  possible?: boolean;
}) {
  return (
    <div
      style={{
        background: "white",
        borderRadius: "12px",
        padding: "14px",
        marginBottom: "10px",
        boxShadow: "0 1px 2px rgba(16,24,40,0.06)",
      }}
    >
      <div
        style={{
          fontWeight: 700,
          fontSize: "16px",
          lineHeight: 1.35,
        }}
      >
        {scoreLine(match)}
      </div>

      <div
        style={{
          marginTop: "6px",
          fontSize: "14px",
          color: "#344054",
        }}
      >
        <strong>{matchTime(match)}</strong>

        {match.matchNumber && (
          <>
            {" · "}
            <span>⚽ #{match.matchNumber}</span>
          </>
        )}

        {match.competitionLabel && (
          <>
            {" · "}
            <span>{match.competitionLabel}</span>
          </>
        )}
      </div>

      <div
        style={{
          marginTop: "5px",
          fontSize: "14px",
          color: "#667085",
        }}
      >
        📍 {match.arena.name ?? "Venue TBD"}
      </div>

      {match.live && (
        <div
          style={{
            marginTop: "8px",
            color: "#b42318",
            fontWeight: 700,
            fontSize: "13px",
          }}
        >
          🔴 LIVE
        </div>
      )}

      {possible && (
        <div
          style={{
            marginTop: "9px",
            color: "#166534",
            fontWeight: 600,
            fontSize: "13px",
          }}
        >
          ↓ {match.selectedTeam.name} can reach this match
        </div>
      )}
    </div>
  );
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("matches");

  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [favourites, setFavourites] = useState<Team[]>([]);
  const [teamMatches, setTeamMatches] = useState<TeamMatches[]>([]);

  const [showTeamPicker, setShowTeamPicker] = useState(false);

  const [gender, setGender] = useState<Gender>("Girls");
  const [age, setAge] = useState<number>(14);
  const [search, setSearch] = useState("");

  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(false);
  const [matchesLoading, setMatchesLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        setCategoriesLoading(true);

        const response = await fetch(
          "/api/cupmanager/categories",
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error();
        }

        const data: CategoriesResponse = await response.json();

        if (!controller.signal.aborted) {
          setCategories(data.categories);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Could not load Fotballfest categories.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setCategoriesLoading(false);
        }
      }
    }

    loadCategories();

    return () => controller.abort();
  }, []);

  const availableAges = useMemo(() => {
    return Array.from(
      new Set(
        categories
          .filter(
            (category) => category.gender === gender
          )
          .map((category) => category.age)
      )
    ).sort((a, b) => a - b);
  }, [categories, gender]);

  const selectedCategory = useMemo(() => {
    return categories.find(
      (category) =>
        category.gender === gender &&
        category.age === age
    );
  }, [categories, gender, age]);

  useEffect(() => {
    if (!showTeamPicker || !selectedCategory) {
      setTeams([]);
      return;
    }

    const controller = new AbortController();
    const categoryId = selectedCategory.id;

    async function loadTeams() {
      try {
        setTeamsLoading(true);
        setTeams([]);
        setSearch("");
        setError("");

        const response = await fetch(
          `/api/cupmanager/teams?categoryId=${categoryId}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error();
        }

        const data: TeamsResponse = await response.json();

        if (
          !controller.signal.aborted &&
          data.categoryId === categoryId
        ) {
          setTeams(data.teams);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Could not load teams.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setTeamsLoading(false);
        }
      }
    }

    loadTeams();

    return () => controller.abort();
  }, [showTeamPicker, selectedCategory]);

  useEffect(() => {
    if (favourites.length === 0) {
      setTeamMatches([]);
      return;
    }

    const controller = new AbortController();

    async function loadMatches() {
      try {
        setMatchesLoading(true);
        setError("");

        const results = await Promise.all(
          favourites.map(async (team) => {
            const response = await fetch(
              `/api/cupmanager/matches?teamId=${team.id}`,
              {
                cache: "no-store",
                signal: controller.signal,
              }
            );

            if (!response.ok) {
              throw new Error();
            }

            const data: MatchesResponse =
              await response.json();

            return {
              team,
              response: data,
            };
          })
        );

        if (!controller.signal.aborted) {
          setTeamMatches(results);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError("Could not load matches.");
        }
      } finally {
        if (!controller.signal.aborted) {
          setMatchesLoading(false);
        }
      }
    }

    loadMatches();

    return () => controller.abort();
  }, [favourites]);

  const filteredTeams = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) return teams;

    return teams.filter((team) =>
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
  }, [teams, search]);

  const confirmedMatches = useMemo(() => {
    const all = teamMatches.flatMap(({ response }) => [
      ...response.live,
      ...response.upcoming,
      ...response.played,
    ]);

    return Array.from(
      new Map(all.map((match) => [match.id, match])).values()
    ).sort(
      (a, b) =>
        (a.start ?? 0) - (b.start ?? 0)
    );
  }, [teamMatches]);

  const possibleMatches = useMemo(() => {
    const all = teamMatches.flatMap(
      ({ response }) => response.possible
    );

    return Array.from(
      new Map(all.map((match) => [match.id, match])).values()
    ).sort(
      (a, b) =>
        (a.start ?? 0) - (b.start ?? 0)
    );
  }, [teamMatches]);

  function handleGenderChange(value: Gender) {
    setGender(value);
    setTeams([]);
    setSearch("");

    const ages = categories
      .filter(
        (category) => category.gender === value
      )
      .map((category) => category.age);

    if (!ages.includes(age)) {
      setAge(ages.includes(14) ? 14 : ages[0]);
    }
  }

  function addFavourite(team: Team) {
    setFavourites((current) => {
      if (current.some((item) => item.id === team.id)) {
        return current;
      }

      return [...current, team];
    });

    setShowTeamPicker(false);
    setTab("matches");
  }

  function removeFavourite(teamId: number) {
    setFavourites((current) =>
      current.filter((team) => team.id !== teamId)
    );
  }

  const tabButton = (value: Tab, label: string) => (
    <button
      type="button"
      onClick={() => setTab(value)}
      style={{
        flex: 1,
        padding: "11px 6px",
        border: 0,
        borderBottom:
          tab === value
            ? "3px solid #166534"
            : "3px solid transparent",
        background: "transparent",
        color:
          tab === value
            ? "#166534"
            : "#667085",
        fontWeight: tab === value ? 700 : 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <main
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "20px 16px 60px",
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
          marginBottom: "22px",
          borderBottom: "1px solid #eaecf0",
        }}
      >
        {tabButton("matches", "MATCHES")}
        {tabButton("possible", "POSSIBLE")}
        {tabButton("teams", "TEAMS")}
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
          {matchesLoading && (
            <p style={{ color: "#667085" }}>
              Loading matches...
            </p>
          )}

          {!matchesLoading &&
            favourites.length === 0 && (
              <div
                style={{
                  background: "white",
                  borderRadius: "12px",
                  padding: "24px",
                  textAlign: "center",
                }}
              >
                <strong>No favourite teams yet</strong>

                <p style={{ color: "#667085" }}>
                  Add a team to start following matches.
                </p>

                <button
                  type="button"
                  onClick={() => setTab("teams")}
                  style={{
                    padding: "11px 16px",
                    border: 0,
                    borderRadius: "8px",
                    background: "#166534",
                    color: "white",
                    fontWeight: 700,
                  }}
                >
                  Add team
                </button>
              </div>
            )}

          {!matchesLoading &&
            groupByDay(confirmedMatches).map(
              ([day, matches]) => (
                <section
                  key={day}
                  style={{ marginBottom: "24px" }}
                >
                  <div
                    style={{
                      marginBottom: "9px",
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "#475467",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {day}
                  </div>

                  {matches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                    />
                  ))}
                </section>
              )
            )}
        </>
      )}

      {tab === "possible" && (
        <>
          {possibleMatches.length === 0 ? (
            <div
              style={{
                background: "white",
                borderRadius: "12px",
                padding: "24px",
                textAlign: "center",
                color: "#667085",
              }}
            >
              No possible knockout matches to show yet.
            </div>
          ) : (
            groupByDay(possibleMatches).map(
              ([day, matches]) => (
                <section
                  key={day}
                  style={{ marginBottom: "24px" }}
                >
                  <div
                    style={{
                      marginBottom: "9px",
                      fontSize: "13px",
                      fontWeight: 800,
                      color: "#475467",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {day}
                  </div>

                  {matches.map((match) => (
                    <MatchCard
                      key={match.id}
                      match={match}
                      possible
                    />
                  ))}
                </section>
              )
            )
          )}
        </>
      )}

      {tab === "teams" && (
        <>
          <button
            type="button"
            onClick={() => setShowTeamPicker(true)}
            style={{
              width: "100%",
              padding: "13px",
              border: 0,
              borderRadius: "10px",
              background: "#166534",
              color: "white",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            + Add favourite team
          </button>

          <div style={{ marginTop: "18px" }}>
            {favourites.length === 0 ? (
              <p style={{ color: "#667085" }}>
                No favourite teams yet.
              </p>
            ) : (
              favourites.map((team) => (
                <div
                  key={team.id}
                  style={{
                    background: "white",
                    padding: "14px",
                    borderRadius: "10px",
                    marginBottom: "9px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                  }}
                >
                  <div>
                    <strong>{team.name}</strong>

                    {team.categoryName && (
                      <div
                        style={{
                          fontSize: "13px",
                          color: "#667085",
                          marginTop: "3px",
                        }}
                      >
                        {team.categoryName}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      removeFavourite(team.id)
                    }
                    style={{
                      border: 0,
                      background: "transparent",
                      color: "#b42318",
                    }}
                  >
                    Remove
                  </button>
                </div>
              ))
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
            border: "1px solid #eaecf0",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <strong>Add team</strong>

            <button
              type="button"
              onClick={() => setShowTeamPicker(false)}
              style={{
                border: 0,
                background: "transparent",
                fontSize: "22px",
              }}
            >
              ×
            </button>
          </div>

          {!categoriesLoading && (
            <>
              <div style={{ marginTop: "18px" }}>
                <strong>Gender</strong>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "7px",
                  }}
                >
                  {(["Girls", "Boys"] as Gender[]).map(
                    (value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() =>
                          handleGenderChange(value)
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
                        }}
                      >
                        {value}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div style={{ marginTop: "18px" }}>
                <strong>Age</strong>

                <div
                  style={{
                    display: "flex",
                    gap: "8px",
                    marginTop: "7px",
                  }}
                >
                  {availableAges.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => {
                        setAge(value);
                        setTeams([]);
                        setSearch("");
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
                      }}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ marginTop: "18px" }}>
                <strong>Team</strong>

                {selectedCategory && (
                  <div
                    style={{
                      fontSize: "12px",
                      color: "#667085",
                      marginTop: "3px",
                    }}
                  >
                    {selectedCategory.name}
                  </div>
                )}

                <input
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                  placeholder="Search team..."
                  style={{
                    width: "100%",
                    boxSizing: "border-box",
                    padding: "11px",
                    marginTop: "8px",
                    borderRadius: "8px",
                    border: "1px solid #d0d5dd",
                    fontSize: "16px",
                  }}
                />

                <div style={{ marginTop: "8px" }}>
                  {teamsLoading ? (
                    <p style={{ color: "#667085" }}>
                      Loading teams...
                    </p>
                  ) : (
                    filteredTeams.map((team) => (
                      <button
                        key={team.id}
                        type="button"
                        onClick={() =>
                          addFavourite(team)
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
                        }}
                      >
                        <strong>{team.name}</strong>

                        {team.categoryName && (
                          <div
                            style={{
                              fontSize: "12px",
                              color: "#667085",
                            }}
                          >
                            {team.categoryName}
                          </div>
                        )}
                      </button>
                    ))
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
