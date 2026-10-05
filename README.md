# Islamic Library

A lightweight, responsive library for browsing and reading a personal collection of Islamic books. Built with React, TypeScript, Vite and Tailwind CSS. The catalogue is generated from files under `public/books`; there is no backend or database.

## Getting started

```sh
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build, run `npm run build` (this regenerates the catalogue before building). `npm run preview` serves the built app locally.

## Adding books

1. Place the PDF or document in the appropriate folder under `public/books`.
2. Run `npm run generate-books`.
3. Generate or refresh PDF covers with `npm run generate-covers`.
4. Start the application with `npm run dev`.

`npm run generate-covers` renders the first page of each PDF to a 300-pixel-wide WebP image in `public/covers`. It skips up-to-date covers and regenerates them when the source file size or modification time changes. `npm run build` regenerates the catalogue and covers automatically before building.

Folders can use numeric prefixes to keep a preferred order, for example `02 - Hadith/Sahih Bukhari`. The prefix is removed from category labels. PDF, DOC and DOCX files are included in the generated `public/data/books.json` catalogue. When a PDF and DOCX with the same name share a folder, the PDF is used in the catalogue and the DOCX original is kept in place. Subfolders under a category are shown as subcategories. Filenames are cleaned for display, while the original file is linked for reading. If cover generation fails for a PDF, the catalogue uses a built-in fallback cover.

## Features

- Browse the predefined subject categories and their book counts.
- Search by title, filename, category, subcategory or available author metadata.
- View book details and open PDFs in the browser's native viewer.
- Save favorites and continue reading, stored in this browser's local storage.
- Browse automatically grouped multi-volume collections and switch between light and dark themes.

The homepage's “Recently added” section is ordered by the source files' filesystem modification times. These are file timestamps, not publication dates.

Only supplied catalogue metadata is shown; authors or descriptions are never inferred from filenames.

## Deploying to GitHub Pages

The repository includes a GitHub Actions workflow that builds and deploys the app to `https://saifquraishy.github.io/IslamicLibrary/` whenever `main` is updated. In **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**.

The Pages build publishes the app, catalogue and cover images, but leaves the large book files out of the site artifact. Since this repository is public, readers fetch those files from its Git LFS media URLs. This keeps the published Pages site below GitHub's site-size limit.

## Google Analytics

GA4 is optional and runs only in production. For local development, copy `.env.example` to `.env.local` if desired; no Measurement ID is needed, and development events are logged to the browser console without loading Google Analytics.

For GitHub Pages, add a repository Actions variable named `VITE_GA_MEASUREMENT_ID` under **Settings → Secrets and variables → Actions → Variables**. Set its value to the GA4 Measurement ID (for example, `G-XXXXXXXXXX`). Vite embeds this value at build time; it is not a secret. If it is unset, analytics stays disabled.

The app sends privacy-filtered route page views and aggregate events for book opens, category and collection views, searches (result count only), favorite changes, and reading milestones. Search terms, query strings, local storage, and PDF content are not sent. Favorites and reading progress are not sent as lists or stored values.

To verify production events, open **Reports → Realtime** or **Admin → Data display → DebugView** in GA4, then visit the deployed site and try a search, open a book, browse a category or collection, change a favorite, and navigate through a PDF. DebugView may require GA Debugger or debug mode; do not enable debug mode in the production site. In local development, check the browser console for `[Analytics]` logs and the Network panel to confirm no request to `googletagmanager.com` is made.

In the GA4 web data stream, disable automatic page views based on browser history changes and automatic site-search collection. The application sends its own single page views with a sanitized route; disabling those enhanced-measurement options prevents automatic events from capturing search query strings or duplicating route views.
