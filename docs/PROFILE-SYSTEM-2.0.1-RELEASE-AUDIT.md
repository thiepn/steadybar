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

## Release blockers

Do not merge unless the exact PR head passes all existing mandatory release gates:

- clean npm install, strict TypeScript, production build and complete Node tests;
- Chromium color/contrast, rendered UI, real IndexedDB/offline/backup/audio, responsive/workbench and profile-system suites;
- Firefox native persistence/recovery/offline/backup/audio, workbench and profile-system suites;
- WebKit native persistence/recovery/offline/backup/audio, workbench and profile-system suites.

The patch has already been reconstructed independently from its exact release baseline and passed clean `npm ci`, strict TypeScript, production build and **277/277 Node tests**. Browser-engine certification remains mandatory before merge.