import { area, length } from "@turf/turf";
import type {
  Feature,
  FeatureCollection,
  GeoJsonProperties,
  Geometry,
  Position,
} from "geojson";

export type SurveyGeoJSON = FeatureCollection<Geometry, GeoJsonProperties>;

export type SurveyMeasurements = {
  areaSqm: number;
  lengthM: number;
  perimeterM: number;
  polygonCount: number;
  lineCount: number;
  pointCount: number;
};

const MAX_FEATURES = 20_000;
const MAX_GEOJSON_BYTES = 20 * 1024 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isPosition(value: unknown): value is Position {
  if (!Array.isArray(value) || value.length < 2 || value.length > 3) return false;
  const [longitude, latitude, altitude] = value;
  return (
    typeof longitude === "number" &&
    Number.isFinite(longitude) &&
    longitude >= -180 &&
    longitude <= 180 &&
    typeof latitude === "number" &&
    Number.isFinite(latitude) &&
    latitude >= -90 &&
    latitude <= 90 &&
    (altitude === undefined || (typeof altitude === "number" && Number.isFinite(altitude)))
  );
}

function isLine(value: unknown): value is Position[] {
  return Array.isArray(value) && value.length >= 2 && value.every(isPosition);
}

function isRing(value: unknown): value is Position[] {
  if (!Array.isArray(value) || value.length < 4 || !value.every(isPosition)) return false;
  const first = value[0];
  const last = value[value.length - 1];
  return first[0] === last[0] && first[1] === last[1];
}

function isGeometry(value: unknown): value is Geometry {
  if (!isRecord(value) || typeof value.type !== "string") return false;

  switch (value.type) {
    case "Point":
      return isPosition(value.coordinates);
    case "MultiPoint":
      return Array.isArray(value.coordinates) && value.coordinates.every(isPosition);
    case "LineString":
      return isLine(value.coordinates);
    case "MultiLineString":
      return Array.isArray(value.coordinates) && value.coordinates.every(isLine);
    case "Polygon":
      return (
        Array.isArray(value.coordinates) &&
        value.coordinates.length > 0 &&
        value.coordinates.every(isRing)
      );
    case "MultiPolygon":
      return (
        Array.isArray(value.coordinates) &&
        value.coordinates.length > 0 &&
        value.coordinates.every(
          (polygon) =>
            Array.isArray(polygon) &&
            polygon.length > 0 &&
            polygon.every(isRing),
        )
      );
    case "GeometryCollection":
      return (
        Array.isArray(value.geometries) &&
        value.geometries.every(isGeometry)
      );
    default:
      return false;
  }
}

export function isSurveyGeoJSON(value: unknown): value is SurveyGeoJSON {
  if (
    !isRecord(value) ||
    value.type !== "FeatureCollection" ||
    !Array.isArray(value.features) ||
    value.features.length === 0 ||
    value.features.length > MAX_FEATURES
  ) {
    return false;
  }

  return value.features.every(
    (feature) =>
      isRecord(feature) &&
      feature.type === "Feature" &&
      (feature.geometry === null || isGeometry(feature.geometry)) &&
      (feature.properties === null || isRecord(feature.properties)),
  );
}

export function getSurveyGeoJSONByteLength(data: SurveyGeoJSON): number {
  return new TextEncoder().encode(JSON.stringify(data)).byteLength;
}

export function isSurveyGeoJSONWithinLimit(data: SurveyGeoJSON): boolean {
  return getSurveyGeoJSONByteLength(data) <= MAX_GEOJSON_BYTES;
}

export function measureSurveyGeoJSON(data: SurveyGeoJSON): SurveyMeasurements {
  const measurements: SurveyMeasurements = {
    areaSqm: 0,
    lengthM: 0,
    perimeterM: 0,
    polygonCount: 0,
    lineCount: 0,
    pointCount: 0,
  };

  const measureGeometry = (geometry: Geometry) => {
    if (geometry.type === "GeometryCollection") {
      geometry.geometries.forEach(measureGeometry);
      return;
    }

    const feature: Feature<Geometry, GeoJsonProperties> = {
      type: "Feature",
      properties: null,
      geometry,
    };

    if (geometry.type === "Polygon" || geometry.type === "MultiPolygon") {
      measurements.areaSqm += area(feature);
      measurements.perimeterM += length(feature, { units: "meters" });
      measurements.polygonCount += geometry.type === "Polygon"
        ? 1
        : geometry.coordinates.length;
    } else if (geometry.type === "LineString" || geometry.type === "MultiLineString") {
      measurements.lengthM += length(feature, { units: "meters" });
      measurements.lineCount += geometry.type === "LineString"
        ? 1
        : geometry.coordinates.length;
    } else if (geometry.type === "Point" || geometry.type === "MultiPoint") {
      measurements.pointCount += geometry.type === "Point"
        ? 1
        : geometry.coordinates.length;
    }
  };

  data.features.forEach((feature) => {
    if (feature.geometry) measureGeometry(feature.geometry);
  });

  return measurements;
}
