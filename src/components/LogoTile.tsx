import { LOGO_IMAGE_CLASS, LOGO_INITIALS_CLASS, LOGO_MONO_CLASS, LOGO_TILE_CLASS, logoNeedsMono } from "@/lib/logo-tile";

export default function LogoTile({
  src,
  alt,
  initials,
  mono,
  className = "",
}: {
  src?: string | null;
  alt: string;
  initials?: string;
  /** Force the dark mono filter. Defaults to the white-artwork list. */
  mono?: boolean;
  className?: string;
}) {
  const paintDark = mono ?? logoNeedsMono(src);
  if (!src) {
    return (
      <span className={`${LOGO_TILE_CLASS} ${LOGO_INITIALS_CLASS} ${className}`} data-logo-tile="white" aria-hidden>
        {initials}
      </span>
    );
  }
  return (
    <span className={`${LOGO_TILE_CLASS} ${className}`} data-logo-tile="white" data-logo-mono={paintDark ? "true" : "false"}>
      {/* Local and published files, including SVG. Served as-is, not redrawn. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className={`${LOGO_IMAGE_CLASS} ${paintDark ? LOGO_MONO_CLASS : ""}`}
        loading="lazy"
        decoding="async"
      />
    </span>
  );
}
