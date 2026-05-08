import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  // Note: project lives on iCloud-synced Desktop, which races with webpack
  // and produces missing/truncated vendor chunks in dev. The companion
  // `npm run dev` symlinks `.next` to /private/tmp before starting Next, so
  // build artifacts stay on local disk while distDir keeps its default name.
};

export default withNextIntl(nextConfig);
