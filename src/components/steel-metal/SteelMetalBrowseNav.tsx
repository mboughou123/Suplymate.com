import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  listMillNavSubcategories,
  listMoreMetalsSubcategories,
  steelMetalSubcategoryHref,
} from "@/data/taxonomy/steel-metal";

type Props = {
  currentId: string;
};

export default async function SteelMetalBrowseNav({ currentId }: Props) {
  const t = await getTranslations("steelMetal");
  const mill = listMillNavSubcategories();
  const more = listMoreMetalsSubcategories();

  return (
    <nav className="space-y-6" aria-label={t("allSubcategories")}>
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
          {t("allSubcategories")}
        </p>
        <ul className="mt-3 space-y-1">
          {mill.map((item) => {
            const current = item.id === currentId;
            return (
              <li key={item.id}>
                <Link
                  href={steelMetalSubcategoryHref(item.id)}
                  aria-current={current ? "page" : undefined}
                  className={`block cursor-pointer rounded-xl px-3 py-2 text-sm transition-colors duration-200 ${
                    current
                      ? "bg-navy text-white"
                      : "text-ink-muted hover:bg-slate-50 hover:text-ink"
                  }`}
                >
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
      {more.length > 0 && (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-dim">
            {t("moreMetals")}
          </p>
          <ul className="mt-3 space-y-1">
            {more.map((item) => {
              const current = item.id === currentId;
              return (
                <li key={item.id}>
                  <Link
                    href={steelMetalSubcategoryHref(item.id)}
                    aria-current={current ? "page" : undefined}
                    className={`block cursor-pointer rounded-xl px-3 py-2 text-sm transition-colors duration-200 ${
                      current
                        ? "bg-navy text-white"
                        : "text-ink-muted hover:bg-slate-50 hover:text-ink"
                    }`}
                  >
                    {item.name}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </nav>
  );
}
