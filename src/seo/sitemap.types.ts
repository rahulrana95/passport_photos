export type ChangeFrequency = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';

export interface SitemapEntryInput {
  readonly route: string;
  /**
   * ISO date. For a country page this MUST be the specification's lastVerified
   * date, never the build date — otherwise every rebuild tells crawlers the
   * whole site changed, and the signal becomes worthless.
   */
  readonly lastModified?: string;
  readonly changeFrequency?: ChangeFrequency;
  readonly priority?: number;
}
