import { ImageResponse } from "next/og";
import { getTranslations } from "next-intl/server";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "metadata" });

  return new ImageResponse(
    (
      <div
        style={{
          alignItems: "center",
          background: "#091e42",
          color: "#ffffff",
          display: "flex",
          flexDirection: "column",
          height: "100%",
          justifyContent: "center",
          padding: "72px",
          textAlign: "center",
          width: "100%",
        }}
      >
        <div style={{ color: "#67e8f9", fontSize: 34, fontWeight: 700 }}>
          {t("siteName")}
        </div>
        <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.08, marginTop: 28 }}>
          {t("title")}
        </div>
        <div style={{ color: "#cbd5e1", fontSize: 30, lineHeight: 1.35, marginTop: 28 }}>
          {t("description")}
        </div>
      </div>
    ),
    size,
  );
}
