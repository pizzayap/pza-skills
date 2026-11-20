# Facts

Checked Oct 2026. Re-check the Vercel Analytics, Next.js third-party and Search Console docs when these facts are more than a few months old or contradict what you see in the project.

- `@next/third-parties` is still marked experimental. Keep its version aligned with `next`.
- Vercel: mount `<Analytics />` from `@vercel/analytics/next`. For Vite or plain React, import from `@vercel/analytics/react`. Local dev does not report.
