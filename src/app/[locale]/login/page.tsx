import { Suspense } from "react";
import LoginForm from "./LoginForm";
import AuthFormSkeleton from "@/components/AuthFormSkeleton";
import { buildLocalizedPageMetadata } from "@/lib/page-metadata";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return buildLocalizedPageMetadata({
    locale,
    pathname: "/login",
    titleKey: "loginTitle",
    descriptionKey: "loginDescription",
    robots: { index: false, follow: false },
  });
}

export default function LoginPage() {
  return (
    <Suspense fallback={<AuthFormSkeleton fields={2} />}>
      <LoginForm />
    </Suspense>
  );
}
