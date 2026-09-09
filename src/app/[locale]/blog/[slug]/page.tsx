import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { BLOG_POSTS, getBlogPost, relatedPosts } from "@/data/blog";
import { routing } from "@/i18n/routing";
import BlogCard from "@/components/blog/BlogCard";

type Params = { locale: string; slug: string };

export function generateStaticParams() {
  return routing.locales.flatMap((locale) => BLOG_POSTS.map((p) => ({ locale, slug: p.slug })));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getBlogPost(slug);
  const meta = await getTranslations({ locale, namespace: "metadata" });
  if (!post) return { title: meta("titleTemplate", { title: "Blog" }) };
  return {
    title: meta("titleTemplate", { title: post.title }),
    description: post.excerpt,
    openGraph: { title: post.title, description: post.excerpt, type: "article", publishedTime: post.publishedAt },
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();
  const related = relatedPosts(post);
  const date = new Date(post.publishedAt).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" });

  return (
    <article className="bg-white">
      <header className="relative overflow-hidden bg-[#050B12] py-20 text-white">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-[-40%] h-[50vh] w-[70vw] -translate-x-1/2 rounded-full bg-cyan/20 blur-[140px]" />
        </div>
        <div className="container-page relative max-w-3xl">
          <Link href="/blog" className="inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Blog
          </Link>
          <p className="eyebrow mt-6 text-cyan-glow">{post.category}</p>
          <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-balance sm:text-5xl">{post.title}</h1>
          <p className="mt-5 text-lg leading-relaxed text-white/65">{post.excerpt}</p>
          <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-white/55">
            <span>
              {post.author.name} · {post.author.role}
            </span>
            <span>{date}</span>
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" aria-hidden /> {post.readingMinutes} min read
            </span>
          </div>
        </div>
      </header>

      <div className="container-page max-w-3xl py-14">
        <div className="space-y-10">
          {post.sections.map((section, i) => (
            <section key={i}>
              {section.heading && (
                <h2 className="font-display text-2xl font-bold tracking-tight text-ink">{section.heading}</h2>
              )}
              {section.paragraphs.map((p, j) => (
                <p key={j} className="mt-4 text-[17px] leading-[1.8] text-ink-muted">
                  {p}
                </p>
              ))}
              {section.bullets && (
                <ul className="mt-4 space-y-2.5">
                  {section.bullets.map((b) => (
                    <li key={b} className="flex gap-3 text-[16px] leading-relaxed text-ink-muted">
                      <span className="mt-[11px] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan" />
                      {b}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>

        {post.cta && (
          <div className="mt-14 rounded-2xl border border-slate-200 bg-[#F5F7FA] p-6 sm:flex sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-ink">Put this into practice on Suplymate.</p>
            <Link href={post.cta.href} className="btn-primary mt-4 sm:mt-0">
              {post.cta.label} <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          </div>
        )}
      </div>

      {related.length > 0 && (
        <section className="border-t border-slate-100 bg-[#F5F7FA]">
          <div className="container-page py-14">
            <h2 className="text-heading-lg text-ink">Keep reading</h2>
            <div className="mt-6 grid gap-5 md:grid-cols-3">
              {related.map((p) => (
                <BlogCard key={p.slug} post={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
