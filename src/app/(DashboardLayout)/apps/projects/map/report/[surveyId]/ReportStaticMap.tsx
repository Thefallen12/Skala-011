"use client";

import "leaflet/dist/leaflet.css";

import { useEffect } from "react";
import {
  GeoJSON,
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import type { FeatureCollection, Geometry } from "geojson";

type ReportStaticMapProps = {
  data: FeatureCollection;
};

function FitReportBounds({ data }: ReportStaticMapProps) {
  const map = useMap();

  useEffect(() => {
    const bounds = L.geoJSON(data).getBounds();
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [24, 24], maxZoom: 17 });
      map.invalidateSize();
    }
  }, [data, map]);

  return null;
}

export default function ReportStaticMap({ data }: ReportStaticMapProps) {
  return (
    <MapContainer
      center={[0, 0]}
      zoom={2}
      className="h-full w-full"
      zoomControl={false}
      attributionControl={false}
      dragging={false}
      doubleClickZoom={false}
      scrollWheelZoom={false}
      touchZoom={false}
      boxZoom={false}
      keyboard={false}
    >
      <TileLayer
        attribution="Tiles &copy; Esri"
        url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
        maxZoom={19}
      />
      <GeoJSON
        data={data}
        style={(feature) => {
          const type = (feature?.geometry as Geometry | undefined)?.type ?? "";
          const isPolygon = type.includes("Polygon");
          return {
            color: isPolygon ? "#f97316" : "#38bdf8",
            weight: isPolygon ? 3 : 4,
            opacity: 1,
            fillColor: "#f97316",
            fillOpacity: isPolygon ? 0.35 : 0,
          };
        }}
        pointToLayer={(_feature, latLng) =>
          L.circleMarker(latLng, {
            radius: 7,
            color: "#ffffff",
            weight: 2,
            fillColor: "#f97316",
            fillOpacity: 1,
          })
        }
      />
      <FitReportBounds data={data} />
    </MapContainer>
  );
}
