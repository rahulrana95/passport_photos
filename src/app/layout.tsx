import type { Metadata, Viewport } from 'next';
import { ColorSchemeScript, mantineHtmlProps } from '@mantine/core';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { SiteFooter } from '@/components/layout/SiteFooter/SiteFooter';
import { SiteHeader } from '@/components/layout/SiteHeader/SiteHeader';
import { SkipLink } from '@/components/layout/SkipLink/SkipLink';
import { AppProviders } from '@/components/providers/AppProviders';
import { env } from '@/config/env.config';
import { DEFAULT_LOCALE, SITE_DESCRIPTION, SITE_NAME } from '@/constants/site.constants';
import '@mantine/core/styles.css';
import '@/styles/globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(env.NEXT_PUBLIC_SITE_URL),
  title: { default: SITE_NAME, template: `%s | ${SITE_NAME}` },
  description: SITE_DESCRIPTION,
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  colorScheme: 'light dark',
};

const RootLayout = ({ children }: { readonly children: React.ReactNode }): React.JSX.Element => (
  <html lang={DEFAULT_LOCALE} dir="ltr" {...mantineHtmlProps}>
    <head>
      {/* Applies the stored colour scheme before first paint, so the page never
          flashes the wrong theme. */}
      <ColorSchemeScript defaultColorScheme="auto" />
    </head>
    <body>
      <AppProviders>
        <SkipLink />
        <SiteHeader />
        {children}
        <SiteFooter />
      </AppProviders>
      {/*
        Both are same-origin and cookieless: the script is served from
        /_vercel/insights and beacons go back to the same host, so a visitor
        watching the Network tab to verify their photo is not uploaded sees
        first-party requests rather than a wall of third-party calls. That
        distinction is why these are acceptable here and an ad stack is not.

        Neither can see anything derived from the image. Analytics records page
        views; Speed Insights records Core Web Vitals, which is how we find out
        whether the LCP budget actually holds on real devices rather than only
        in CI.
      */}
      <Analytics />
      <SpeedInsights />
    </body>
  </html>
);

export default RootLayout;
