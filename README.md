# Guitar Studio

A high school guitar classroom app with class repertoire, rhythm practice, click tracks, chord diagrams and browser-saved student journals.

## Run

Node.js **22.13 or newer** is required.

```sh
npm ci
npm start
```

The server listens on port 3000 (`PORT` overrides it). `npm test` runs server, rhythm, authentication and upload/storage integration tests. Google is replaced by a test double in authentication tests; those tests do not establish live Google OAuth readiness.

No Google credentials are needed to browse the app locally. Unconfigured teacher sign-in and uploads stay disabled. Configure the variables in `.env.example` through your hosting service (the app does not automatically read `.env`). See [Render and Google setup](DEPLOYMENT.md) for live activation.

## Teacher music management

Approved teachers sign in directly with Google, without Clever. Upload up to 20 PDF/PNG/JPEG files per batch, with a shared class, skill group, skill tags and Working on now flag. Each file becomes a separate piece, named from its filename. PDFs can have up to 10 pages and each input file can be up to 12 MB. PDF.js renders previews in the teacher's browser; the original and page images are stored on the server. The teacher screen reports individual failures without discarding successful uploads.

Teachers can edit titles, class, skill group, skill tags and current focus. Each piece has a stable ID so editing metadata preserves student journal associations. Removing a piece removes it from the library and deletes uploaded files; students' existing local journal data is not erased. Original bundled PDFs remain in GitHub even if removed from the catalog.

Only server-verified Google accounts on `TEACHER_EMAILS` can change the catalog or upload files. Sessions use HTTP-only, SameSite cookies, expire after eight hours, and require signing in again after a server restart. OAuth uses state bound to a browser cookie, PKCE, a nonce and server-side Google ID-token verification. Mutation endpoints check the request Origin. Files are checked by signature and stored under server-generated names. Files and the repertoire library are public; teacher access controls editing, not student access to music.

## Storage and hosting

`DATA_DIR` contains `catalog.json` plus uploaded originals and image previews. **Mount it on a persistent disk before uploading on Render.** Otherwise a redeploy can erase music. There is intentionally no upload option without an explicit `DATA_DIR`. The catalog is initialized from `music-library.json` on first use, and then retained on disk; editing bundled metadata in code will not overwrite later teacher changes. Writes are serialized and the catalog is replaced atomically. Use one application instance with this filesystem-based store. Back up the entire directory, not just the catalog.

For local development, browsing uses an ignored `.local-data` directory; to test uploads explicitly set `DATA_DIR` to a local directory along with the OAuth variables. Do not commit data, `.env` files, credentials or real account records.

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
