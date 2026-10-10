"use client";

import { useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  GeoJSON as LeafletGeoJSON,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { FeatureCollection } from "geojson";
import "leaflet/dist/leaflet.css";

function FitBounds({ geojson }: { geojson: FeatureCollection | null }) {
  const map = useMap();
  useEffect(() => {
    if (!geojson?.features?.length) return;
    const layer = L.geoJSON(geojson);
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [28, 28], maxZoom: 10, animate: true });
    }
  }, [geojson, map]);
  return null;
}

export function DistrictMap({
  geojson,
}: {
  geojson: FeatureCollection | null;
}) {
  return (
    <div className="map-shell">
      <MapContainer
        center={[35.5, -79.8]}
        zoom={6}
        scrollWheelZoom={false}
        className="district-map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {geojson ? (
          <LeafletGeoJSON
            key={JSON.stringify(geojson.features?.[0]?.properties || {})}
            data={geojson}
            style={{
              color: "#1d4f3a",
              weight: 2,
              fillColor: "#2f7a57",
              fillOpacity: 0.28,
            }}
          />
        ) : null}
        <FitBounds geojson={geojson} />
      </MapContainer>
    </div>
  );
}
