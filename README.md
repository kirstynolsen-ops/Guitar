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

The class library includes **Notes on the First String**, its supplied PDF, and the Guitar in the Classroom play-along collection link. Each piece opens a journal for strings, starting fret, independent practice, backing-track progress, and reflections. Saving appends a dated entry; reopening restores the latest answers. Students can download the piece's journal as text. Existing personal songs and practice logs are preserved. Journals remain browser-local, without cross-device or teacher synchronization.
