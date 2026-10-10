---
name: job-description-sheet
description: Parse job descriptions and fill a Google Sheet table using the mcp-gsheets MCP server. Use when the user pastes a job description, asks to log/track a role, or wants requirements extracted into their spreadsheet.
---

# Job Description → Google Sheet

When the user provides a job description, extract structured fields and append a row to the configured Google Sheet.

## Prerequisites

1. **Google Sheets MCP** (`mcp-gsheets`) is connected and shows a green status in Cursor Settings → MCP.
2. **Sheet config** exists at `.cursor/job-sheet.config.json` with a real `spreadsheetId`.
3. The service account email has **Editor** access to the spreadsheet.

If MCP is unavailable, tell the user to complete setup using `.cursor/mcp.json.example` and the steps below. Do not invent spreadsheet data.

## Config

Read `.cursor/job-sheet.config.json` before every write:

| Field | Purpose |
|-------|---------|
| `spreadsheetId` | ID from the sheet URL (`https://docs.google.com/spreadsheets/d/{ID}/edit`) |
| `sheetName` | Tab name (default: `Jobs`) |
| `headerRow` | Row number of column headers (default: `1`) |
| `columns` | Ordered list of column keys — must match sheet headers |

## Workflow

1. **Read config** — load `spreadsheetId`, `sheetName`, and `columns`.
2. **Verify access** — call `sheets_check_access` with the spreadsheet ID.
3. **Read headers** — call `sheets_get_values` on `{sheetName}!{headerRow}:{headerRow}` to confirm column order matches config. If headers differ, map by header name, not position.
4. **Parse the job description** — extract every field below. Use `—` when a field is not stated; never guess salary, location, or requirements.
5. **Check duplicates** — read existing rows in the `Job Title` + `Company` columns (or URL if present). Skip append if the same role already exists unless the user asks to update.
6. **Append row** — call `sheets_append_values`:
   - `spreadsheetId`: from config
   - `range`: `{sheetName}!A:Z` (or the configured column range)
   - `values`: one row as a 2D array, column order matching the sheet headers
   - `valueInputOption`: `USER_ENTERED`
   - `insertDataOption`: `INSERT_ROWS`
7. **Confirm** — tell the user which row was added and summarize the extracted fields.

## Column definitions

Extract these fields from each job description:

| Column | Extraction rules |
|--------|------------------|
| Date Added | Today's date (`YYYY-MM-DD`) in the user's timezone or UTC if unknown |
| Job Title | Exact title from the posting |
| Company | Employer name |
| Location | City/region/country; prefix `Remote` / `Hybrid` when stated |
| Employment Type | Full-time, Part-time, Contract, Internship, etc. |
| Seniority | Entry / Mid / Senior / Lead / Director / C-level — infer only from explicit title or years |
| Salary Range | Only if explicitly listed; include currency |
| Required Skills | Comma-separated hard skills and tools |
| Nice-to-Have Skills | Preferred / bonus skills, comma-separated |
| Years Experience | Minimum years if stated (e.g. `3+`, `5-7`) |
| Education | Degree or certification requirements |
| Responsibilities | 3–5 bullet points, semicolon-separated in one cell |
| Qualifications | 3–5 bullet points, semicolon-separated in one cell |
| Benefits | Listed perks/benefits, semicolon-separated |
| Application URL | Link if provided |
| Source | Where the JD came from (LinkedIn, company site, user paste, etc.) |
| Status | Default `New` unless user specifies otherwise |
| Notes | Visa sponsorship, travel, clearance, or other flags not covered above |

## Parsing guidelines

- Prefer **verbatim phrases** from the JD for skills and requirements.
- Normalize skill names lightly (`Node.js` not `nodeJS`) but do not add skills not mentioned.
- For long bullet lists, keep the most important items; stay within ~500 characters per cell.
- If the user pastes multiple job descriptions, process each as a separate row.
- If the user asks to **update** an existing row, use `sheets_update_values` on that row instead of append.

## MCP tools (mcp-gsheets)

| Action | Tool |
|--------|------|
| Verify access | `sheets_check_access` |
| Read headers / rows | `sheets_get_values` |
| Add job row | `sheets_append_values` |
| Update existing row | `sheets_update_values` |
| Create sheet from scratch | `sheets_create_spreadsheet` then `sheets_update_values` for headers |

## First-time sheet setup

If the user's sheet is empty or missing headers, write row 1 with these headers (in order):

```
Date Added | Job Title | Company | Location | Employment Type | Seniority | Salary Range | Required Skills | Nice-to-Have Skills | Years Experience | Education | Responsibilities | Qualifications | Benefits | Application URL | Source | Status | Notes
```

Then update `.cursor/job-sheet.config.json` with the spreadsheet ID.

## Google Cloud setup (one-time)

1. [Google Cloud Console](https://console.cloud.google.com) → enable **Google Sheets API**.
2. Create a **Service Account** → download JSON key.
3. Save the key outside the repo (e.g. `~/.config/cursor/google-service-account.json`).
4. **Share** the Google Sheet with the service account email (`...@....iam.gserviceaccount.com`) as **Editor**.
5. Copy `.cursor/mcp.json.example` → `.cursor/mcp.json` and set credentials paths.
6. Restart Cursor. For **Cloud Agents**, also add the same MCP server in [cursor.com/agents](https://cursor.com/agents) → MCP.

## Cloud Agent note

Cloud Agents do not read `.cursor/mcp.json` from the repo automatically. Add `mcp-gsheets` in the Cloud Agents dashboard MCP settings with the same env vars. Ensure egress allows `googleapis.com`.

## Example user prompts

- "Here's a job description — add it to my sheet: …"
- "Parse this JD and fill the table"
- "Log this role to Google Sheets"

On these prompts, run the full workflow without asking unnecessary clarifying questions if config and MCP are ready.
