/*
  # Add Daily Analytics Aggregation Cron Jobs

  ## Summary
  The analytics dashboard was showing all zeros because the aggregation functions
  that populate the summary tables were never being called automatically.
  Raw event data was accumulating in:
    - analytics_searches (977 entries existed but never aggregated)
    - user_daily_activity (empty because track_user_activity was never called)

  This migration adds scheduled pg_cron jobs to run the aggregation functions
  daily at midnight UTC, so the dashboard always shows up-to-date data.

  ## New Cron Jobs
  1. `aggregate-search-metrics-daily` - runs `aggregate_search_metrics()` at 00:05 UTC
     Populates: search_advertising_metrics, top_search_queries
  2. `aggregate-dau-mau-daily` - runs `aggregate_daily_metrics()` at 00:10 UTC
     Populates: daily_active_users_summary (DAU, MAU, stickiness ratio, platform breakdown)

  ## Notes
  - Jobs run 5-10 minutes after midnight to avoid any timezone edge cases
  - Both aggregate the PREVIOUS day (CURRENT_DATE - 1) so all events for that day are captured
  - Uses ON CONFLICT so re-running is safe (idempotent)
*/

-- Schedule daily aggregation of search metrics (runs at 00:05 UTC)
SELECT cron.schedule(
  'aggregate-search-metrics-daily',
  '5 0 * * *',
  $$ SELECT aggregate_search_metrics(CURRENT_DATE - 1) $$
);

-- Schedule daily aggregation of DAU/MAU metrics (runs at 00:10 UTC)
SELECT cron.schedule(
  'aggregate-dau-mau-daily',
  '10 0 * * *',
  $$ SELECT aggregate_daily_metrics(CURRENT_DATE - 1) $$
);
