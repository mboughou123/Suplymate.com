import { redirect } from "next/navigation";
import { checkAdmin } from "@/lib/admin";
import { listMedia } from "@/lib/media-store";
import { storageProviderStatus } from "@/lib/image-storage";
import MediaLibraryClient from "./MediaLibraryClient";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({ locale, pathname: "/admin/media", titleKey: "adminMediaTitle", descriptionKey: "adminDescription", robots: { index: false, follow: false } });
}

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const { ok, authenticated } = await checkAdmin();
  if (!authenticated) redirect("/login?callbackUrl=/admin/media");
  if (!ok) redirect("/");

  const media = await listMedia();
  const storage = storageProviderStatus();

  return (
    <MediaLibraryClient
      initialMedia={media}
      storage={{
        provider: storage.provider,
        configured: storage.configured,
        recommendation: storage.recommendation,
      }}
    />
  );
}
