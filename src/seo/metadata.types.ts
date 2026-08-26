export interface PageMetadataInput {
  /** Without the site name — the factory appends it. Keep under ~45 characters. */
  readonly title: string;
  readonly description: string;
  /** Route path beginning with a slash, from routes.constants.ts. */
  readonly route: string;
  /** Set for pages that must not be indexed: utilities, previews, thank-you pages. */
  readonly noIndex?: boolean;
  /** Overrides the default social image. Absolute or root-relative. */
  readonly imagePath?: string;
  /** ISO date. Surfaced to crawlers as the content's freshness signal. */
  readonly lastModified?: string;
}
