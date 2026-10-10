export type OfficeType =
  | "us_senate"
  | "us_house"
  | "statewide_executive"
  | "statewide_judicial"
  | "nc_senate"
  | "nc_house";

/** Highest → lowest jurisdiction for result sorting */
export const JURISDICTION_ORDER: OfficeType[] = [
  "us_senate",
  "us_house",
  "statewide_executive",
  "statewide_judicial",
  "nc_senate",
  "nc_house",
];

export function jurisdictionRank(officeType: string): number {
  const idx = JURISDICTION_ORDER.indexOf(officeType as OfficeType);
  return idx === -1 ? 99 : idx;
}

export function officeLabel(officeType: string): string {
  switch (officeType) {
    case "us_senate":
      return "US Senate";
    case "us_house":
      return "US House";
    case "statewide_executive":
      return "Statewide Executive";
    case "statewide_judicial":
      return "Statewide Judicial";
    case "nc_senate":
      return "NC Senate";
    case "nc_house":
      return "NC House";
    default:
      return officeType;
  }
}
