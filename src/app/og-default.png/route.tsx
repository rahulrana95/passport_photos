import { ImageResponse } from 'next/og';
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from '@/seo/metadata.constants';
import { SITE_NAME } from '@/constants/site.constants';
import { getContent } from '@/content/content.registry';
import {
  OG_BACKGROUND,
  OG_ACCENT,
  OG_CLAIM_SIZE_PX,
  OG_GAP_PX,
  OG_PADDING_PX,
  OG_RULE_HEIGHT_PX,
  OG_RULE_WIDTH_PX,
  OG_TEXT_MUTED,
  OG_TEXT_PRIMARY,
  OG_TITLE_SIZE_PX,
} from './og-image.constants';

/**
 * The picture every share of this site shows.
 *
 * It did not exist. Every page has declared an og:image at /og-default.png
 * since the metadata factory was written, and that path returned a 404 in
 * production — so every link posted to WhatsApp, Slack, Messages or a forum
 * rendered with no preview at all. For a product whose growth is somebody
 * telling somebody else to check their photo, that is the first impression
 * being thrown away.
 *
 * GENERATED RATHER THAN COMMITTED, and rendered at the exact path the metadata
 * already promises. A binary in the repository would drift from the wording it
 * quotes the moment either changed; this reads the same content module the
 * pages do, so the claim on the card is the claim on the site by construction.
 *
 * No web fonts are loaded. Fetching one would make every crawler's request for
 * this image depend on a third party being up, and the system stack renders
 * this layout perfectly well.
 */
export const runtime = 'nodejs';

/**
 * Rendered once at build time, not per request.
 *
 * Nothing about this card varies: no query, no cookie, no clock. Crawlers and
 * chat clients fetch it far more often than people load the site, and every
 * one of those would otherwise be a function invocation producing a byte-wise
 * identical PNG.
 */
export const dynamic = 'force-static';

export const GET = (): Response => {
  const content = getContent();

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: OG_GAP_PX,
          padding: OG_PADDING_PX,
          background: OG_BACKGROUND,
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            width: OG_RULE_WIDTH_PX,
            height: OG_RULE_HEIGHT_PX,
            background: OG_ACCENT,
            display: 'flex',
          }}
        />
        <div style={{ fontSize: OG_TITLE_SIZE_PX, color: OG_TEXT_PRIMARY, fontWeight: 700 }}>
          {SITE_NAME}
        </div>
        <div style={{ fontSize: OG_CLAIM_SIZE_PX, color: OG_TEXT_MUTED, display: 'flex' }}>
          {content.legal.privacyClaim}
        </div>
      </div>
    ),
    { width: OG_IMAGE_WIDTH, height: OG_IMAGE_HEIGHT },
  );
};
