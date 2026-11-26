# Search engine setup

The canonical website is https://jobshadow.co.za. Public information pages explicitly allow indexing. Account, sign-in, password and unknown pages inherit `noindex, follow`. These directives are search hints, not access controls; existing authentication is unchanged.

Public URLs are listed in https://jobshadow.co.za/sitemap.xml and advertised in robots.txt. The sitemap is generated from fixed public pages and published Insights; drafts and archived records are excluded. `/share-experience` and `/send-to-a-friend` permanently redirect to the corresponding section on `/contact`, which combines contact and sharing content. Query variants use the public page's clean canonical URL.

## Google Search Console

1. Open https://search.google.com/search-console and add `jobshadow.co.za` as a Domain property.
2. Verify ownership using Google's DNS TXT record at the domain's DNS provider. Alternatively, add the `https://jobshadow.co.za/` URL-prefix property and provide its HTML verification tag for inclusion in the app.
3. Submit `https://jobshadow.co.za/sitemap.xml` under Sitemaps.
4. Inspect Home, Careers and Blogs and request indexing. Monitor Pages and Search Performance for crawl errors and discovery.

Ownership and indexing cannot be claimed from a repository deployment. Do not invent verification tokens. The same sitemap can be submitted to Bing Webmaster Tools after ownership is verified. No analytics, tracking cookies, paid search service or emails are added by this setup.

When adding a public page, include `publicSeo()` in its route head and add its canonical URL to `PUBLIC_PATHS` in `src/lib/insights-sitemap.ts`. Published Insights are included automatically. Keep titles and descriptions specific to the page. Structured data must describe visible content; do not fabricate dates, ratings, reviews or availability.
