export const SITE_URL = "https://jobshadow.co.za";
export const SOCIAL_IMAGE = `${SITE_URL}/assets/about-jobshadow-desk.jpeg`;

/** Public pages opt into indexing; account pages inherit noindex from the root. */
export function publicSeo(path: string) {
  const url = `${SITE_URL}${path}`;
  return {
    links: [{ rel: "canonical", href: url }],
    meta: [
      { name: "robots", content: "index, follow, max-image-preview:large" },
      { property: "og:url", content: url },
      { property: "og:site_name", content: "Job Shadow" },
      { property: "og:locale", content: "en_ZA" },
      { property: "og:image", content: SOCIAL_IMAGE },
      { property: "og:image:alt", content: "Job Shadow — explore your future career" },
      { name: "twitter:image", content: SOCIAL_IMAGE },
      { name: "twitter:image:alt", content: "Job Shadow — explore your future career" },
    ],
  };
}
