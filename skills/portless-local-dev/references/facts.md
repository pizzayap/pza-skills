# Facts

Checked Oct 2026. Re-check the Portless README and the linked Next.js docs when these facts are more than a few months old or contradict what you see in the project.

Portless is pre-1.0.

## Next.js and `allowedDevOrigins`

| Next.js | Does Portless `*.localhost` need `allowedDevOrigins`? |
| --- | --- |
| 16 | No. The dev server already allows `localhost`, its subdomains and the hostname it started with. Add nothing. |
| 15 | No. Cross-origin dev requests are not blocked, only warned about ("will block in a future major"). Adding `allowedDevOrigins: ['*.localhost']` silences the warning and is safe for the upgrade. |
| Any, with Portless LAN mode, `.local` names or a tunnel | Yes. Each hostname needs an entry. This is out of scope unless the user asks. |

Entries are hostnames only, with no scheme or port. `*` matches one label (`*.myapp.localhost` matches `admin.myapp.localhost`); `**` matches one or more. Source: [nextjs.org allowedDevOrigins](https://nextjs.org/docs/app/api-reference/config/next-config-js/allowedDevOrigins).
