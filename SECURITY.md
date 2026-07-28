# Frontend security notes

## Dependency audit exception

`GHSA-qwww-vcr4-c8h2` is temporarily allowlisted in `audit-ci.json`.
The advisory affects React Router RSC action requests. This frontend is a
Vite client-side application with static prerendering and does not expose React
Server Components, framework actions, or React Router server request handlers.

Remove the exception as soon as a patched stable `react-router-dom` release is
available. Other high or critical production dependency advisories continue to
fail CI.
