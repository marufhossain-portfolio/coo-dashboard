# ALEL COO Dashboard — Machine Idle Hours

A single-page, **live** dashboard that reports the **previous day's machine/line idle hours with reasons** for ALEL — built so the report can be copied and sent to management every morning before 10:00 AM.

## What it shows

For the selected date, per production line:

| Column | Meaning |
|---|---|
| **Hours run** | number of distinct hourly slots the line has entries for |
| **Idle hrs** | of those hours, how many were **below target** (Achievement % < 100) |
| **Idle %** | idle hours ÷ hours run |
| **Output** | total pieces produced that day |
| **Reason** | the `Remarks` written against the below-target hours |

Plus a **Copy report** button that puts a clean, WhatsApp/email-ready text report on the clipboard.

## Data source

Google Sheet **"Production Dashboard" → `Production_Data`** (published/link-shared), fetched live in the browser via the Google Visualization JSONP endpoint. **No manual data updates are needed** — the page always reads the current sheet.

## Notes

- **Idle** follows the plant definition: an hour is idle when the line is running **below target** (Achievement % < 100).
- Days with no entries (holidays etc.) show no rows for that date.
- Pure static site: HTML + CSS + vanilla JS, no build step, no dependencies.

## Deploy

Hosted on GitHub Pages (root of the default branch). `.nojekyll` is included so files are served as-is.
