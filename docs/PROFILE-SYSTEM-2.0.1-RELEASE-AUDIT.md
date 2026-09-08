# Steadybar 2.0.1 — Profile-system release audit

This patch release hardens the Steadybar 2.0 practice-profile model without changing the IndexedDB identity, deleting history, or weakening the one-active-session safety rule.

## Corrected semantics

- The selected profile is the current workspace view: Library, Today, routines, goals and progress follow it.
- An unfinished practice session remains pinned to the profile/configuration snapshot with which it started. Switching the workspace does not re-label, mutate or duplicate that session.
- The database still permits only one active session globally. Attempting to start practice while another unfinished session exists resumes/returns to that session rather than creating parallel work.
- `Earlier practice` is a protected read-only historical attribution bucket. It can be reviewed in History but cannot be selected for new practice, edited, archived, restored or used by newly created sessions.
- Existing 2.0 workspaces whose active/primary pointers accidentally reference a historical bucket are repaired on startup. The repair changes selection pointers only; exercises, sessions and historical snapshots are not rewritten.
- If an older bad state archived every selectable profile, startup restores one non-historical profile rather than turning historical attribution into a practice workspace.
- Profiles support multiple ordered focus areas. The first remains the legacy `settings.aim` compatibility value; all selected focuses can influence recommendations.
- Blank profile names receive unique generated names (`Guitar`, `Guitar 2`, etc.). Explicit duplicate names are rejected so switching and history remain unambiguous.
- Archived duplicate profiles cannot be restored until renamed.
- The obsolete user-facing Primary-profile control has been removed. `primaryProfileId` remains an internal compatibility/fallback pointer for existing data.
- Profile management has its own `/profiles` route. Settings shows only a summary/link, preventing profile controls from becoming stale while preference edits are intentionally held dirty.
- History can review another profile or all profiles without changing the selected practice workspace.

## Browser synchronization audit

The first full PR run exposed one Firefox-only test race in the voice responsive matrix. The matrix clicked the asynchronous library `Start practice` action and immediately measured active-practice controls without waiting for the active route to render. Firefox occasionally inspected the old library DOM before the awaited launch handler completed.

The test now waits for `.active-title` to become visible before measuring the unchanged `Start practice` and `Finish block` controls. The 44px touch-target and viewport-bound assertions remain unchanged, with additional diagnostic context. A dedicated clean-install verifier reran the complete Firefox profile suite after this change and it passed before the change was committed to the PR branch.

A superseded Chromium run also exposed a timing-sensitive immutable-history test: immediately after `+ Clean change`, the test could capture the controller outcome list before the asynchronous durable session save completed, even though the later persisted segment correctly contained that result. The gate now waits until the active session in the store contains the committed outcome before taking the pre-edit snapshot. The actual immutable-segment assertions remain unchanged: editing task settings must create a new segment, preserve the prior segment's outcomes exactly, and start the new segment with no outcomes. A dedicated verifier reran the complete Chromium profile suite with this synchronization and passed before committing it to the PR branch.

## Voice review lifecycle audit

The final pre-release Firefox run exposed a real interaction problem rather than a test-only race. A high-fatigue Voice review first saved its result durably and then awaited a second persistence checkpoint from `practice.pause()` before the shared form dialog could close. On a slower browser the result was already safe, but the modal could remain visibly stuck while the pause checkpoint finished.

The flow now keeps the durable review save as the submit boundary, then starts the vocal-rest pause without blocking dialog dismissal. `practice.pause()` stops reference playback, metronome audio, timers and wake-lock activity synchronously before its first persistence await, so the safety action begins immediately. Completion still persists the paused session, and any pause failure is surfaced to the user rather than swallowed. A dedicated clean-install verifier passed **277/277 Node tests** and then reran the complete Firefox profile suite successfully with this product fix before committing it to the PR branch.

## Release blockers

Do not merge unless the exact final PR head passes all existing mandatory release gates:

- clean npm install, strict TypeScript, production build and complete Node tests;
- Chromium color/contrast, rendered UI, real IndexedDB/offline/backup/audio, responsive/workbench and profile-system suites;
- Firefox native persistence/recovery/offline/backup/audio, workbench and profile-system suites;
- WebKit native persistence/recovery/offline/backup/audio, workbench and profile-system suites.

The application patch has independently passed clean `npm ci`, strict TypeScript, production build and **277/277 Node tests**. The Firefox layout synchronization, Chromium durable-outcome synchronization and Voice review lifecycle fix have each separately passed their complete affected browser profile suite. The final user-authored PR head must still pass the complete three-engine workflow before merge.