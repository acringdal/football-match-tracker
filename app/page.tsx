"use client";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

type Gender = "Girls" | "Boys";

type MatchTab =
  | "live-upcoming"
  | "played";

type Category = {
  id: number;
  name: string;
  shortName: string;
  gender: Gender;
  age: number;
};

type CategoriesResponse = {
  ok: boolean;
  tournament: string;
  tournamentId: number;
  count: number;
  ages: number[];
  categories: Category[];
};

type Team = {
  id: number;
  name: string;
  fullName: string | null;
  categoryName: string | null;
  suffix: string | null;
};

type TeamsResponse = {
  ok: boolean;
  tournament: string;
  tournamentId: number;
  categoryId: number;
  count: number;
  teams: Team[];
};

type MatchTeam = {
  id: number | null;
  name: string;
};

type MatchArena = {
  id: number | null;
  name: string | null;
  locationId: number | null;
};

type MatchScore = {
  home: number;
  away: number;
  for: number;
  against: number;
  penalties: boolean;
  walkover: boolean;
};

type Match = {
  id: number;

  selectedTeam: MatchTeam;
  opponent: MatchTeam;

  homeTeam: MatchTeam;
  awayTeam: MatchTeam;

  homeAway:
    | "home"
    | "away"
    | "unknown";

  start: number | null;
  end: number | null;
  duration: number | null;

  arena: MatchArena;

  score: MatchScore | null;

  live: boolean;
  finished: boolean;
  scheduled: boolean;

  status:
    | "live"
    | "played"
    | "upcoming";

  roundName: string | null;
  stageName: string | null;

  nextMatchWinner: string | null;
  nextMatchLoser: string | null;
};

type MatchesResponse = {
  ok: boolean;
  tournament: string;
  tournamentId: number;

  team: MatchTeam;

  count: number;

  counts: {
    live: number;
    upcoming: number;
    played: number;
  };

  liveAndUpcoming: Match[];
  played: Match[];
  matches: Match[];
};

type MatchGroup = {
  key: string;
  label: string;
  matches: Match[];
};

const FAVOURITES_STORAGE_KEY =
  "football-match-tracker-favourites";

const TIME_ZONE = "Europe/Oslo";

function getDateKey(
  timestamp: number
): string {
  const formatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }
    );

  const parts =
    formatter.formatToParts(
      new Date(timestamp)
    );

  const year =
    parts.find(
      (part) =>
        part.type === "year"
    )?.value ?? "";

  const month =
    parts.find(
      (part) =>
        part.type === "month"
    )?.value ?? "";

  const day =
    parts.find(
      (part) =>
        part.type === "day"
    )?.value ?? "";

  return `${year}-${month}-${day}`;
}

function formatDateHeader(
  timestamp: number
): string {
  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: TIME_ZONE,
      weekday: "long",
      day: "numeric",
      month: "short",
    }
  )
    .format(new Date(timestamp))
    .toUpperCase()
    .replace(",", " ·");
}

function formatTime(
  timestamp: number | null
): string {
  if (timestamp === null) {
    return "--:--";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      timeZone: TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }
  ).format(new Date(timestamp));
}

function formatTimeRange(
  match: Match
): string {
  return `${formatTime(
    match.start
  )}–${formatTime(match.end)}`;
}

function groupMatchesByDate(
  matches: Match[],
  descending: boolean
): MatchGroup[] {
  const groups =
    new Map<string, MatchGroup>();

  for (const match of matches) {
    if (match.start === null) {
      continue;
    }

    const key =
      getDateKey(match.start);

    const existing =
      groups.get(key);

    if (existing) {
      existing.matches.push(match);
      continue;
    }

    groups.set(key, {
      key,
      label:
        formatDateHeader(
          match.start
        ),
      matches: [match],
    });
  }

  const result =
    Array.from(groups.values());

  for (const group of result) {
    group.matches.sort(
      (a, b) =>
        (a.start ?? 0) -
        (b.start ?? 0)
    );
  }

  result.sort((a, b) => {
    if (descending) {
      return b.key.localeCompare(
        a.key
      );
    }

    return a.key.localeCompare(
      b.key
    );
  });

  return result;
}

function isConfirmedMatch(
  match: Match
): boolean {
  return (
    match.homeAway === "home" ||
    match.homeAway === "away"
  );
}

function getMatchKey(
  match: Match
): string {
  return String(match.id);
}

