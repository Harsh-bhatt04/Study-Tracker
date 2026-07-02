# Study Quest Tracker

A mobile game-style study tracker that saves progress directly into Google Sheets. No database is required — the sheet stores every daily checkbox event.

## What this does
- Tracks English, Reasoning, Math, GK, and Mock Test progress
- Uses subject cards and glowing progress bars
- Shows XP, badge unlocks, and smooth interactions
- Saves each checkbox to Google Sheets via Apps Script

## Files
- `index.html` — app UI
- `style.css` — game-inspired styling
- `script.js` — progress logic and Sheet save calls
- `config.js` — Google Apps Script web app URL and study subjects
- `appscript.gs` — Google Apps Script code for writing to the sheet

## Setup steps
1. Create a new Google Sheet.
2. (No need to pre-create tabs) The script will create per-date sheets like `2026-07-02` and a `Mock Tests` sheet automatically.
3. Open **Extensions → Apps Script** in the sheet.
4. Delete any starter code and paste the contents of `appscript.gs`.
5. Deploy the script as a Web App:
   - Select **Deploy → New deployment**
   - Choose **Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (or **Anyone with the link**)
6. Copy the generated Web App URL.
7. Paste that URL into `config.js` for `SCRIPT_URL`.
8. Open `index.html` in your browser.
   - For best results, use a local static server like `python3 -m http.server` inside the folder.

## Notes on deployment and secrets

- The simple dev flow uses `/.env` + `env.js` to expose `SCRIPT_URL` and `API_KEY` at runtime. This is convenient for local testing but do NOT serve real secrets on public deployments.
- For production, prefer storing the API key in the Apps Script Project Properties and keep client-side code free of secrets.

## How to use
1. Enter the student name and click **Ready**.
2. Tap task buttons as the student finishes each item.
3. Daily subjects are saved to a sheet named for the current date, like `Daily 2026-07-02`.
4. Mock Tests are saved to a weekly `Mock Tests` sheet.
5. Check the Google Sheet tabs to see the saved daily rows and weekly mock results.

## Notes
- The app stores current completion locally in the browser for fast UI updates.
- Daily tasks are logged on a separate sheet per date.
- Mock Tests remain on the same weekly sheet.
- The badge unlock animation now shows a rolling burst when a new badge is earned.
