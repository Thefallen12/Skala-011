"use client";

import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";

import { useEffect, useMemo, useRef, useState } from "react";
import L, {
  type FeatureGroup as LeafletFeatureGroup,
  type Layer,
  type PathOptions,
} from "leaflet";
import type { Feature, GeoJsonProperties, Geometry } from "geojson";
import {
  FeatureGroup,
  GeoJSON,
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import type { SurveyGeoJSON } from "@/lib/field-survey-geojson";
import type { SurveyLayerVisibility } from "./ProjectMapLoader";
import styles from "./ProjectMap.module.css";

type Basemap = "streets" | "dark" | "satellite" | "google-satellite";
type FeatureWithLocalId = Feature<Geometry, GeoJsonProperties> & {
  properties: Record<string, unknown> | null;
};

const googleMapsApiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

const drawMarkerIcon = L.divIcon({
  className: "survey-map-marker",
  html: '<span style="display:block;width:18px;height:18px;border:3px solid white;border-radius:50%;background:#f97316;box-shadow:0 1px 5px #0008"></span>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

L.Draw.Marker.prototype.setOptions({ icon: drawMarkerIcon });

function collectionFromFeatures(features: FeatureWithLocalId[]): SurveyGeoJSON {
  return { type: "FeatureCollection", features };
}

function getLocalId(layer: Layer): string | null {
  const feature = (layer as Layer & { feature?: FeatureWithLocalId }).feature;
  const id = feature?.properties?.__surveyLayerId;
  return typeof id === "string" ? id : null;
}

function layerToFeature(layer: Layer): FeatureWithLocalId {
  const geoJsonLayer = layer as Layer & {
    toGeoJSON: () => Feature<Geometry, GeoJsonProperties>;
  };
  return geoJsonLayer.toGeoJSON() as FeatureWithLocalId;
}

function getGeometryKinds(geometry: Geometry): Set<"polygon" | "line" | "point"> {
  if (geometry.type === "GeometryCollection") {
    return geometry.geometries.reduce<Set<"polygon" | "line" | "point">>(
      (kinds, nested) => new Set([...kinds, ...getGeometryKinds(nested)]),
      new Set(),
    );
  }
  if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
    return new Set(["polygon"]);
  }
  if (geometry.type === "LineString" || geometry.type === "MultiLineString") {
    return new Set(["line"]);
  }
  return new Set(["point"]);
}

function featureIsVisible(
  feature: Feature<Geometry, GeoJsonProperties>,
  visibility: SurveyLayerVisibility,
) {
  if (!feature.geometry) return false;
  return [...getGeometryKinds(feature.geometry)].some((kind) => visibility[kind]);
}

function geometryStyle(feature?: Feature<Geometry, GeoJsonProperties>): PathOptions {
  const kinds = feature?.geometry ? getGeometryKinds(feature.geometry) : new Set();
  if (kinds.has("polygon")) {
    return {
      color: "#f97316",
      weight: 2,
      fillColor: "#f97316",
      fillOpacity: 0.22,
    };
  }
  return { color: "#38bdf8", weight: 4, opacity: 0.9 };
}

function googleApiErrorMessage(result: unknown): string | null {
  if (
    typeof result !== "object" ||
    result === null ||
    !("error" in result) ||
    typeof result.error !== "object" ||
    result.error === null ||
    !("message" in result.error) ||
    typeof result.error.message !== "string"
  ) {
    return null;
  }
  return result.error.message;
}

function MapViewport({ data }: { data: SurveyGeoJSON | null }) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(container);
    map.invalidateSize();
    return () => observer.disconnect();
  }, [map]);

  useEffect(() => {
    if (!data?.features.length) return;
    const bounds = L.geoJSON(data).getBounds();
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [32, 32], maxZoom: 17 });
  }, [data, map]);

  return null;
}

