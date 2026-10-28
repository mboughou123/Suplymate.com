import { describe, expect, it } from "vitest";
import { ATTRIBUTION_STORAGE_KEY, captureFirstTouch } from "@/lib/attribution";

function memoryStorage() {
  const store = new Map<string, string>();
  return {
    store,
    storage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    },
  };
}

describe("captureFirstTouch", () => {
  it("keeps UTM params from the first landing when a later page has different params", () => {
    const { store, storage } = memoryStorage();
    captureFirstTouch(
      storage,
      {
        pathname: "/en/supplier/harbour-steel",
        search: "?utm_source=linkedin&utm_medium=social&utm_campaign=prelaunch&utm_content=post-a",
      },
      "https://www.linkedin.com/",
    );
    captureFirstTouch(
      storage,
      { pathname: "/en/early-access", search: "?utm_source=x&utm_medium=social&utm_campaign=prelaunch" },
      "https://x.com/",
    );

    expect(JSON.parse(store.get(ATTRIBUTION_STORAGE_KEY) ?? "{}")).toEqual({
      utmSource: "linkedin",
      utmMedium: "social",
      utmCampaign: "prelaunch",
      utmContent: "post-a",
      referrer: "https://www.linkedin.com/",
      landingPath:
        "/en/supplier/harbour-steel?utm_source=linkedin&utm_medium=social&utm_campaign=prelaunch&utm_content=post-a",
    });
  });
});
