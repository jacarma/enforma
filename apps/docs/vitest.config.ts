// apps/docs/vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@mui/x-date-pickers/AdapterDayjs': resolve(
        __dirname,
        'src/test/mocks/mui-x-date-pickers-adapter-stub.ts',
      ),
      '@mui/x-date-pickers/AdapterDateFns': resolve(
        __dirname,
        'src/test/mocks/mui-x-date-pickers-adapter-stub.ts',
      ),
      '@mui/x-date-pickers/AdapterLuxon': resolve(
        __dirname,
        'src/test/mocks/mui-x-date-pickers-adapter-stub.ts',
      ),
      '@mui/x-date-pickers/AdapterMoment': resolve(
        __dirname,
        'src/test/mocks/mui-x-date-pickers-adapter-stub.ts',
      ),
      '@mui/x-date-pickers': resolve(__dirname, 'src/test/mocks/mui-x-date-pickers.tsx'),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
  },
});
