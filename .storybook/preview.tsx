import React from 'react';
import type { Decorator, Preview } from '@storybook/nextjs-vite';
import { MantineProvider } from '@mantine/core';
import { appCssVariablesResolver, appTheme } from '../src/theme/mantine-theme.config';
import '@mantine/core/styles.css';
import '../src/styles/globals.css';

/**
 * Stories render through the same provider and the same token stylesheet as
 * production. If Storybook diverged here, every screenshot would be a lie.
 */
const withTheme: Decorator = (Story, context) => {
  const colorScheme = context.globals['colorScheme'] === 'dark' ? 'dark' : 'light';

  return (
    <MantineProvider
      theme={appTheme}
      cssVariablesResolver={appCssVariablesResolver}
      forceColorScheme={colorScheme}
    >
      <div data-mantine-color-scheme={colorScheme} style={{ padding: '1.5rem' }}>
        <Story />
      </div>
    </MantineProvider>
  );
};

const preview: Preview = {
  decorators: [withTheme],
  globalTypes: {
    colorScheme: {
      description: 'Theme',
      defaultValue: 'light',
      toolbar: {
        icon: 'circlehollow',
        items: [
          { value: 'light', title: 'Light' },
          { value: 'dark', title: 'Dark' },
        ],
      },
    },
  },
  parameters: {
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    a11y: { test: 'error' },
  },
};

export default preview;