function GoogleMapAttribution({
  session,
  apiKey,
  onCopyrightChange,
  onError,
}: {
  session: string;
  apiKey: string;
  onCopyrightChange: (copyright: string) => void;
  onError: (message: string) => void;
}) {
  const map = useMap();

  useEffect(() => {
    let controller: AbortController | null = null;
    let requestTimer: number | undefined;

    const updateCopyright = () => {
      controller?.abort();
      controller = new AbortController();
      const bounds = map.getBounds();
      const params = new URLSearchParams({
        session,
        key: apiKey,
        zoom: String(Math.floor(map.getZoom())),
        north: String(bounds.getNorth()),
        south: String(bounds.getSouth()),
        east: String(bounds.getEast()),
        west: String(bounds.getWest()),
      });

      void fetch(`https://tile.googleapis.com/tile/v1/viewport?${params}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            const result: unknown = await response.json();
            const detail = googleApiErrorMessage(result);
            throw new Error(
              detail ??
                `Google Maps gagal memuat atribusi data (HTTP ${response.status}).`,
            );
          }
          const result: unknown = await response.json();
          if (
            typeof result !== "object" ||
            result === null ||
            !("copyright" in result) ||
            typeof result.copyright !== "string"
          ) {
            throw new Error("Google Maps tidak mengembalikan atribusi data.");
          }
          onCopyrightChange(result.copyright);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === "AbortError") return;
          console.error("Loading Google Maps viewport attribution failed:", error);
          onError(
            error instanceof Error
              ? error.message
              : "Atribusi Google Maps gagal dimuat.",
          );
        });
    };

    const scheduleUpdate = () => {
      window.clearTimeout(requestTimer);
      requestTimer = window.setTimeout(updateCopyright, 180);
    };

    scheduleUpdate();
    map.on("moveend", scheduleUpdate);

    return () => {
      window.clearTimeout(requestTimer);
      map.off("moveend", scheduleUpdate);
      controller?.abort();
    };
  }, [apiKey, map, onCopyrightChange, onError, session]);

  return null;
}

export default function ProjectMap({
  importedData,
  importedDataVersion,
  drawnData,
  visibility,
  onDrawnDataChange,
}: {
  importedData: SurveyGeoJSON | null;
  importedDataVersion: number;
  drawnData: SurveyGeoJSON;
  visibility: SurveyLayerVisibility;
  onDrawnDataChange: (data: SurveyGeoJSON) => void;
}) {
  const featureGroupRef = useRef<LeafletFeatureGroup>(null);
  const [basemap, setBasemap] = useState<Basemap>("satellite");
  const [googleSession, setGoogleSession] = useState<string | null>(null);
  const [googleCopyright, setGoogleCopyright] = useState("");
  const [googleMapRequestError, setGoogleMapRequestError] = useState<string | null>(null);
  const [googleSessionAttempt, setGoogleSessionAttempt] = useState(0);

  useEffect(() => {
    if (basemap !== "google-satellite") return;
    if (!googleMapsApiKey) return;

    const controller = new AbortController();

    void fetch(
      `https://tile.googleapis.com/v1/createSession?key=${encodeURIComponent(googleMapsApiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mapType: "satellite",
          language: "id",
          region: "ID",
        }),
        signal: controller.signal,
      },
    )
      .then(async (response) => {
        if (!response.ok) {
          const result: unknown = await response.json();
          const detail = googleApiErrorMessage(result);
          throw new Error(
            `${detail ?? `Google Maps gagal membuat sesi basemap (HTTP ${response.status}).`} Periksa API key, pembatasan key, Map Tiles API, dan billing.`,
          );
        }
        const result: unknown = await response.json();
        if (
          typeof result !== "object" ||
          result === null ||
          !("session" in result) ||
          typeof result.session !== "string"
        ) {
          throw new Error("Google Maps tidak mengembalikan token sesi.");
        }
        setGoogleSession(result.session);
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("Creating Google Maps satellite session failed:", error);
        setGoogleMapRequestError(
          error instanceof Error
            ? error.message
            : "Basemap Google Maps gagal dimuat.",
        );
      });

    return () => controller.abort();
  }, [basemap, googleSessionAttempt]);

  const visibleImportedData = useMemo(() => {
    if (!importedData) return null;
    return {
      ...importedData,
      features: importedData.features.filter((feature) =>
        featureIsVisible(feature, visibility),
      ),
    };
  }, [importedData, visibility]);

  useEffect(() => {
    if (drawnData.features.length === 0) {
      featureGroupRef.current?.clearLayers();
      return;
    }
    featureGroupRef.current?.eachLayer((layer) => {
      const feature = (layer as Layer & { feature?: Feature<Geometry> }).feature;
      const visible =
        feature?.geometry !== null &&
        feature?.geometry !== undefined &&
        [...getGeometryKinds(feature.geometry)].some((kind) => visibility[kind]);
      if (layer instanceof L.Marker) {
        layer.setOpacity(visible ? 1 : 0);
        const element = layer.getElement();
        if (element) element.style.pointerEvents = visible ? "auto" : "none";
      } else if ("setStyle" in layer && typeof layer.setStyle === "function") {
        layer.setStyle({ opacity: visible ? 1 : 0, fillOpacity: visible ? 0.22 : 0 });
      }
    });
  }, [drawnData, visibility]);

  const updateDrawnFeature = (layer: Layer) => {
    const feature = layerToFeature(layer);
    const localId = getLocalId(layer);
    if (!localId) return null;
    feature.properties = {
      ...(feature.properties ?? {}),
      __surveyLayerId: localId,
    };
    (layer as Layer & { feature?: FeatureWithLocalId }).feature = feature;
    return feature;
  };

  const googleMapError =
    basemap === "google-satellite" && !googleMapsApiKey
      ? "Tambahkan NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ke .env, lalu aktifkan Map Tiles API dan billing di Google Cloud."
      : googleMapRequestError;
  const useGoogleSatellite =
    basemap === "google-satellite" &&
    Boolean(googleSession) &&
    !googleMapError;
  const googleTileAttribution = googleCopyright
    ? `Google Maps · ${googleCopyright}`
    : "Google Maps";

  return (
    <div className={`${styles.mapCanvas} relative h-full min-h-[420px] w-full overflow-hidden rounded-xl border border-border`}>
      <MapContainer
        center={[4.625, 96.84]}
        zoom={12}
        scrollWheelZoom
        className="h-full min-h-[420px] w-full"
      >
        {basemap === "streets" && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}
        {basemap === "dark" && (
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            maxZoom={20}
          />
        )}
        {(basemap === "satellite" ||
          (basemap === "google-satellite" && !useGoogleSatellite)) && (
          <TileLayer
            attribution="Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />
        )}
        {useGoogleSatellite && googleSession && (
          <>
            <TileLayer
              key={googleSession}
              attribution={googleTileAttribution}
              url={`https://tile.googleapis.com/v1/2dtiles/{z}/{x}/{y}?session=${encodeURIComponent(googleSession)}&key=${encodeURIComponent(googleMapsApiKey)}`}
              maxZoom={22}
              eventHandlers={{
                tileerror: () =>
                  setGoogleMapRequestError(
                    "Tile citra Google gagal dimuat. Periksa API key, pembatasan key, dan billing di Google Cloud.",
                  ),
              }}
            />
            <GoogleMapAttribution
              session={googleSession}
              apiKey={googleMapsApiKey}
              onCopyrightChange={setGoogleCopyright}
              onError={setGoogleMapRequestError}
            />
          </>
        )}

        {visibleImportedData && (
          <GeoJSON
            key={`${importedDataVersion}-${visibility.polygon}-${visibility.line}-${visibility.point}`}
            data={visibleImportedData}
            style={(feature) => geometryStyle(feature as Feature<Geometry>)}
            pointToLayer={(_feature, latLng) =>
              L.circleMarker(latLng, {
                radius: 7,
                color: "#c2410c",
                fillColor: "#f97316",
                fillOpacity: 0.95,
                weight: 2,
              })
            }
          />
        )}

        <FeatureGroup ref={featureGroupRef}>
          <EditControl
            position="topleft"
            onCreated={(event) => {
              const layer = event.layer;
              const feature = layerToFeature(layer);
              const localId = crypto.randomUUID();
              feature.properties = {
                ...(feature.properties ?? {}),
                __surveyLayerId: localId,
              };
              (layer as Layer & { feature?: FeatureWithLocalId }).feature = feature;
              onDrawnDataChange(
                collectionFromFeatures([
                  ...(drawnData.features as FeatureWithLocalId[]),
                  feature,
                ]),
              );
            }}
            onEdited={(event) => {
              const updates = new Map<string, FeatureWithLocalId>();
              event.layers.eachLayer((layer) => {
                const feature = updateDrawnFeature(layer);
                const localId = getLocalId(layer);
                if (feature && localId) updates.set(localId, feature);
              });
              onDrawnDataChange(
                collectionFromFeatures(
                  (drawnData.features as FeatureWithLocalId[]).map(
                    (feature) =>
                      updates.get(String(feature.properties?.__surveyLayerId)) ??
                      feature,
                  ),
                ),
              );
            }}
            onDeleted={(event) => {
              const removed = new Set<string>();
              event.layers.eachLayer((layer) => {
                const localId = getLocalId(layer);
                if (localId) removed.add(localId);
              });
              onDrawnDataChange(
                collectionFromFeatures(
                  (drawnData.features as FeatureWithLocalId[]).filter(
                    (feature) =>
                      !removed.has(String(feature.properties?.__surveyLayerId)),
                  ),
                ),
              );
            }}
            draw={{
              polygon: {
                allowIntersection: false,
                showArea: true,
                shapeOptions: { color: "#f97316", fillOpacity: 0.22 },
              },
              polyline: { shapeOptions: { color: "#38bdf8", weight: 4 } },
              marker: { icon: drawMarkerIcon },
              rectangle: false,
              circle: false,
              circlemarker: false,
            }}
            edit={{ edit: {}, remove: true }}
          />
        </FeatureGroup>
        <MapViewport data={importedData} />
      </MapContainer>

      <label className="absolute right-3 top-3 z-[1000] flex items-center gap-2 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs font-medium text-card-foreground shadow-md backdrop-blur">
        <span className="hidden sm:inline">Basemap</span>
        <select
          aria-label="Pilih basemap"
          value={basemap}
          onChange={(event) => {
            const nextBasemap = event.target.value as Basemap;
            if (nextBasemap === "google-satellite") {
              setGoogleMapRequestError(null);
              setGoogleSession(null);
              setGoogleCopyright("");
            }
            setBasemap(nextBasemap);
          }}
          className="rounded border-0 bg-transparent py-0.5 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="satellite">Satelit</option>
          <option value="google-satellite">Google Satellite</option>
          <option value="streets">OpenStreetMap</option>
          <option value="dark">Gelap</option>
        </select>
      </label>

      <div className="absolute bottom-3 left-3 z-[1000] rounded-md border border-border bg-card/90 px-2.5 py-1.5 text-[10px] text-muted-foreground shadow-sm backdrop-blur">
        {drawnData.features.length + (importedData?.features.length ?? 0)} fitur
        {" · "}WGS84
      </div>
      {basemap === "google-satellite" && !googleMapError && !googleSession && (
        <div className="absolute bottom-3 left-1/2 z-[1001] -translate-x-1/2 rounded-md border border-border bg-card/95 px-3 py-2 text-xs text-card-foreground shadow-md">
          Menghubungkan ke Google Satellite...
        </div>
      )}
      {basemap === "google-satellite" && googleMapError && (
        <div
          role="alert"
          className="absolute bottom-3 left-1/2 z-[1001] flex max-w-[min(34rem,calc(100%-1rem))] -translate-x-1/2 items-center gap-3 rounded-lg border border-destructive/30 bg-card/95 px-3 py-2 text-xs text-card-foreground shadow-lg backdrop-blur"
        >
          <span>{googleMapError}</span>
          {googleMapsApiKey && (
            <button
              type="button"
              className="shrink-0 font-semibold text-primary underline-offset-2 hover:underline"
              onClick={() => {
                setGoogleSession(null);
                setGoogleSessionAttempt((attempt) => attempt + 1);
                setGoogleMapRequestError(null);
              }}
            >
              Coba lagi
            </button>
          )}
        </div>
      )}
    </div>
  );
}
