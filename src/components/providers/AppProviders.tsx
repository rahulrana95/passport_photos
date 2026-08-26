'use client';

import { MantineProvider } from '@mantine/core';
import { appCssVariablesResolver, appTheme } from '@/theme/mantine-theme.config';
import type { AppProvidersProps } from './AppProviders.types';

/**
 * The single client boundary in the application shell. Kept as a leaf around
 * `children` so page content stays a Server Component and the static, rankable
 * HTML is not pulled into the client bundle.
 */
export const AppProviders = ({ children }: AppProvidersProps): React.JSX.Element => (
  <MantineProvider
    theme={appTheme}
    cssVariablesResolver={appCssVariablesResolver}
    defaultColorScheme="auto"
  >
    {children}
  </MantineProvider>
);
