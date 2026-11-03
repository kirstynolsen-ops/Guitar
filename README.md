# Guitar Studio

A high school guitar classroom app with class repertoire, rhythm practice, click tracks, chord diagrams and browser-saved student journals.

## Run

Node.js **22.13 or newer** is required.

```sh
npm ci
npm start
```

The server listens on port 3000 (`PORT` overrides it). `npm test` runs server, rhythm, authentication and upload/storage integration tests. Google is replaced by a test double in authentication tests; those tests do not establish live Google OAuth readiness.

No Google credentials are needed to browse the app locally. Unconfigured teacher sign-in and uploads stay disabled. Configure the variables in `.env.example` through your hosting service (the app does not automatically read `.env`). See [Google Drive and Render setup](DEPLOYMENT.md) for live activation.

## Teacher music management

Approved teachers sign in directly with Google, without Clever. Upload up to 20 PDF/PNG/JPEG files per batch, with a shared class, skill group, skill tags and Working on now flag. Each file becomes a separate piece, named from its filename. PDFs can have up to 10 pages and each input file can be up to 12 MB. PDF.js renders previews in the teacher's browser; the original and page images are stored on the server. The teacher screen reports individual failures without discarding successful uploads.

Teachers can edit titles, class, skill group, skill tags and current focus. Each piece has a stable ID so editing metadata preserves student journal associations. Removing a piece removes it from the library (Drive assets are retained as an archive; disk assets are deleted); students' existing local journal data is not erased. Original bundled PDFs remain in GitHub even if removed from the catalog.

Only server-verified Google accounts on `TEACHER_EMAILS` can change the catalog or upload files. Sessions use HTTP-only, SameSite cookies, expire after eight hours, and require signing in again after a server restart. OAuth uses state bound to a browser cookie, PKCE, a nonce and server-side Google ID-token verification. Mutation endpoints check the request Origin. Files are checked by signature and stored under server-generated names. Files and the repertoire library are public; teacher access controls editing, not student access to music.

## Storage and hosting

**Google Drive is the default storage provider.** It stores the library catalog, uploaded originals and inline preview images in one app-managed folder, so no Render disk is needed. Render still runs the site. Connect Google Drive from the teacher workspace, then privately save the exported folder ID and refresh credential in Render's environment. Uploads stay disabled until durable connection settings are present. Tokens are not stored in Drive or committed to code.

The app uses `drive.file`: only app-created files and files explicitly selected in Google's picker are accessible. Teachers can upload files from their computer or import selected Drive files (requires the Picker API key and project number). Importing creates a separate published copy and previews; simply placing a file in the Drive folder does not publish it. Students do not need access to the folder. Removing a Drive-backed entry unpublishes it and keeps its Drive files as an archive. Do not manually delete the catalog or files that published scores use.

Google access is verified server-side; the backend serves only assets registered in the catalog. Catalog writes are serialized within one app instance. Drive failures do not fall back to publishing an empty replacement catalog. Local tests use an in-memory Drive double and do not establish live Google readiness. See DEPLOYMENT.md for consent, token expiry, school approval, setup and backup details.

The optional filesystem provider uses `STORAGE_PROVIDER=disk` and a persistent `DATA_DIR`. Browsing without configured storage uses an ignored local seed catalog; uploads and catalog mutations remain disabled. An existing disk library is not automatically migrated when switching to Drive. Back up data before changing providers.

## Student tools

- Beginning, Intermediate and Advanced Guitar libraries, each with current pieces and skill groups
- Search and progress filters; inline music, enlarged score view and original download
- Per-piece journal: strings, starting fret, independent practice, click-track readiness and dated reflections
- Click track at 40–180 BPM with a stronger first beat, stopping on navigation or tab hiding
- Rhythm practice: whole, half, quarter and paired eighth notes, no rests; four-beat count-in, 40–160 BPM and optional example
- Chord diagrams, personal practice logs and journal downloads

**Student sign-in and cloud journal synchronization are not implemented.** Student work remains in localStorage in that browser and can be removed by school browser-clearing policies. Students should download copies. Teacher authentication does not make students' journals available to the teacher, or connect accounts across devices. The app does not record or grade playing.

## Adding bundled music in code

Existing scores are served from `music/`. To render a PDF with Poppler:

```sh
pdftoppm -scale-to 2400 -png -singlefile music/example.pdf music/example
```

New music should normally be added through the authenticated teacher upload screen after live setup is complete.

## Tab and notation practice

Students can practice tab to staff, staff to tab, or both directions, selecting any of the six strings. Questions use natural notes in first position (frets 0–3), unique pitch choices, guitar's octave-transposed treble clef, and appropriate ledger lines. Feedback connects the correct note name with string and fret. Each round contains 10 questions; students retry incorrect choices and each answer counts as an attempt. A correct answer advances the question; the tenth correct answer automatically opens the report. Strings and direction are selected before the round and locked once an answer is submitted. The report contains student name, optional class/period, questions correct out of 10, total attempts, and reflection only; there is no question/answer list. Students download a formatted PDF directly. Starting a new round clears the results after confirmation. Reports stay in the browser tab and are not uploaded automatically. Unit tests check every pitch against standard tuning and verify question choices; browser checks cover both directions, scoring and responsive layout.

## Chord progression lab

Randomize four or eight measures of 4/4 using G7, G, C, Am and Em. Students can choose a subset of these learned chords. Each measure uses one chord with a four-beat rhythm; every generated progression includes whole, half, quarter and paired eighth note values, with no rests. Consecutive chords differ when multiple chords are selected. The page displays chord finger diagrams and a reusable click track; randomizing or changing settings stops playback. G7 is also available in the chord library with low-to-high frets 3, 2, 0, 0, 0, 1.


## PDF journal submissions

Practice journals, per-piece repertoire journals and notation round reports download directly as PDFs generated locally in the browser. Students enter a name and optional class/period; reports use a consistent layout with headings, dates, compact summaries, labeled responses and page numbers. Long entries wrap onto additional pages. Repertoire/practice journals include all saved entries, newest first. The notation PDF includes round totals and reflection only. Names entered for export are remembered only in page memory. Report content is not sent to the server or Drive. Fonts and the PDF library are served locally, with DejaVu font licensing in `fonts/LICENSE.txt`. No print-menu step or text-file conversion is required.
