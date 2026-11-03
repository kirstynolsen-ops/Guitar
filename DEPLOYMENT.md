# Activate teacher sign-in and Google Drive storage

Keep the existing Render web service. **A Render persistent disk is not required when using Drive.** Google Drive stores originals, inline preview images, and the library catalog. Render still runs the app, handles sign-in and serves the published music. Drive space and API quotas still apply; check your school account's restrictions.

## 1. Create the Google connection

In [Google Cloud Console](https://console.cloud.google.com/), create or select a project. Enable **Google Drive API** in that project. Google OAuth and Drive API access do not require a paid API subscription for this workflow, but your school may restrict projects, consent or Drive storage.

Open **Google Auth Platform** (or **APIs & Services → OAuth consent screen**). Configure the app name, contact email and audience. An **Internal** app can suit a school organization if its administrator permits it. For an **External** app in Testing, add the teacher email as a test user. Google refresh tokens for external testing apps requesting Drive access generally expire after seven days, so a lasting connection needs an appropriate Internal or Production configuration. A district administrator may need to approve the app.

The app requests basic `openid` and `email` at sign-in. Connecting Drive additionally requests `https://www.googleapis.com/auth/drive.file`, which limits access to files created by this app or explicitly chosen in Google's file picker. It does not request full-Drive access, Gmail, or Classroom permissions.

Create an OAuth client with application type **Web application**. Add the exact live callback URL to its authorized redirect URIs. For this deployment:

```text
https://guitarclass101.onrender.com/auth/google/callback
```

Keep the client secret private. Do not send it in chat or commit it to GitHub. Do not substitute a service-account key for this OAuth client.

## 2. Add the initial settings in Render

In the existing Render service's **Environment**, set:

| Name | Value |
| --- | --- |
| `APP_URL` | `https://guitarclass101.onrender.com` |
| `TEACHER_EMAILS` | The approved teacher Google email; comma-separated for more than one |
| `GOOGLE_CLIENT_ID` | The OAuth web client's ID |
| `GOOGLE_CLIENT_SECRET` | Its secret, entered privately in Render |
| `STORAGE_PROVIDER` | `drive` |

Node must be 22.13 or newer. Build command: `npm ci`. Start command: `npm start`. Save and redeploy. Teacher sign-in stays disabled until its settings are present. A configured variable does not prove that Google or the district permits the operation.

## 3. Connect the music folder

1. Open the app's **Teacher workspace** and sign in with the approved Google account.
2. Choose **Connect Google Drive** and approve the additional Drive permission.
3. Choose **Set up music folder**. The app creates a dedicated **Guitar Studio Music** folder and seeds its library catalog with the existing repertoire. It does not copy or modify unrelated Drive files.
4. Choose **Download private connection file**. This file contains a refresh credential: keep it private, do not attach it in chat or upload it to GitHub.
5. In Render's **Environment**, use its `.env` import feature (if available), or enter the file's three settings privately: `STORAGE_PROVIDER`, `GOOGLE_DRIVE_FOLDER_ID`, and `GOOGLE_DRIVE_REFRESH_TOKEN`.
6. Save and redeploy, then delete your local copy of the private connection file. Sign in again after restart.

Finish exporting the connection before restarting the app: the initial connection exists only in its temporary teacher session until saved in Render. Uploads remain disabled until the saved Drive connection is configured. The refresh token stays server-side after configuration. The app never puts it in the public catalog, page source, localStorage or logs. Its protected download is intentionally available only to a signed-in approved teacher, with same-origin checks and no caching.

If reconnecting an existing configured folder, the app verifies access to that folder and preserves it instead of creating a new catalog. Use the same Drive account that owns the music connection. Do not delete the configured folder or its **Guitar Studio Library.json** file.

## 4. Import music already in Drive (file picker)

Ordinary uploads from a Chromebook already work once Drive storage is connected. To browse existing Drive files from the app:

1. Enable **Google Picker API** in the same Cloud project.
2. Create a browser API key. Restrict it to Google Picker API and the actual website's HTTP referrer, e.g. `https://guitarclass101.onrender.com/*`.
3. Set `GOOGLE_PICKER_API_KEY` to that key and `GOOGLE_PROJECT_NUMBER` to the numeric project number in Render. The project number is not the project name or OAuth client ID. Save and redeploy.
4. In Teacher workspace, choose the desired class/skill group and select **Choose music from Google Drive**. The picker begins in the music folder; choose the files to import.

The picker grants the app access to the selected files under `drive.file`. Merely dropping an arbitrary file into a folder does not grant this scope access to it. **New files are not automatically published**: explicitly select and import them so the app can create inline previews and library metadata. Imported originals are copied into the app-managed library; the selected source files are not changed or deleted. Importing a file twice creates two pieces. A teacher-only picker receives a short-lived app-scoped access token; refresh credentials are never exposed to it.

## 5. Verify the live setup

1. Upload one test PDF, confirm all inline pages and its original download, and check the library from a signed-out browser.
2. Restart/redeploy Render; sign in again and verify that the test piece remains available.
3. Try a small batch and a Drive-picker import, and edit Working on now.
4. Confirm that an unapproved Google account cannot sign in as a teacher.

Local automated tests use fake Google/Drive services and real browser PDF conversion. They cannot verify real OAuth approval, API enablement, picker configuration, token lifetime or school storage policies. These live checks remain required.

## Storage behavior and recovery

The catalog and uploaded music live in the Drive folder. Keep a backup/export of that folder and its catalog; GitHub backs up code, not these uploads. Use one app instance to serialize catalog edits. Removing a Drive-backed piece **unpublishes it from the app but leaves its Drive files as a recoverable archive**. Removing an original or preview manually in Drive can break a published score; replacing an original does not regenerate its previews automatically. Re-import a changed score and remove the old library entry when ready.

If Drive is temporarily unavailable or a credential expires, the app reports the problem rather than overwriting the Drive catalog with an empty library. Reconnect in Teacher workspace, export the renewed connection, and save it privately in Render. Student journals are separate browser-local data and are not stored in Drive by this change.

PDFs are limited to 10 pages, originals to 12 MB and batches to 20 files. Students do not need Drive access or accounts to read published scores: the backend serves catalog-approved music. Use only material intended for the public classroom site.

## Alternative: Render disk

Filesystem storage remains available by explicitly setting `STORAGE_PROVIDER=disk` and `DATA_DIR=/var/data/guitar-studio` after mounting a persistent Render disk at `/var/data`. This has a separate storage cost. Back up the whole directory. Switching an already-used disk library to Drive does not automatically migrate disk uploads: arrange a migration before changing providers. The three bundled scores are seeded in a new Drive catalog automatically.
