# AI Office Triage Playbooks

Use this map after collecting a snapshot with `scripts/collect_snapshot.sh`.

## 1) Frontend blank screen

Signals:
- Browser shows blank page.
- Frontend build/typecheck fails.
- API still healthy.

Check:
- `bun run --filter @ai-office/frontend typecheck`
- `bun run --filter @ai-office/frontend build`
- Runtime API shape vs `packages/shared/src/types.ts`

Fix pattern:
- Align shared type changes with frontend rendering code.
- Guard null/undefined fields before render.
- Rebuild and verify summary/task APIs still parse.

## 2) All agents show idle / no visible progress

Signals:
- `/api/agents` all idle.
- `/api/tasks` has items in `todo` or `in_progress` but no recent task updates.
- Logs show scheduler heartbeat without dispatch effects.

Check:
- `schedulerEnabled` setting.
- Task dispatch loop in `packages/backend/src/scheduler/jobs.ts`.
- Assignment + status transition paths.

Fix pattern:
- Restore dispatch conditions and transitions (`todo -> in_progress`).
- Ensure message send path to assignee still triggers.
- Confirm logs emit `task_updated` after dispatch.

## 3) Task stuck in review/in_progress

Signals:
- `minutesSinceUpdate` exceeds thresholds.
- Summary flags stuck counters.

Current thresholds:
- `in_progress > 90m`
- `review > 120m`

Check:
- Last `task_updated` event for task id.
- Whether any automation exists for that status.
- Whether `done` transition is blocked by validation (github URLs, deliverable metadata).

Fix pattern:
- If stuck by missing metadata, improve agent prompt/tool path to attach required fields.
- If stuck by workflow gap, add explicit transition handling or user-facing action path.
- Keep status machine explicit and auditable.

## 4) Telegram summary not sent

Signals:
- No `Telegram status summary sent` activity.
- Scheduler runs summary check but no send.

Check:
- `/api/settings`: `telegramSummaryEnabled`, `telegramSummaryIntervalMinutes`, `telegramChatId`
- Bot token presence in settings secrets.
- Notifier path in `packages/backend/src/notifications/summary-notifier.ts`

Fix pattern:
- Separate config validation from send logic.
- Improve error surfacing into `agent_error` activity.
- Add deterministic test with `POST /api/settings/telegram/test`.

## 5) 400 errors in activity

Signals:
- `agent_error` or route responses show HTTP 400.
- Happens around task updates or settings updates.

Check:
- Request payload shape vs shared type contracts.
- Backend validators and repository constraints.
- Null byte/sanitization edge cases for DB text fields.

Fix pattern:
- Normalize payload data at route boundary.
- Keep repository validators strict but error messages actionable.
- Add guardrails for malformed user/agent tool args.

## 6) Deploy/regression after push

Signals:
- New deployment starts but behavior regresses.
- Scheduler starts yet prior behavior missing.

Check:
- Railway startup logs and current service image.
- Config/env deltas.
- Migrations or schema mismatch.

Fix pattern:
- Reproduce locally with same code path.
- Patch smallest regression point.
- Validate with typecheck + build + live API smoke checks.
