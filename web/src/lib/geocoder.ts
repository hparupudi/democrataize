export type GeocoderDistricts = {
  usHouse: string | null;
  ncSenate: string | null;
  ncHouse: string | null;
  lat: number;
  lon: number;
  matchedAddress: string;
};

type GeoItem = {
  NAME?: string;
  BASENAME?: string;
  GEOID?: string;
  CD120?: string;
  SLDU?: string;
  SLDL?: string;
};

export async function geocodeNcAddress(input: {
  street: string;
  city: string;
  state: string;
  zip: string;
}): Promise<GeocoderDistricts> {
  const params = new URLSearchParams({
    street: input.street,
    city: input.city,
    state: input.state || "NC",
    zip: input.zip,
    benchmark: "Public_AR_Current",
    vintage: "Current_Current",
    format: "json",
  });

  const resp = await fetch(
    `https://geocoding.geo.census.gov/geocoder/geographies/address?${params}`,
    { next: { revalidate: 0 } },
  );
  if (!resp.ok) {
    throw new Error(`Census GeoCoder failed with HTTP ${resp.status}`);
  }

  const data = await resp.json();
  const match = data?.result?.addressMatches?.[0];
  if (!match) {
    throw new Error("Address not found by Census GeoCoder. Check the street address.");
  }

  const geos = match.geographies || {};
  const cd = (geos["120th Congressional Districts"]?.[0] ||
    geos["119th Congressional Districts"]?.[0]) as GeoItem | undefined;
  const sldu = (geos["2026 State Legislative Districts - Upper"]?.[0] ||
    geos["2024 State Legislative Districts - Upper"]?.[0]) as GeoItem | undefined;
  const sldl = (geos["2026 State Legislative Districts - Lower"]?.[0] ||
    geos["2024 State Legislative Districts - Lower"]?.[0]) as GeoItem | undefined;

  return {
    usHouse: cd?.CD120 ? String(cd.CD120).padStart(2, "0") : null,
    ncSenate: sldu?.SLDU ? String(sldu.SLDU).padStart(3, "0") : null,
    ncHouse: sldl?.SLDL ? String(sldl.SLDL).padStart(3, "0") : null,
    lat: Number(match.coordinates.y),
    lon: Number(match.coordinates.x),
    matchedAddress: match.matchedAddress,
  };
}

export function districtKeysFromGeocode(geo: GeocoderDistricts): string[] {
  const keys: string[] = ["nc:us_senate"];
  if (geo.usHouse) keys.push(`nc:us_house:${geo.usHouse}`);
  if (geo.ncSenate) keys.push(`nc:nc_senate:${geo.ncSenate}`);
  if (geo.ncHouse) keys.push(`nc:nc_house:${geo.ncHouse}`);
  return keys;
}
