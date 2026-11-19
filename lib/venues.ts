export type VenueConfig = {
  locationId: number;
  name: string;
  latitude: number;
  longitude: number;
};

export const venues: VenueConfig[] = [
  {
    locationId: 45682296,
    name: "Liland idrettsplass",
    latitude: 60.28418,
    longitude: 5.24479,
  },
  {
    locationId: 45682203,
    name: "Nesttun idrettsplass",
    latitude: 60.311414,
    longitude: 5.345299,
  },
  {
    locationId: 45682228,
    name: "Stavollen idrettspark",
    latitude: 60.27722,
    longitude: 5.32188,
  },
];

export function getVenueByLocationId(
  locationId: number
): VenueConfig | null {
  return (
    venues.find(
      (venue) =>
        venue.locationId === locationId
    ) ?? null
  );
}
