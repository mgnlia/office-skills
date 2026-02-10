---
name: office-self-heal
description: Diagnose and self-heal AI Office backend/frontend/runtime issues by reading activity logs, API state, and Railway logs, then applying minimal safe code fixes and validating with typecheck/build. Use when users report blank frontend, agent errors, stuck tasks, idle agents, missing Telegram notifications, 4xx/5xx errors, deployment regressions, or stale activity.
---

# Office Self-Heal

Run a deterministic debug-and-fix loop for the AI Office codebase using logs first, then targeted code changes.

## Workflow

1. Collect evidence before editing code.
2. Classify the failure signature.
3. Apply the smallest safe fix.
4. Validate locally.
5. Deploy or send a test signal when requested.
6. Report root cause, fix, and residual risk.

## Step 1: Collect Evidence

Run the bundled snapshot script first.

```bash
scripts/collect_snapshot.sh <api-url> [limit] [out_dir]
```

Examples:

```bash
scripts/collect_snapshot.sh https://ai-office-production-9428.up.railway.app
scripts/collect_snapshot.sh http://localhost:3100 800 tmp/office-diagnose-local
```

The script captures:
- `/api/health`, `/api/agents`, `/api/tasks`, `/api/settings`, `/api/logs`, `/api/logs/summary`
- Quick JSON summaries (if `jq` exists)
- Railway status/logs when `railway` CLI is available

Also collect local code context:

```bash
git status --short --branch
rg -n "error|stuck|telegram|summary|scheduler|review|in_progress" packages/backend/src packages/frontend/src
```

## Step 2: Classify the Problem

Use `references/triage-playbooks.md` to map signals to likely root causes.

Prioritize in this order:
1. Runtime hard failures (crash, DB/auth/config failure)
2. Data integrity/state errors (tasks cannot progress, invalid statuses)
3. User-visible regressions (blank UI, missing activity, broken summaries)
4. Automation drift (scheduler/notifications not firing)

Never patch blindly. Tie every change to at least one observed log/API signal.

## Step 3: Apply Minimal Safe Fix

Use this fix policy:
- Edit only files linked to the observed signature.
- Keep patches narrow; avoid unrelated refactors.
- Preserve existing architecture unless the bug requires a design change.
- For task/status issues, fix status transition logic first; only then adjust messaging.
- For notification issues, verify settings + transport + message formatter separately.

## Step 4: Validate

Always run:

```bash
bun run typecheck
bun run build
```

When the issue is runtime/deployment-related, also verify with one or more:

```bash
curl -sS <api-url>/api/health
curl -sS <api-url>/api/logs/summary
curl -sS -X POST <api-url>/api/settings/telegram/test
```

## Step 5: Closeout Format

Report in this structure:
1. Root cause (1-2 sentences)
2. Evidence (specific log/API lines)
3. Fix (files changed + why)
4. Validation performed
5. Remaining risk or follow-up

## Guardrails

- Do not revert unrelated user changes.
- Do not use destructive git commands unless explicitly requested.
- Do not claim fixed status without validation outputs.
- If data migration is needed, clearly separate migration from bugfix and explain rollback path.

## References

- `references/triage-playbooks.md` for signature-to-fix mapping.
- `scripts/collect_snapshot.sh` for repeatable evidence collection.
