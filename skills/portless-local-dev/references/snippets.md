# Snippets

## Local-request guard

Some apps protect dev-only routes (seed endpoints, admin tools) by checking that the request came from this machine. Behind Portless the host becomes `myapp.localhost`, so a guard that only accepts `localhost` starts rejecting every request. Widen it to exactly this list and nothing more.

```ts
const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isLocalHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return LOOPBACK.has(host) || host.endsWith('.localhost');
}

export function isLocalRequest(req: Request): boolean {
  const host = new URL(req.url).hostname;
  const origin = req.headers.get('origin');
  if (!isLocalHost(host)) return false;
  if (origin && !isLocalHost(new URL(origin).hostname)) return false;
  return true;
}
```

Tests to add next to it:

| Input host | Expected |
| --- | --- |
| `localhost` | allowed |
| `myapp.localhost` | allowed |
| `fix-ui.myapp.localhost` (worktree prefix) | allowed |
| `127.0.0.1`, `::1` | allowed |
| `myapp.local` | rejected |
| `192.168.1.20` | rejected |
| `example.com` | rejected |
| `localhost.example.com` | rejected |

Update the guard's error message to name the accepted hosts, so the next person knows why a request failed.

## AGENTS.md rule

Paste this into the project's AGENTS.md or editor rule file:

```markdown
## Local dev URL

- Start the app with the normal `dev` script and open the URL Portless prints. If it prints a host:port variant, use that exact URL.
- Never open `localhost:<port>` or pass `--port` to work around Portless.
- If a dev server for this app is already running, reuse its URL. Do not start a second one.
- Use the bypass (`PORTLESS=0 <pm> run dev`) only when Portless itself is broken and the user agrees.
```

## README block

```markdown
## Local development

Requires Node 24+ on PATH.

First run only: `npx portless trust` (adds the local certificate) and `npx portless proxy start`.

`<pm> run dev` then open https://myapp.localhost

Bypass Portless: `PORTLESS=0 <pm> run dev`
```
