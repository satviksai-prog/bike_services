# Cyber Shield server-side integrations

The browser always performs the local, evidence-based checks in
`js/shared-evidence-engine.js`. It does not contain threat-intelligence keys.

- `analyze-content` is an optional, lightweight webpage brand-impersonation
  check. It safely fetches public HTTP(S) pages with a timeout and never follows
  redirects server-side. If it is not deployed or cannot reach a page, the scan
  remains complete and says that external verification is unavailable.
- `report-sender` increments `sender_reports` through the Admin SDK. Browser
  clients only have read access to these counts.

Deploy these only from an authenticated Supabase CLI session after running
`supabase/schema.sql` in the project SQL editor:

```text
supabase functions deploy analyze-content
supabase functions deploy report-sender
```

For future services such as Google Safe Browsing or VirusTotal, place service
keys only in Supabase Edge Function environment variables. Return the provider
name and its exact status to the UI; never create a result when the provider is
not configured, rate-limited, or unavailable.
