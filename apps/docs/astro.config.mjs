// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import react from '@astrojs/react';

export default defineConfig({
  site: 'https://jacarma.github.io',
  base: '/enforma/',
  output: 'static',
  vite: {
    ssr: {
      noExternal: [/^@mui\//, /^@emotion\//],
      resolve: {
        conditions: ['import', 'module', 'browser', 'default'],
      },
    },
  },
  integrations: [
    starlight({
      title: 'Enforma',
      logo: {
        // Resolved relative to apps/docs/ (the Astro project root)
        src: './public/enforma-logo.svg',
        replacesTitle: true,
      },
      customCss: ['./src/styles/custom.css'],
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Installation', slug: 'installation' },
            { label: 'Quick start', slug: 'quick-start' },
          ],
        },
        {
          label: 'Concepts',
          items: [
            { label: 'Reactive props', slug: 'concepts/reactive-props' },
            { label: 'Validation', slug: 'concepts/validation' },
            { label: 'Typed form values', slug: 'concepts/typed-form-values' },
            { label: 'Data sources', slug: 'concepts/datasources' },
          ],
        },
        {
          label: 'Components',
          items: [
            { label: 'Form', slug: 'components/form' },
            { label: 'TextInput', slug: 'components/text-input' },
            { label: 'Textarea', slug: 'components/textarea' },
            { label: 'Select', slug: 'components/select' },
            { label: 'Checkbox & Switch', slug: 'components/checkbox-switch' },
            { label: 'RadioGroup', slug: 'components/radio-group' },
            { label: 'Autocomplete', slug: 'components/autocomplete' },
            { label: 'ExclusiveToggle', slug: 'components/exclusive-toggle' },
            { label: 'NumberInput', slug: 'components/number-input' },
            { label: 'Date & Time', slug: 'components/date-time' },
            { label: 'Fieldset', slug: 'components/fieldset' },
            { label: 'List', slug: 'components/list' },
            { label: 'Calculated', slug: 'components/calculated' },
            { label: 'Output', slug: 'components/output' },
            { label: 'Submit', slug: 'components/submit' },
            { label: 'Scope', slug: 'components/scope' },
          ],
        },
        {
          label: 'Guides',
          items: [
            { label: 'Custom components', slug: 'guides/custom-components' },
            { label: 'Adapters', slug: 'guides/adapters' },
            { label: 'Plain React comparison', slug: 'guides/plain-react-comparison' },
          ],
        },
        {
          label: 'Reference',
          items: [
            { label: 'CommonProps', slug: 'reference/common-props' },
            { label: 'API', slug: 'reference/api' },
          ],
        },
      ],
    }),
    react(),
  ],
});
