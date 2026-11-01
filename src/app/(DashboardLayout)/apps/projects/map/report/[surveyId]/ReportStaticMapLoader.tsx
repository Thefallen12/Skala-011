"use client";

import dynamic from "next/dynamic";
import type { FeatureCollection } from "geojson";

const ReportStaticMap = dynamic(() => import("./ReportStaticMap"), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-slate-200" />,
});

export default function ReportStaticMapLoader({
  data,
}: {
  data: FeatureCollection;
}) {
  return <ReportStaticMap data={data} />;
}
