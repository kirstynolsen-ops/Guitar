# Guitar Studio

A first prototype for a high school guitar classroom, optimized for Chromebooks.

## Run

Requires Node.js 22 or newer. No external packages or install step are needed.

```sh
npm start
```

The server listens on port 3000 (override with `PORT`). Run `npm test` for the HTTP smoke test.

## Included

- Searchable repertoire with resource links and progress status
- Eight accessible open-chord diagrams
- Practice goals, minutes, reflections, and downloadable journal
- Local teacher assignment planning
- Responsive student dashboard

All data is stored in this browser's localStorage. School browser clearing policies can remove it; download journals to retain a copy. The teacher workspace is a demonstration without authentication, not a private teacher area. Assignments and logs do not sync across browsers or devices. Initial repertoire entries are original classroom exercises, not licensed song charts.

## Google accounts and classroom deployment

Google sign-in is not connected. A production version needs a hosted backend/database, Google OAuth client configuration, an authorized deployment URL, server-side token/session validation, teacher/student permissions, district approval for school Google accounts, and an agreed student-data retention policy. Do not collect student records with this unauthenticated demo. No Clever integration is required for direct Google sign-in.

## Class repertoire library

The class library includes **Notes on the First String**, its supplied PDF, and an adjustable click track. Each piece opens a journal for strings, starting fret, independent practice, click-track progress, and reflections. Saving appends a dated entry; reopening restores the latest answers. Students can download the piece's journal as text. Existing personal songs and practice logs are preserved. Journals remain browser-local, without cross-device or teacher synchronization.

## Rhythm practice

Two-measure 4/4 patterns use whole, half, quarter, and paired eighth notes with no rests. Includes a four-beat count-in, 40–160 BPM tempo control, a steady metronome, optional rhythm example, beat/note highlighting, and new pattern generation. Audio is generated locally with Web Audio after Start is clicked; playback stops when navigating away or hiding the tab. This activity does not record or assess student playing. `npm test` checks measure totals and paired-eighth attack timing as well as the HTTP server.

Sheet music displays inline as a high-resolution PNG rendered from the supplied PDF, with an accessible enlargement dialog and a separate PDF download. The original notation is preserved. To regenerate this piece's image with Poppler: `pdftoppm -scale-to 2400 -png -singlefile music/notes-on-the-first-string.pdf music/notes-on-the-first-string`.

The repertoire click track uses local Web Audio at 40–180 BPM, with an accented first beat in 4/4 and visual beat indicators. Stop playback to change tempo. Navigation and tab hiding stop the click.

The class repertoire is organized into Working on now and a full library in teaching order: Single-string notes, Combining strings, Chords and strumming, and Ensemble pieces. Piece metadata in `classMusic` defines the category, skill tags and current class focus (`current`). Search matches titles and skills; All music, Practicing and Confident filters use the student's saved journal stage. Students choose their progress stage in the piece journal and save it with their reflection. Older journals without a stage derive an initial stage from their existing independent/click-track readiness. Personal songs remain available in the expandable Personal practice repertoire section. Empty skill groups are placeholders for future real music, not sample pieces. Class focus is currently maintained in code, not a shared teacher editing interface.

Choose Beginning Guitar, Intermediate Guitar or Advanced Guitar at the top of the repertoire page. Each class has its own current pieces and skill groups, with shared search/progress filters. Piece metadata uses `level: 'beginning'`, `'intermediate'` or `'advanced'`. Notes on the First String belongs to Beginning Guitar; the other two libraries start empty and are ready for supplied music. These are library sections, not account-enforced class enrollments.
