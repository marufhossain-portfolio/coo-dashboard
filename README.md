# ALEL COO Dashboard — Machine Idle Hours

A single-page, **live** dashboard that reports the **previous day's machine/line idle hours with reasons** for ALEL — built so the daily report can be copied and sent to management before 10:00 AM.

## What it shows

Per production line, for the selected date:

| Column | Meaning |
|---|---|
| **Hours run** | number of distinct hourly slots the line has entries for |
| **Idle hrs (not running)** | of the 11 working hours, how many had **no production entry at all** — the machine stood idle |
| **Below-target hrs** | hours the line **was running** but stayed under target (Achievement % < 100) |
| **On-target hrs** | hours produced at or above target |
| **Target (pcs)** | target output for the day = `Target Productivity × Manpower`, summed over the day |
| **Actual (pcs)** | actual pieces produced that day |
| **Ach %** | Actual ÷ Target |
| **Reason** | the `Remarks` written against the below-target hours |

Plus a **Copy report** button that puts a clean, WhatsApp/email-ready text report on the clipboard.

## Important distinction

- **IDLE** = the line was **not running** (no production entry for that hour).
- **BELOW TARGET** = the line **was running** but produced under target.

These are different hours; an hour is counted in only one of them. The `SHOW` dropdown filters the table by category.

## Data source

Google Sheet **"Production Dashboard" → `Production_Data`** (link-shared), fetched live in the browser via the Google Visualization JSONP endpoint. **No manual data updates are needed** — the page always reads the current sheet.

## Notes

- Working hours per line = **11** (08 AM – 07 PM). The 12th slot (08 PM – 09 PM) is never used.
- Days with no entries (holidays etc.) show no rows for that date.
- Pure static site: HTML + CSS + vanilla JS, no build step, no dependencies.

## Deploy

Hosted on GitHub Pages (root of the default branch). `.nojekyll` is included so files are served as-is.
