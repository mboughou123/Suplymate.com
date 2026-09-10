import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { sortedPosts, BLOG_CATEGORIES } from "@/data/blog";
import BlogCard from "@/components/blog/BlogCard";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const meta = await getTranslations({ locale, namespace: "metadata" });
  return {
    title: meta("titleTemplate", { title: "Blog" }),
    description:
      "Essays on industrial sourcing, supplier selection and AI-assisted procurement from the Suplymate team.",
  };
}

export default async function BlogIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const posts = sortedPosts();
  const [featured, ...rest] = posts;

  return (
    <div className="bg-white">
      <section className="relative overflow-hidden bg-[#050B12] py-20 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-40%] h-[50vh] w-[70vw] -translate-x-1/2 rounded-full bg-cyan/20 blur-[140px]" />
        </div>
        <div className="container-page relative">
          <p className="eyebrow text-cyan-glow">Blog</p>
          <h1 className="mt-3 max-w-2xl font-display text-4xl font-bold tracking-tight text-balance sm:text-5xl">
            Notes on sourcing, suppliers and AI-assisted procurement.
          </h1>
          <p className="mt-4 max-w-xl text-white/65">
            Practical writing for people who buy industrial materials and components — from first order to procurement at scale.
          </p>
          <div className="mt-6 flex flex-wrap gap-2 text-xs">
            {BLOG_CATEGORIES.map((c) => (
              <span key={c} className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-white/75">
                {c}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="container-page -mt-10 pb-24">
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="lg:col-span-3">
            <BlogCard post={featured} featured />
          </div>
          {rest.map((post) => (
            <BlogCard key={post.slug} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
}
