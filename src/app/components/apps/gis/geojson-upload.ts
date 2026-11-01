import shp from "shpjs";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import {
  isSurveyGeoJSON,
  isSurveyGeoJSONWithinLimit,
  type SurveyGeoJSON,
} from "@/lib/field-survey-geojson";

const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

function normalizeGeoJSON(value: unknown): SurveyGeoJSON {
  let collection: FeatureCollection<Geometry>;
  if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "FeatureCollection" &&
    "features" in value &&
    Array.isArray(value.features)
  ) {
    collection = value as FeatureCollection<Geometry>;
  } else if (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    value.type === "Feature"
  ) {
    collection = {
      type: "FeatureCollection",
      features: [value as Feature<Geometry>],
    };
  } else {
    throw new Error("Berkas harus berisi FeatureCollection atau Feature GeoJSON.");
  }

  if (!isSurveyGeoJSON(collection)) {
    throw new Error(
      "Struktur GeoJSON tidak valid. Pastikan koordinat menggunakan WGS84 (EPSG:4326).",
    );
  }
  if (!isSurveyGeoJSONWithinLimit(collection)) {
    throw new Error("Ukuran data setelah diproses melebihi batas 20 MB.");
  }
  return collection;
}

export async function readSpatialUpload(file: File): Promise<SurveyGeoJSON> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Ukuran berkas maksimal 25 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "zip") {
    const parsed = await shp(await file.arrayBuffer());
    const collections = Array.isArray(parsed) ? parsed : [parsed];
    const features = collections.flatMap((collection) => collection.features);
    return normalizeGeoJSON({
      type: "FeatureCollection",
      features,
    });
  }

  if (extension === "json" || extension === "geojson") {
    let parsed: unknown;
    try {
      parsed = JSON.parse(await file.text());
    } catch (error) {
      console.error("Parsing uploaded GeoJSON failed:", error);
      throw new Error("Berkas JSON/GeoJSON tidak dapat dibaca.");
    }
    return normalizeGeoJSON(parsed);
  }

  throw new Error("Pilih berkas .zip Shapefile atau .geojson/.json.");
}
