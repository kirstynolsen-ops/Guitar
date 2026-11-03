# Activate teacher uploads on Render

Keep the existing Render web service. Google Sites alone cannot run the private teacher-upload backend. No Google Cloud billing account or paid Google API is required just for OAuth sign-in; district Google administration can still restrict OAuth clients. Persistent disk pricing is separate from the Render web-service price: check the displayed total before adding a disk.

## 1. Add permanent storage

In the existing Render service, open **Disks** and add a persistent disk mounted at `/var/data`. Choose a size appropriate to your music library (a small initial disk can be expanded later). In **Environment**, add:

| Name | Value |
| --- | --- |
| `DATA_DIR` | `/var/data/guitar-studio` |
| `APP_URL` | The exact live HTTPS site origin, with no path, e.g. `https://your-service.onrender.com` |
| `TEACHER_EMAILS` | Your Google email; use commas if approving additional teachers |

Only set `DATA_DIR` to this path after attaching the disk. A folder with that name on an ephemeral filesystem is not durable storage. Keep one service instance with this filesystem backend. Do not switch back to an instance type that loses the disk.

Make sure the service uses Node 22.13 or newer. Build command: `npm ci`. Start command: `npm start`.

## 2. Create a Google sign-in client

In [Google Cloud Console](https://console.cloud.google.com/), create or choose a project. Open **Google Auth Platform** (or **APIs & Services → OAuth consent screen**).

Configure the app name, contact email and audience. If your school permits an **Internal** app, that can suit accounts in the school organization. If using an **External** app in Testing, add your teacher Google email as a test user. Request only the basic `openid` and `email` scopes. This app does not need access to Drive, Gmail or students' Google Classroom data.

Create an OAuth client with application type **Web application**. Add this authorized redirect URI, substituting the actual site address exactly:

```text
https://your-service.onrender.com/auth/google/callback
```

A client secret is produced. Keep it private. Do not paste it into chat, a GitHub file or browser code.

If your school blocks creating Cloud projects or approving OAuth apps, ask the district Google administrator to create/approve this client. There is no need to connect Clever.

## 3. Add the Google client to Render

In the Render service's **Environment**, add:

| Name | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | The OAuth web application's client ID |
| `GOOGLE_CLIENT_SECRET` | Its client secret, entered privately in Render |

Save and redeploy. The app only enables Google sign-in when `APP_URL`, both client settings and at least one teacher email are present. Uploads also require `DATA_DIR`. Do not use a Google service-account key: it cannot replace this OAuth client.

## 4. Verify live operation

1. Open **Teacher workspace** and click **Sign in with Google**.
2. Sign in with the approved teacher account. An account not on the teacher list must be refused.
3. Upload one test piece. Select its class and skill group. Check inline preview pages and original download from a separate, signed-out browser.
4. Restart/redeploy the Render service. Sign in again and confirm the piece and its files still exist.
5. Test a small batch. Edit a title and Working on now status and confirm they update in the student library after refresh.

Only steps tested on the real service establish live readiness. Local tests use a mocked Google provider and a local filesystem; they cannot verify Google client configuration, district approval or the Render disk mount.

## Backups and limits

Back up all of `DATA_DIR` before deleting music or changing storage configuration, and use Render's available disk backup/snapshot facilities according to your plan. A GitHub code backup does not include uploaded files. Monitor disk space as your library grows; uploads fail if storage is full. PDFs are limited to 10 pages, originals to 12 MB, and a batch to 20 files. Multi-part scores can be split into separate PDF files. Music is publicly readable from the site; student journal data is not sent to this server.
