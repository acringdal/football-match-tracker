"use client";

import { useEffect, useMemo, useState } from "react";

type Gender = "Girls" | "Boys";

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

export default function Home() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [favourites, setFavourites] = useState<Team[]>([]);

  const [showTeamPicker, setShowTeamPicker] = useState(false);

  const [gender, setGender] = useState<Gender>("Girls");
  const [age, setAge] = useState<number>(14);
  const [search, setSearch] = useState("");

  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [teamsLoading, setTeamsLoading] = useState(false);

  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCategories() {
      try {
        setCategoriesLoading(true);
        setError("");

        const response = await fetch(
          "/api/cupmanager/categories",
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Could not load categories");
        }

        const data: CategoriesResponse =
          await response.json();

        if (!controller.signal.aborted) {
          setCategories(data.categories);
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        if (!controller.signal.aborted) {
          setError(
            "Could not load tournament categories from Fotballfest."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setCategoriesLoading(false);
        }
      }
    }

    loadCategories();

    return () => {
      controller.abort();
    };
  }, []);

  const availableAges = useMemo(() => {
    return Array.from(
      new Set(
        categories
          .filter(
            (category) =>
              category.gender === gender
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
      setTeamsLoading(false);
      return;
    }

    const controller = new AbortController();

    const categoryId = selectedCategory.id;

    async function loadTeams() {
      try {
        setTeamsLoading(true);
        setError("");
        setTeams([]);
        setSearch("");

        const response = await fetch(
          `/api/cupmanager/teams?categoryId=${categoryId}`,
          {
            cache: "no-store",
            signal: controller.signal,
          }
        );

        if (!response.ok) {
          throw new Error("Could not load teams");
        }

        const data: TeamsResponse =
          await response.json();

        if (
          !controller.signal.aborted &&
          data.categoryId === categoryId
        ) {
          setTeams(data.teams);
        }
      } catch (error) {
        if (
          error instanceof DOMException &&
          error.name === "AbortError"
        ) {
          return;
        }

        if (!controller.signal.aborted) {
          setTeams([]);
          setError(
            "Could not load teams from Fotballfest."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setTeamsLoading(false);
        }
      }
    }

    loadTeams();

    return () => {
      controller.abort();
    };
  }, [showTeamPicker, selectedCategory]);

  const filteredTeams = useMemo(() => {
    const text = search.trim().toLowerCase();

    if (!text) {
      return teams;
    }

    return teams.filter((team) => {
      const searchableText = [
        team.name,
        team.fullName,
        team.categoryName,
        team.suffix,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(text);
    });
  }, [teams, search]);

  function handleGenderChange(newGender: Gender) {
    setGender(newGender);
    setSearch("");
    setTeams([]);
    setError("");

    const newGenderAges = categories
      .filter(
        (category) =>
          category.gender === newGender
      )
      .map((category) => category.age)
      .sort((a, b) => a - b);

    if (newGenderAges.length === 0) {
      return;
    }

    if (newGenderAges.includes(age)) {
      return;
    }

    if (newGenderAges.includes(14)) {
      setAge(14);
      return;
    }

    setAge(newGenderAges[0]);
  }

  function handleAgeChange(newAge: number) {
    setAge(newAge);
    setSearch("");
    setTeams([]);
    setError("");
  }

  function addFavourite(team: Team) {
    setFavourites((current) => {
      if (
        current.some(
          (item) => item.id === team.id
        )
      ) {
        return current;
      }

      return [...current, team];
    });

    setShowTeamPicker(false);
    setSearch("");
  }

  function removeFavourite(teamId: number) {
    setFavourites((current) =>
      current.filter(
        (team) => team.id !== teamId
      )
    );
  }

  function openTeamPicker() {
    setSearch("");
    setTeams([]);
    setError("");
    setShowTeamPicker(true);
  }

  function closeTeamPicker() {
    setSearch("");
    setError("");
    setShowTeamPicker(false);
  }

  return (
    <main
      style={{
        maxWidth: "600px",
        margin: "0 auto",
        padding: "24px 16px 60px",
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
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        + Add favourite team
      </button>

      {favourites.length === 0 ? (
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
            Add a team to see upcoming, live and played matches.
          </p>
        </div>
      ) : (
        <section
          style={{
            marginTop: "28px",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
            }}
          >
            ⭐ Favourite teams
          </h2>

          {favourites.map((team) => (
            <div
              key={team.id}
              style={{
                marginTop: "10px",
                padding: "16px",
                background: "white",
                borderRadius: "12px",
                display: "flex",
                justifyContent:
                  "space-between",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  minWidth: 0,
                }}
              >
                <strong>
                  {team.name}
                </strong>

                {team.categoryName && (
                  <div
                    style={{
                      marginTop: "4px",
                      fontSize: "14px",
                      color: "#68707c",
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
                  flexShrink: 0,
                  border: 0,
                  background: "transparent",
                  color: "#b42318",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Remove
              </button>
            </div>
          ))}
        </section>
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
              alignItems: "center",
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
              onClick={closeTeamPicker}
              style={{
                border: 0,
                background: "transparent",
                fontSize: "24px",
                lineHeight: 1,
                cursor: "pointer",
              }}
              aria-label="Close team selector"
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
              Loading tournament categories...
            </p>
          ) : (
            <>
              <div>
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
                    ["Girls", "Boys"] as Gender[]
                  ).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        handleGenderChange(option)
                      }
                      style={{
                        flex: 1,
                        padding: "11px",
                        borderRadius: "8px",
                        border:
                          gender === option
                            ? "2px solid #166534"
                            : "1px solid #d0d5dd",
                        background:
                          gender === option
                            ? "#ecfdf3"
                            : "white",
                        fontWeight:
                          gender === option
                            ? 700
                            : 400,
                        cursor: "pointer",
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
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
                          handleAgeChange(option)
                        }
                        style={{
                          minWidth: "60px",
                          padding: "11px 14px",
                          borderRadius: "8px",
                          border:
                            age === option
                              ? "2px solid #166534"
                              : "1px solid #d0d5dd",
                          background:
                            age === option
                              ? "#ecfdf3"
                              : "white",
                          fontWeight:
                            age === option
                              ? 700
                              : 400,
                          cursor: "pointer",
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
                      marginBottom: "10px",
                      fontSize: "13px",
                      color: "#68707c",
                    }}
                  >
                    {selectedCategory.name}
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
                    padding: "12px",
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
                    marginTop: "12px",
                  }}
                >
                  {teamsLoading && (
                    <p
                      style={{
                        color: "#68707c",
                      }}
                    >
                      Loading teams...
                    </p>
                  )}

                  {!teamsLoading &&
                    !error &&
                    filteredTeams.map(
                      (team) => (
                        <button
                          key={team.id}
                          type="button"
                          onClick={() =>
                            addFavourite(team)
                          }
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "13px 4px",
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
                                marginTop: "3px",
                                color: "#68707c",
                                fontSize: "13px",
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
                    !error &&
                    selectedCategory &&
                    filteredTeams.length ===
                      0 && (
                      <p
                        style={{
                          color: "#68707c",
                        }}
                      >
                        No matching teams.
                      </p>
                    )}
                </div>
              </div>
            </>
          )}

          {error && (
            <p
              style={{
                color: "#b42318",
                marginTop: "16px",
              }}
            >
              {error}
            </p>
          )}
        </section>
      )}
    </main>
  );
}
