"use client";

import { useEffect, useState } from "react";
import { captureAttribution, readAttribution } from "@/lib/attribution";

/** Mounted once in the site layout: records the first page of the visit (see src/lib/attribution.ts). */
export function AttributionCapture() {
  useEffect(captureAttribution, []);
  return null;
}

/** Hidden `source` field for forms posted straight to a server action. */
export function AttributionField() {
  const [value, setValue] = useState("");
  useEffect(() => setValue(readAttribution()), []);
  return <input type="hidden" name="source" value={value} />;
}
