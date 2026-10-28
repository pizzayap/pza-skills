# Lenses

Run each lens against the bounded diff. Each one has a question to answer and patterns that suggest where to look. A pattern match is a lead, never a finding: trace input to sink before reporting.

## Attack surface

**Question:** what can now be called that could not be called before, and by whom?

- New routes, API handlers, server actions, webhooks, message or queue consumers, exported functions, CLI flags.
- Signals: new files under `app/api/`, `pages/api/`, `routes/`; `export async function POST`; `"use server"`; new `app.get(` / `router.post(`; new webhook endpoints with no signature check.

## Trust boundaries

**Question:** where does data from a user, the network, a file or a model's output get used without a check?

- Missing auth or ownership checks: a handler reads `params.id` and loads the record without confirming it belongs to the caller.
- Checks that only exist in the client (a hidden button, a disabled field).
- Model or agent output treated as trusted input to a tool call, query or file write.

## Injection

**Question:** can attacker text change the meaning of a query, command, path, page or prompt?

| Kind | Signals |
| --- | --- |
| SQL / NoSQL | String-built queries, `raw(`, `$where`, `$regex` from input, query objects spread from `req.body` |
| Shell | `exec(` / `execSync(` with template strings, `spawn(..., { shell: true })`, Python `shell=True` |
| Path traversal | `path.join(base, input)` or `resolve(base, input)` with no check that the result stays under `base` |
| HTML / script | `dangerouslySetInnerHTML`, `innerHTML =`, `v-html`, unescaped template output, `javascript:` URLs from input |
| Code | `eval(`, `new Function(`, `vm.runIn*`, unsafe deserialization such as Python `pickle.loads` |
| Header | Input written into `Set-Cookie`, `Location` or any header without stripping line breaks |
| Regex | A user-supplied pattern compiled with `new RegExp(input)` (catastrophic backtracking) |
| Prompt | Untrusted text concatenated into an agent's instructions or tool arguments |

## Files and processes

**Question:** can input decide where something is written, what is executed, or how much is read?

- Predictable temp file names, following symlinks, files created world-writable.
- Processes spawned with interpolated strings instead of argument arrays.
- Unbounded reads: `readFile` on a user-chosen path, request bodies with no size limit.

## Credentials

**Question:** can a secret end up somewhere an attacker can read it?

- Secrets in code, logs, error messages, URLs or client bundles. In Next.js, any `NEXT_PUBLIC_*` value ships to the browser.
- Tokens with broader scope or longer lifetime than the feature needs.
- Stack traces or full error objects returned to the client.

## Network

**Question:** can input make the server call somewhere it should not, or weaken a connection?

- SSRF: `fetch(input)` or an image or webhook URL taken from the user, with no allowlist.
- Open redirects: `redirect(searchParams.get('next'))` with no same-origin check.
- Disabled TLS checks: `rejectUnauthorized: false`, `verify=False`, `NODE_TLS_REJECT_UNAUTHORIZED=0`.
- CORS: `Access-Control-Allow-Origin` echoing the request origin with credentials allowed, or `*` on an authenticated endpoint.
- Outbound calls with no timeout, or retries with no limit.

## Denial of service

**Question:** can an anonymous caller make the server do unbounded work?

- Loops, recursion, pagination or fan-out sized by input (`limit` with no cap).
- Queues or caches that grow per request with no eviction.
- Expensive work (image processing, AI calls, email sends) behind an unauthenticated or unthrottled endpoint.

## Dependencies and config

**Question:** did the change bring in code or settings that widen what can go wrong?

- New packages: names one letter off a popular package, very new or low-download packages, `postinstall` or `preinstall` scripts.
- Loosened version pins (`^` or `*` where an exact pin was), or a changed resolved URL in the lock file.
- Debug flags, permissive defaults, disabled security headers, broadened CI permissions (`permissions: write-all`, `pull_request_target` with a checkout of the PR head).
