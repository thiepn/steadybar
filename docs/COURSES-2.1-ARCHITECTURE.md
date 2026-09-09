# Guided learning architecture and QA

## Boundaries

`src/learning/catalog.ts` is a static, typed, original catalogue. `sources.ts` identifies educational/research coverage sources. `types.ts` separates immutable teaching definitions, session provenance, remembered setup and user learning records. `validation.ts` performs bounded runtime validation, including imported passing checks. `engine.ts` contains pure, testable commands operating on the fresh transactional workspace copy. `src/pages/courses.ts` and `src/ui/learning.ts` render learning and launch the existing practice controller; they do not create a second timer, storage engine or navigation system.

Learning is available offline because the normal build/service worker includes the catalogue and all local code. No new npm runtime dependency, hosted AI API, audio asset store or account system is introduced.

## State and provenance

The physical IndexedDB schema adds one `courseProgress` store. A record is unique per `(profileId, courseId)` and can hold placement responses, remembered launch options, lesson notes and append-only assessment attempts. At most one course per profile is selected. A second Guitar profile owns a completely separate learning record.

A lesson attempt records its own ID, date, content revision, criterion responses, knowledge answers, separate confidence, observation and evidence. A finished timer does not mutate course status. A failed or reflection-only attempt remains visible. Imported unknown course revisions are retained but do not pass the installed content.

`lessonSource` on planned and practiced blocks records course, lesson, task and revision. Session snapshots preserve it. The learner can change duration or tempo through the guided block editor without destroying the lesson's protocol. Actual task reconfiguration removes the changed segment's attribution. Completed history still retains its original snapshot.

## Persistence safety

All learning commands use `store.workspace` → `mutateWorkspace` against fresh committed records, not stale page snapshots. Whole-workspace validation checks unique learning ownership, profile availability and imported assessment consistency. Existing full-transaction commit barriers, rollback and broadcast refresh apply. Notes and attempts merge without erasing one another. Backup version 3 includes all profiles' learning records; v1/v2 inputs remain supported. See `MIGRATION-COURSES-2.1.md`.

## UI

Learn exposes course overviews, suggested entry checks, lessons, optional local pitch references, plain text scores, chord-fret tables, rhythm grids, two-task launch/planning, assessment explanations, review history and notes. Mobile lesson outlines initially collapse to prioritize teaching. Controls use existing appearance tokens and touch-target conventions. Text/notes are rendered through safe text nodes. Reference audio stops on route/profile exit. Unfinished sessions are explicit; launching another course does not reassign them.

## Tests and exact release gates

- Existing 277 Node cases remain; new cases cover all 94 lesson contracts, actual protocol compatibility, content/source identities, score dimensions, immutable provenance, duration allocation, beat-unit preservation, voice ranges and interval endpoints, prepared-reading semantics, evidence rejection, idempotency, profile isolation, notes, review scheduling, placement, Today append/deduplication, revision behavior and v3 imports.
- Transaction-adapter tests additionally verify concurrent note/review preservation, commit durability, failed-review rollback and backup/reset behavior. These are controlled repository tests, not native IndexedDB proof.
- `tests/courses.py` adds 17 browser cases: reviews, knowledge failure, placement/profile isolation, plan editing, voice setup, unfinished-session protection, a real-duration two-block guided session, safe notes/search, reference cleanup, native v3 restore/offline, native DB3→4 migration and six responsive instrument matrices.
- The course layout matrix covers widths 320, 390, 768, 1024 and 1440, with 44px control checks, no document overflow and example rendering. Existing larger profile/workbench matrices are retained.
- `--render` is explicitly the in-document, memory-storage harness. The native upgrade and offline/restore cases skip with an explanation there. This environment blocks localhost browser navigation, so no claim of native local certification is made.
- `.github/workflows/pages.yml` runs every existing release gate plus the full new course suite in native Chromium, Firefox and WebKit. Failures block deployment. No assertion was removed to obtain a release.

A passing automated suite is not a physical-device, accessibility, medical or independent teaching-quality certification. Final PR and production CI results must be recorded separately once executed.
