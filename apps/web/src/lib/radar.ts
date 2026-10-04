import { createAutocompletePlugin } from "@radarlabs/plugin-autocomplete";
import { env } from "@rallycaststv/env/web";
import { Radar } from "radar-sdk-js";

export function initializeRadar() {
  if (typeof window === "undefined") {
    return;
  }

  const key = env.VITE_RADAR_PUBLISHABLE_KEY;
  if (key) {
    Radar.registerPlugin(createAutocompletePlugin());
    Radar.initialize(key);
  }
}

export { Radar } from "radar-sdk-js";
