# Local-First Receipt OCR for Japan Resellers

Browser-based receipt OCR app for a reseller in Japan. This version does not use Firebase or OpenAI. Google Cloud Vision is the primary OCR engine through a Next.js API route, Tesseract.js remains available as a local fallback, and Gemini converts OCR text into structured JSON.

The app keeps saved receipt data local, while OCR/extraction use server-side API routes:

- OCR: Google Cloud Vision `DOCUMENT_TEXT_DETECTION`
- OCR fallback: Tesseract.js
- Optional image crop/rotate/compress before upload
- Storage: IndexedDB through Dexie.js
- OCR text to JSON extraction: Gemini API
- Categorization: Gemini extraction plus editable keyword rules for manual fallback
- Backup/export: CSV and JSON files
- PWA: simple manifest and service worker

## Pages

- `/receipts/new`
  - Take or upload a receipt image
  - Choose OCR language
  - Run OCR with Google Vision, or Tesseract local fallback
  - Show OCR progress
  - Edit OCR text before parsing
  - Convert OCR text into item rows

The upload input accepts camera/gallery images, including iPhone `.HEIC` and `.HEIF` files. HEIC files are converted to JPEG in the browser before preview and OCR.

- `/receipts/review`
  - Review image and OCR text
  - Click `ใช้ Gemini แปลงเป็นรายการ` to convert OCR text into structured receipt JSON
  - Edit store name, purchase date, subtotal, tax, total
  - Edit extracted item rows
  - Add/delete item rows
  - Save to IndexedDB

- `/receipts/history`
  - List saved receipts
  - Search by store or item name
  - Filter by category
  - View receipt details
  - Delete receipt

- `/settings/categories`
  - View keyword category rules
  - Add/edit/delete rules
  - Reset to defaults

- `/export`
  - Export receipt items to CSV
  - Export full backup JSON
  - Import backup JSON

## Setup

```bash
npm install
npm run dev
```

Open:

```text
http://localhost:3000/receipts/new
```

If port `3000` is already used by an old dev server, run:

```bash
npm run dev:3001
```

Then open:

```text
http://127.0.0.1:3001/receipts/new
```

Google Vision and Gemini require `.env.local`; Tesseract fallback can run without cloud credentials.

## Google Vision Setup

Google Vision is used only for OCR. The browser sends the image to this Next.js app's API route, and the API route calls Google Cloud Vision with server-side credentials. Google credentials are never exposed to the browser.

1. Create a Google Cloud project.
2. Enable the Cloud Vision API.
3. Enable billing.
4. Create a service account.
5. Download a service account JSON key.
6. Create `.env.local`:

```bash
cp .env.example .env.local
```

7. Fill in:

```env
GOOGLE_CLOUD_PROJECT=your-google-cloud-project-id
GOOGLE_APPLICATION_CREDENTIALS=/absolute/path/to/service-account-key.json
```

8. Install dependencies:

```bash
npm install
```

9. Restart the dev server.

According to Google Cloud's Vision API pricing page, the first 1,000 units per month are free, including Document Text Detection, but billing must be enabled. Create a Google Cloud budget alert to avoid surprise usage. See Google's pricing page: [Cloud Vision pricing](https://cloud.google.com/vision/pricing).

The app also keeps local usage counters for Google Vision:

- default daily limit: 30 calls
- default monthly limit: 900 calls
- configure limits in `/settings/categories`

OCR is never called automatically. It runs only when the user presses the Google Vision OCR button.

## Gemini Setup

Gemini is used only for OCR text to JSON extraction. The receipt image is not sent to Gemini.

1. Get an API key from [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Create `.env.local`:

```bash
cp .env.example .env.local
```

3. Fill in:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-2.5-flash
```

4. Restart the dev server after changing `.env.local`.

Gemini free tier may have rate limits. The app never saves Gemini output automatically; it always shows the review/edit screen first, and the user must press `บันทึก`.

For production-style local testing:

```bash
npm start
```

`npm start` builds the app first, then runs `next start`. If you already built and only want to serve the current `.next` output:

```bash
npm run serve
```

## OCR Languages

Supported Tesseract.js language values:

- `jpn`
- `tha`
- `eng`
- `jpn+eng`
- `tha+jpn+eng`

Default: `jpn+eng`

Multi-language OCR can be slower, especially on mobile. The app shows OCR progress while Tesseract is running.

## Receipt Image Preprocessing

Before sending an image to Tesseract.js, the app can preprocess the receipt photo in the browser:

- detect the receipt-like paper rectangle
- crop and rectify the receipt
- warp perspective
- apply adaptive thresholding for OCR
- fall back to the cropped/current image if rectangle detection fails

This follows the high-level approach described by [`drake7707/ocr-receipt`](https://github.com/drake7707/ocr-receipt), but the code here is a small TypeScript/canvas implementation written for this Next.js app rather than a copy of that repository.

For best results, use a dark plain background and crop manually first if the receipt detector locks onto the wrong bright area.

## Local Data

Receipts, items, and category rules are saved in IndexedDB in the current browser profile. They are not synced across devices.

Use `/export` to create a backup JSON before clearing browser data or moving devices.

## Tesseract Fallback Limitations

Tesseract fallback is private and avoids OCR API costs, but it is less accurate than Google Vision for:

- blurry photos
- curved or folded receipts
- dense Japanese receipt layouts
- low contrast thermal paper
- mixed Thai/Japanese/English OCR

The app is designed around manual correction: OCR text is editable, parsed items are editable, category rules are editable, and uncertain rows are marked `要確認`.

Gemini improves the JSON extraction step from OCR text, but it can still make mistakes when OCR text is poor. Always review item rows before saving.

## Deploy Options

This app now uses Next.js API routes for Google Vision and Gemini, so deploy it to a platform that supports server-side Next.js routes.

- Vercel free plan
- Cloudflare Pages with Next.js server support
- A Node.js server

Static-only GitHub Pages will only work for the local Tesseract fallback unless you add a separate backend for Vision/Gemini.