export default function Home() {
  const [
    categories,
    setCategories,
  ] = useState<Category[]>([]);

  const [
    teams,
    setTeams,
  ] = useState<Team[]>([]);

  const [
    favourites,
    setFavourites,
  ] = useState<Team[]>([]);

  const [
    favouritesLoaded,
    setFavouritesLoaded,
  ] = useState(false);

  const [
    matches,
    setMatches,
  ] = useState<Match[]>([]);

  const [
    showTeamPicker,
    setShowTeamPicker,
  ] = useState(false);

  const [
    activeTab,
    setActiveTab,
  ] =
    useState<MatchTab>(
      "live-upcoming"
    );

  const [
    gender,
    setGender,
  ] =
    useState<Gender>("Girls");

  const [
    age,
    setAge,
  ] = useState<number>(14);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    categoriesLoading,
    setCategoriesLoading,
  ] = useState(true);

  const [
    teamsLoading,
    setTeamsLoading,
  ] = useState(false);

  const [
    matchesLoading,
    setMatchesLoading,
  ] = useState(false);

  const [
    categoryError,
    setCategoryError,
  ] = useState("");

  const [
    teamError,
    setTeamError,
  ] = useState("");

  const [
    matchError,
    setMatchError,
  ] = useState("");

  useEffect(() => {
    try {
      const stored =
        window.localStorage.getItem(
          FAVOURITES_STORAGE_KEY
        );

      if (stored) {
        const parsed =
          JSON.parse(stored);

        if (Array.isArray(parsed)) {
          setFavourites(parsed);
        }
      }
    } catch {
      window.localStorage.removeItem(
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

    window.localStorage.setItem(
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
        setCategoryError("");

        const response = await fetch(
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
            data.categories
          );
        }
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        if (
          !controller.signal.aborted
        ) {
          setCategoryError(
            "Could not load tournament categories from Fotballfest."
          );
        }
      } finally {
        if (
          !controller.signal.aborted
        ) {
          setCategoriesLoading(false);
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
                category.gender ===
                gender
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
          category.gender ===
            gender &&
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
        setTeamError("");
        setTeams([]);
        setSearch("");

        const response = await fetch(
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
          !controller.signal
            .aborted &&
          data.categoryId ===
            categoryId
        ) {
          setTeams(data.teams);
        }
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        if (
          !controller.signal.aborted
        ) {
          setTeams([]);
          setTeamError(
            "Could not load teams from Fotballfest."
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
      setMatches([]);
      setMatchesLoading(false);
      return;
    }

    const controller =
      new AbortController();

    async function loadMatches() {
      try {
        setMatchesLoading(true);
        setMatchError("");

        const responses =
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
                    `Could not load matches for ${team.name}`
                  );
                }

                return (
                  (await response.json()) as
                    MatchesResponse
                );
              }
            )
          );

        if (
          controller.signal.aborted
        ) {
          return;
        }

        const mergedMatches =
          responses.flatMap(
            (response) =>
              response.matches
          );

        const uniqueMatches =
          Array.from(
            new Map(
              mergedMatches.map(
                (match) => [
                  getMatchKey(match),
                  match,
                ]
              )
            ).values()
          );

        setMatches(
          uniqueMatches
        );
      } catch (error) {
        if (
          error instanceof
            DOMException &&
          error.name ===
            "AbortError"
        ) {
          return;
        }

        if (
          !controller.signal.aborted
        ) {
          setMatches([]);
          setMatchError(
            "Could not load matches from Fotballfest."
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
        (team) => {
          const searchableText = [
            team.name,
            team.fullName,
            team.categoryName,
            team.suffix,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          return searchableText.includes(
            text
          );
        }
      );
    }, [
      teams,
      search,
    ]);

  const liveMatches =
    useMemo(() => {
      return matches
        .filter(
          (match) =>
            match.status ===
              "live" &&
            isConfirmedMatch(match)
        )
        .sort(
          (a, b) =>
            (a.start ?? 0) -
            (b.start ?? 0)
        );
    }, [matches]);

  const upcomingMatches =
    useMemo(() => {
      return matches
        .filter(
          (match) =>
            match.status ===
              "upcoming" &&
            isConfirmedMatch(match)
        )
        .sort(
          (a, b) =>
            (a.start ?? 0) -
            (b.start ?? 0)
        );
    }, [matches]);

  const playedMatches =
    useMemo(() => {
      return matches
        .filter(
          (match) =>
            match.status ===
              "played" &&
            isConfirmedMatch(match)
        )
        .sort(
          (a, b) =>
            (b.start ?? 0) -
            (a.start ?? 0)
        );
    }, [matches]);

  const liveAndUpcomingMatches =
    useMemo(() => {
      return [
        ...liveMatches,
        ...upcomingMatches,
      ];
    }, [
      liveMatches,
      upcomingMatches,
    ]);

  const liveAndUpcomingGroups =
    useMemo(() => {
      return groupMatchesByDate(
        liveAndUpcomingMatches,
        false
      );
    }, [
      liveAndUpcomingMatches,
    ]);

  const playedGroups =
    useMemo(() => {
      return groupMatchesByDate(
        playedMatches,
        true
      );
    }, [playedMatches]);

  function handleGenderChange(
    newGender: Gender
  ) {
    setGender(newGender);
    setSearch("");
    setTeams([]);
    setTeamError("");

    const newGenderAges =
      categories
        .filter(
          (category) =>
            category.gender ===
            newGender
        )
        .map(
          (category) =>
            category.age
        )
        .sort(
          (a, b) => a - b
        );

    if (
      newGenderAges.length === 0
    ) {
      return;
    }

    if (
      newGenderAges.includes(age)
    ) {
      return;
    }

    if (
      newGenderAges.includes(14)
    ) {
      setAge(14);
      return;
    }

    setAge(
      newGenderAges[0]
    );
  }

  function handleAgeChange(
    newAge: number
  ) {
    setAge(newAge);
    setSearch("");
    setTeams([]);
    setTeamError("");
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
    setSearch("");
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

  function openTeamPicker() {
    setSearch("");
    setTeams([]);
    setTeamError("");
    setShowTeamPicker(true);
  }

  function closeTeamPicker() {
    setSearch("");
    setTeamError("");
    setShowTeamPicker(false);
  }

  function renderMatchCard(
    match: Match
  ) {
    const showScore =
      match.score !== null &&
      (
        match.status ===
          "played" ||
        match.status ===
          "live"
      );

    return (
      <article
        key={match.id}
        style={{
          marginTop: "10px",
          padding: "16px",
          background: "white",
          borderRadius: "12px",
          border:
            match.status === "live"
              ? "2px solid #dc2626"
              : "1px solid #eaecf0",
        }}
      >
        {match.status ===
          "live" && (
          <div
            style={{
              marginBottom: "8px",
              color: "#dc2626",
              fontSize: "13px",
              fontWeight: 800,
            }}
          >
            🔴 LIVE
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                showScore
                  ? "1fr auto"
                  : "1fr",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <strong>
              {match.homeTeam.name}
            </strong>

            {showScore && (
              <strong
                style={{
                  fontSize: "18px",
                }}
              >
                {match.score?.home}
              </strong>
            )}
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                showScore
                  ? "1fr auto"
                  : "1fr",
              gap: "12px",
              alignItems: "center",
            }}
          >
            <strong>
              {match.awayTeam.name}
            </strong>

            {showScore && (
              <strong
                style={{
                  fontSize: "18px",
                }}
              >
                {match.score?.away}
              </strong>
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: "12px",
            color: "#475467",
            fontSize: "14px",
            lineHeight: 1.6,
          }}
        >
          🕐{" "}
          <strong>
            {formatTimeRange(
              match
            )}
          </strong>

          {match.arena.name && (
            <>
              {" "}
              · 📍{" "}
              {match.arena.name}
            </>
          )}

          {/*
            Weather will be added here:

            · 🌧️ 7°C
          */}
        </div>

        {match.score?.penalties && (
          <div
            style={{
              marginTop: "8px",
              color: "#68707c",
              fontSize: "13px",
            }}
          >
            Decided on penalties
          </div>
        )}

        {match.score?.walkover && (
          <div
            style={{
              marginTop: "8px",
              color: "#68707c",
              fontSize: "13px",
            }}
          >
            Walkover
          </div>
        )}
      </article>
    );
  }

  function renderMatchGroups(
    groups: MatchGroup[]
  ) {
    return (
      <>
        {groups.map(
          (group) => (
            <section
              key={group.key}
              style={{
                marginTop: "26px",
              }}
            >
              <h3
                style={{
                  margin:
                    "0 0 10px",
                  fontSize: "14px",
                  letterSpacing:
                    "0.04em",
                  color: "#475467",
                }}
              >
                {group.label}
              </h3>

              {group.matches.map(
                renderMatchCard
              )}
            </section>
          )
        )}
      </>
    );
  }

  const activeGroups =
    activeTab ===
    "live-upcoming"
      ? liveAndUpcomingGroups
      : playedGroups;

  return (
    <main
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding:
          "24px 16px 60px",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          color: "#68707c",
        }}
      >
        Tournament Match Tracker
      </div>

      <h1
        style={{
          marginBottom: "8px",
        }}
      >
        ⚽ My Matches
      </h1>

      <p
        style={{
          marginTop: 0,
          color: "#68707c",
        }}
      >
        Follow your favourite teams
      </p>

      <button
        type="button"
        onClick={openTeamPicker}
        style={{
          width: "100%",
          padding: "14px",
          marginTop: "24px",
          border: 0,
          borderRadius: "10px",
          background: "#166534",
          color: "white",
          fontSize: "16px",
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        + Add favourite team
      </button>

      {favourites.length >
        0 && (
        <section
          style={{
            marginTop: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "8px",
            }}
          >
            {favourites.map(
              (team) => (
                <div
                  key={team.id}
                  style={{
                    display: "flex",
                    alignItems:
                      "center",
                    gap: "8px",
                    padding:
                      "8px 10px",
                    background:
                      "white",
                    border:
                      "1px solid #d0d5dd",
                    borderRadius:
                      "999px",
                    fontSize:
                      "13px",
                  }}
                >
                  <span>
                    ⭐ {team.name}
                  </span>

                  <button
                    type="button"
                    onClick={() =>
                      removeFavourite(
                        team.id
                      )
                    }
                    aria-label={`Remove ${team.name}`}
                    style={{
                      border: 0,
                      background:
                        "transparent",
                      color:
                        "#b42318",
                      padding: 0,
                      fontSize:
                        "16px",
                      cursor:
                        "pointer",
                    }}
                  >
                    ×
                  </button>
                </div>
              )
            )}
          </div>
        </section>
      )}

      {favourites.length ===
      0 ? (
        <div
          style={{
            marginTop: "32px",
            padding: "24px",
            background: "white",
            borderRadius: "12px",
            textAlign: "center",
          }}
        >
          <strong>
            No favourite teams yet
          </strong>

          <p
            style={{
              color: "#68707c",
              marginBottom: 0,
            }}
          >
            Add a team to see
            upcoming, live and
            played matches.
          </p>
        </div>
      ) : (
        <>
          <div
            role="tablist"
            aria-label="Match status"
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: "6px",
              marginTop: "26px",
              padding: "4px",
              background: "#e4e7ec",
              borderRadius: "12px",
            }}
          >
            <button
              type="button"
              role="tab"
              aria-selected={
                activeTab ===
                "live-upcoming"
              }
              onClick={() =>
                setActiveTab(
                  "live-upcoming"
                )
              }
              style={{
                padding:
                  "11px 8px",
                border: 0,
                borderRadius:
                  "9px",
                background:
                  activeTab ===
                  "live-upcoming"
                    ? "white"
                    : "transparent",
                color:
                  activeTab ===
                  "live-upcoming"
                    ? "#101828"
                    : "#475467",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {liveMatches.length >
              0
                ? `🔴 LIVE (${liveMatches.length}) & UPCOMING`
                : `LIVE & UPCOMING (${upcomingMatches.length})`}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={
                activeTab ===
                "played"
              }
              onClick={() =>
                setActiveTab(
                  "played"
                )
              }
              style={{
                padding:
                  "11px 8px",
                border: 0,
                borderRadius:
                  "9px",
                background:
                  activeTab ===
                  "played"
                    ? "white"
                    : "transparent",
                color:
                  activeTab ===
                  "played"
                    ? "#101828"
                    : "#475467",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              PLAYED (
              {playedMatches.length})
            </button>
          </div>

          {matchesLoading && (
            <div
              style={{
                marginTop: "28px",
                padding: "20px",
                background: "white",
                borderRadius: "12px",
                color: "#68707c",
                textAlign: "center",
              }}
            >
              Loading matches...
            </div>
          )}

          {matchError && (
            <div
              style={{
                marginTop: "20px",
                padding: "16px",
                borderRadius: "10px",
                background: "#fef3f2",
                color: "#b42318",
              }}
            >
              {matchError}
            </div>
          )}

          {!matchesLoading &&
            !matchError &&
            activeGroups.length ===
              0 && (
              <div
                style={{
                  marginTop: "28px",
                  padding: "24px",
                  background: "white",
                  borderRadius: "12px",
                  color: "#68707c",
                  textAlign: "center",
                }}
              >
                {activeTab ===
                "live-upcoming"
                  ? "No confirmed live or upcoming matches."
                  : "No played matches."}
              </div>
            )}

          {!matchesLoading &&
            !matchError &&
            renderMatchGroups(
              activeGroups
            )}
        </>
      )}

      {showTeamPicker && (
        <section
          style={{
            marginTop: "28px",
            padding: "20px",
            background: "white",
            borderRadius: "14px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent:
                "space-between",
              alignItems:
                "center",
              gap: "12px",
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: "20px",
              }}
            >
              Add team
            </h2>

            <button
              type="button"
              onClick={
                closeTeamPicker
              }
              aria-label="Close team selector"
              style={{
                border: 0,
                background:
                  "transparent",
                fontSize: "24px",
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>

          <p
            style={{
              color: "#68707c",
              marginBottom: "20px",
            }}
          >
            Fotballfest 2026
          </p>

          {categoriesLoading ? (
            <p
              style={{
                color: "#68707c",
              }}
            >
              Loading tournament
              categories...
            </p>
          ) : (
            <>
              <strong>
                Gender
              </strong>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  marginTop: "8px",
                }}
              >
                {(
                  [
                    "Girls",
                    "Boys",
                  ] as Gender[]
                ).map(
                  (option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        handleGenderChange(
                          option
                        )
                      }
                      style={{
                        flex: 1,
                        padding: "11px",
                        borderRadius:
                          "8px",
                        border:
                          gender ===
                          option
                            ? "2px solid #166534"
                            : "1px solid #d0d5dd",
                        background:
                          gender ===
                          option
                            ? "#ecfdf3"
                            : "white",
                        fontWeight:
                          gender ===
                          option
                            ? 700
                            : 400,
                        cursor:
                          "pointer",
                      }}
                    >
                      {option}
                    </button>
                  )
                )}
              </div>

              <div
                style={{
                  marginTop: "20px",
                }}
              >
                <strong>
                  Age
                </strong>

                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "8px",
                    marginTop: "8px",
                  }}
                >
                  {availableAges.map(
                    (option) => (
                      <button
                        key={option}
                        type="button"
                        onClick={() =>
                          handleAgeChange(
                            option
                          )
                        }
                        style={{
                          minWidth:
                            "60px",
                          padding:
                            "11px 14px",
                          borderRadius:
                            "8px",
                          border:
                            age ===
                            option
                              ? "2px solid #166534"
                              : "1px solid #d0d5dd",
                          background:
                            age ===
                            option
                              ? "#ecfdf3"
                              : "white",
                          fontWeight:
                            age ===
                            option
                              ? 700
                              : 400,
                          cursor:
                            "pointer",
                        }}
                      >
                        {option}
                      </button>
                    )
                  )}
                </div>
              </div>

              <div
                style={{
                  marginTop: "22px",
                }}
              >
                <strong>
                  Team
                </strong>

                {selectedCategory && (
                  <div
                    style={{
                      marginTop: "4px",
                      marginBottom:
                        "10px",
                      fontSize: "13px",
                      color: "#68707c",
                    }}
                  >
                    {
                      selectedCategory.name
                    }
                  </div>
                )}

                <input
                  value={search}
                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target
                        .value
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
                    padding: "12px",
                    borderRadius:
                      "8px",
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
                    marginTop: "12px",
                  }}
                >
                  {teamsLoading && (
                    <p
                      style={{
                        color:
                          "#68707c",
                      }}
                    >
                      Loading teams...
                    </p>
                  )}

                  {teamError && (
                    <p
                      style={{
                        color:
                          "#b42318",
                      }}
                    >
                      {teamError}
                    </p>
                  )}

                  {!teamsLoading &&
                    !teamError &&
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
                            width:
                              "100%",
                            textAlign:
                              "left",
                            padding:
                              "13px 4px",
                            border: 0,
                            borderBottom:
                              "1px solid #eaecf0",
                            background:
                              "white",
                            cursor:
                              "pointer",
                          }}
                        >
                          <strong>
                            {team.name}
                          </strong>

                          {team.categoryName && (
                            <div
                              style={{
                                marginTop:
                                  "3px",
                                color:
                                  "#68707c",
                                fontSize:
                                  "13px",
                              }}
                            >
                              {
                                team.categoryName
                              }
                            </div>
                          )}
                        </button>
                      )
                    )}

                  {!teamsLoading &&
                    !teamError &&
                    selectedCategory &&
                    filteredTeams.length ===
                      0 && (
                      <p
                        style={{
                          color:
                            "#68707c",
                        }}
                      >
                        No matching
                        teams.
                      </p>
                    )}
                </div>
              </div>
            </>
          )}

          {categoryError && (
            <p
              style={{
                color: "#b42318",
                marginTop: "16px",
              }}
            >
              {categoryError}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
