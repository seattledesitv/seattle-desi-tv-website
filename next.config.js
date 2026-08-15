/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' }
    ]
  },
  async headers() {
    const noIndex = [{ key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive' }];
    const privateRouteRoots = [
      '/my-assignments', '/my-availability', '/my-businesses', '/my-classifieds',
      '/my-community-submissions', '/my-contact-requests', '/my-coverage', '/my-editing',
      '/my-event-organizations', '/my-events', '/my-events-v2', '/my-hub', '/my-id-badge',
      '/my-influencer-profile', '/my-organizations', '/my-press-releases', '/my-profile',
      '/my-review', '/my-role-requests', '/my-sponsorships', '/my-video-assignments',
      '/debug-admin', '/debug-storage', '/debug-supabase',
    ];
    return [
      { source: '/studio/:path*', headers: noIndex },
      { source: '/account/:path*', headers: noIndex },
      { source: '/payments/:path*', headers: noIndex },
      ...privateRouteRoots.flatMap((source) => [
        { source, headers: noIndex },
        { source: `${source}/:path*`, headers: noIndex },
      ]),
      { source: '/login', headers: noIndex },
      { source: '/onboarding', headers: noIndex },
      { source: '/notifications', headers: noIndex },
      { source: '/update-password', headers: noIndex },
      { source: '/unsubscribe', headers: noIndex },
    ];
  }
};
module.exports = nextConfig;
