# Project Summary: business-ops-tracker

## ภาพรวม

โปรเจกต์นี้คือ Next.js app สำหรับอ่านใบเสร็จและจัดการรายจ่ายของธุรกิจรีเซล โดยเน้นเคสใบเสร็จญี่ปุ่น/ไทย:

- ถ่ายหรืออัปโหลดรูปใบเสร็จ
- ใช้ Google Vision OCR อ่านข้อความ
- ใช้ Gemini แปลง OCR text เป็น JSON รายการสินค้า/ยอดเงิน
- ให้ผู้ใช้ตรวจแก้ข้อมูลก่อนบันทึก
- บันทึกรายจ่ายหลักลง Firestore
- อัปโหลดรูปหลักฐานไป Google Drive
- ยังมีระบบ legacy/local ที่บันทึกลง IndexedDB สำหรับ receipt OCR flow เดิม

หน้าแรก `/` redirect ไป `/expenses` ซึ่งเป็น dashboard หลักตัวใหม่

## Stack

- Framework: Next.js App Router
- UI: React, TypeScript, Tailwind CSS, Radix-style local UI components
- Auth: NextAuth Google OAuth
- Cloud DB: Firebase Auth + Firestore
- Local DB: Dexie IndexedDB
- OCR: Google Cloud Vision API ผ่าน Next.js API route
- AI extraction: Gemini API ผ่าน Next.js API route
- Storage: Google Drive API
- Sheet helper: Google Sheets API มีโค้ดเตรียมไว้ แต่ dashboard ปัจจุบันยังใช้ Firestore เป็นฐานหลัก
- PWA: manifest + service worker registration

## Routes หลัก

### `/expenses`

Dashboard รายจ่ายหลัก

- ต้อง login Google
- โหลดธุรกิจและรายจ่ายจาก Firestore realtime
- แสดง summary รายเดือน/รายปี
- filter รายจ่ายตาม search, date, document type, payment status, payer
- group รายจ่ายตามเดือน
- export CSV จากรายการที่ filter แล้ว
- delete รายจ่ายจาก Firestore
- ถ้ายังไม่มีธุรกิจ จะให้สร้างธุรกิจก่อน

ไฟล์สำคัญ:

- `app/expenses/page.tsx`
- `components/expenses/ExpensesLayout.tsx`
- `components/expenses/AppSidebar.tsx`
- `components/expenses/ExpenseTable.tsx`
- `components/expenses/ExpenseMonthGroup.tsx`
- `hooks/useBusinesses.ts`
- `hooks/useExpenses.ts`

### `/expenses/new`

สร้างรายจ่ายใหม่แบบ cloud flow

Flow:

1. เลือกรูปใบเสร็จ รองรับ HEIC/HEIF แล้วแปลงเป็น JPEG
2. compress รูปใน browser
3. POST ไป `/api/vision/ocr`
4. ได้ OCR text แล้ว POST ไป `/api/gemini/extract-receipt`
5. เติมข้อมูลฟอร์มและรายการสินค้า
6. กดบันทึก
7. อัปโหลดรูปไป Google Drive ผ่าน `/api/google/upload-receipt-image`
8. บันทึก expense + items ลง Firestore
9. ถ้าบันทึก Google/Firestore fail จะเก็บ local draft ลง IndexedDB บางส่วน

ไฟล์สำคัญ:

- `app/expenses/new/page.tsx`
- `components/expenses/new/NewExpenseClient.tsx`
- `components/expenses/new/DocumentPreviewCard.tsx`
- `components/expenses/new/ExpenseFormCard.tsx`
- `components/expenses/new/ExpenseItemsCard.tsx`
- `components/expenses/ExpenseSummarySection.tsx`

### `/expenses/[id]`

แก้ไขรายจ่ายเดิมจาก Firestore

- โหลด expense + items จาก Firestore
- แสดงรูปหลักฐานจาก Google Drive ผ่าน `/api/google/drive-image/[fileId]`
- อัปโหลดรูปใหม่ได้
- run OCR ใหม่จากรูปเดิมหรือรูปใหม่ได้
- บันทึกกลับ Firestore ด้วย `updateExpenseWithItemsDoc`
- ถ้ามีรูปใหม่ จะอัปโหลดไป Drive ก่อน

ไฟล์สำคัญ:

- `app/expenses/[id]/page.tsx`
- `components/expenses/detail/ExpenseDetailClient.tsx`
- `components/expenses/detail/ExpenseEditFormCard.tsx`

### `/settings/businesses`

จัดการธุรกิจ

- list businesses จาก Firestore
- create/update/delete business
- set active business
- มี migration จาก IndexedDB เดิมไป Firestore
- migration อ่านจาก `expensesDb` แล้วเขียนเข้า `saveExpenseWithItemsDoc`

ไฟล์สำคัญ:

- `app/settings/businesses/page.tsx`
- `components/business/CreateBusinessDialog.tsx`
- `components/business/EditBusinessDialog.tsx`
- `components/business/BusinessSwitcher.tsx`

### `/receipts/new`, `/receipts/review`, `/receipts/history`

Legacy/local receipt OCR flow

- ใช้ IndexedDB database ชื่อ `japanResellerReceiptReader`
- `/receipts/new`: upload/camera, crop/rotate/preprocess, OCR ด้วย Vision หรือ Tesseract fallback
- `/receipts/review`: review OCR text, ใช้ Gemini extract, แก้ item rows, save local
- `/receipts/history`: list/search/filter local receipts, view image/items, delete

ไฟล์สำคัญ:

- `app/receipts/new/page.tsx`
- `app/receipts/review/page.tsx`
- `app/receipts/history/page.tsx`
- `lib/local/db.ts`
- `lib/local/draft.ts`
- `lib/local/parser.ts`
- `lib/image/receipt-preprocess.ts`

### `/receipt-chat`

Mobile/chat style OCR experience

- หน้าทรง chat สำหรับถ่ายรูปหรือเลือกรูปจาก gallery
- ใช้ Google Vision + Gemini เหมือน flow อื่น
- บันทึกผลลง local IndexedDB ไม่ใช่ Firestore
- เหมาะเป็น mobile prototype หรือ UX ทางเลือก

ไฟล์สำคัญ:

- `app/receipt-chat/page.tsx`
- `components/receipt-chat/ChatShell.tsx`
- `components/receipt-chat/ChatMessageList.tsx`
- `components/receipt-chat/ReceiptEditSheet.tsx`

### `/settings/categories`

จัดการ category rules และ Vision usage limit ฝั่ง local

- rules เก็บใน IndexedDB
- default categories: Trading Card, Figure, Ichiban Kuji, Book, Toy, Game, Monchhichi, Food, Daily Goods, Transport, Other
- ตั้ง daily/monthly limit ของ Google Vision call ได้

### `/export`

Export/import ข้อมูล local IndexedDB legacy flow

- export receipt items เป็น CSV
- export backup JSON
- import backup JSON กลับเข้า IndexedDB

## Data Model และ Storage

### Firestore หลัก

Path หลัก:

```text
users/{uid}
users/{uid}/settings/app
users/{uid}/businesses/{businessId}
users/{uid}/businesses/{businessId}/expenses/{expenseId}
users/{uid}/businesses/{businessId}/expenses/{expenseId}/items/{itemId}
users/{uid}/categories/{categoryId}
```

ฟังก์ชันสำคัญ:

- `useFirebaseUser()`: sync NextAuth Google access token เข้า Firebase Auth
- `ensureUserRoot()`: สร้าง/merge user root doc
- `ensureDefaultBusinessDoc()`: ดูแล active business และ cleanup duplicate default business บางกรณี
- `subscribeBusinesses()`: realtime businesses + app settings
- `subscribeExpenses()`: realtime expenses ของ active business
- `saveExpenseWithItemsDoc()`: write expense + items แบบ batch
- `updateExpenseWithItemsDoc()`: update expense แล้วลบ/เขียน items ใหม่
- `deleteExpenseDoc()`: ลบ expense และ subcollection items

ไฟล์:

- `lib/firebase/firestore.ts`
- `lib/firebase/types.ts`
- `lib/firebase/client.ts`
- `firestore.rules`

### IndexedDB legacy/local

มี 2 database:

1. `expenseManagementDashboard` ใน `lib/db.ts`
   - businesses
   - expenses
   - expense_items
   - receipt_images
   - app_settings

2. `japanResellerReceiptReader` ใน `lib/local/db.ts`
   - receipts
   - items
   - categoryRules

หมายเหตุ: โค้ดปัจจุบันมีทั้ง cloud-first dashboard และ legacy local receipt reader อยู่พร้อมกัน จึงมี model คล้ายกัน 2 ชุด

## External Integrations

### NextAuth + Google OAuth

ไฟล์:

- `lib/auth.ts`
- `app/api/auth/[...nextauth]/route.ts`
- `types/next-auth.d.ts`

Scopes:

```text
openid
email
profile
https://www.googleapis.com/auth/spreadsheets
https://www.googleapis.com/auth/drive.file
```

ใช้ access token เพื่อ:

- upload รูปไป Google Drive
- create folder structure
- create/use spreadsheet ใน helper
- sync Firebase Auth ด้วย Google credential ฝั่ง client

ข้อควรระวัง:

- production ต้องมี `NEXTAUTH_SECRET`
- ถ้า OAuth consent screen ยังเป็น Testing ต้องเพิ่ม email ผู้ใช้เป็น Test user ไม่งั้นเจอ `403 access_denied`
- scopes `spreadsheets` และ `drive.file` อาจทำให้ Google ต้อง review/verification ถ้าจะเปิด public

### Google Vision OCR

Route:

- `POST /api/vision/ocr`
- `GET /api/vision/ocr` สำหรับเช็ก config

ใช้ service account credentials จาก:

- `GOOGLE_SERVICE_ACCOUNT_JSON`
- หรือ `GOOGLE_APPLICATION_CREDENTIALS`

OCR feature:

```text
DOCUMENT_TEXT_DETECTION
```

ฝั่ง client มี local usage counter:

- default daily limit: 30
- default monthly limit: 900

### Gemini Extraction

Route:

- `POST /api/gemini/extract-receipt`

ไฟล์:

- `lib/gemini.ts`
- `lib/receiptSchema.ts`
- `lib/validateReceipt.ts`

หน้าที่:

- รับ OCR text + OCR language
- prompt ให้ Gemini return JSON เท่านั้น
- ใช้ `responseJsonSchema`
- fallback model ได้จาก `GEMINI_FALLBACK_MODELS`
- validate/normalize item rows
- block line ที่ดูเป็นเบอร์โทร วันที่ เวลา point balance tax/total/payment line
- mark `要確認` เมื่อไม่มั่นใจ

### Google Drive

Route:

- `POST /api/google/upload-receipt-image`
- `GET /api/google/drive-image/[fileId]`

Folder structure:

```text
Receipt/
  {companyName}/
    {year}/
      images/
```

ชื่อไฟล์:

```text
receipt_{YYYYMMDD}_{storeName}_{expenseId}.jpg
```

### Google Sheets

มี helper สำหรับสร้าง spreadsheet และ append rows:

- `lib/google/sheets.ts`
- `lib/google/expenseRowMapper.ts`
- `app/api/google/create-storage/route.ts`
- `app/api/google/save-expense/route.ts`

แต่ dashboard ปัจจุบันบอกผู้ใช้ว่า Firestore เป็นฐานข้อมูลหลัก และ Sheets เป็น export/backup ภายหลัง

## Environment Variables

ตัวแปรที่ระบบใช้:

```text
GOOGLE_CLOUD_PROJECT
GOOGLE_APPLICATION_CREDENTIALS
GOOGLE_SERVICE_ACCOUNT_JSON
GEMINI_API_KEY
GEMINI_MODEL
GEMINI_FALLBACK_MODELS
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
NEXTAUTH_SECRET
NEXTAUTH_URL
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

Security note:

- `.gitignore` ignore `.env.local` และ secret/key files แล้ว
- แต่ `.env.example` ใน working tree ตอนอ่านโค้ดมีค่าที่ดูเหมือน secret จริงอยู่ ไม่ควร commit
- ควร rotate credentials ที่เคยหลุดในไฟล์ตัวอย่าง และเปลี่ยน `.env.example` ให้เหลือ placeholder เท่านั้น

## Main User Flows

### Cloud expense flow

```text
Login Google
  -> Firebase Auth sync
  -> Select/create business
  -> Upload receipt image
  -> Google Vision OCR
  -> Gemini JSON extraction
  -> User reviews fields/items/totals
  -> Upload image to Google Drive
  -> Save expense + items to Firestore
  -> Dashboard realtime update
```

### Legacy local receipt flow

```text
Upload/camera
  -> optional crop/preprocess
  -> Vision or Tesseract OCR
  -> draft in sessionStorage
  -> review/edit
  -> save to IndexedDB
  -> export CSV/JSON if needed
```

### Chat receipt flow

```text
Camera/gallery
  -> Vision OCR
  -> Gemini extraction
  -> chat-style review
  -> save to local IndexedDB
```

## Known Issues / Watch List

- Mobile dashboard: `AppSidebar` is fixed at desktop width and `ExpensesLayout` uses full-height desktop layout. Needs mobile-first navigation if app should be comfortable on phone.
- Duplicate OCR helpers: HEIC conversion, dataURL/blob conversion, image compression, and JSON response parsing are repeated in several components. Could be extracted later.
- Two storage systems coexist: Firestore dashboard and local IndexedDB legacy. Be careful which route saves where.
- `README.md` still describes local-first app as the primary story, but current root route sends users to Firestore dashboard.
- `.env.example` appears to contain real credentials in current working tree. Treat as leaked until rotated.
- Google OAuth app must add tester emails while consent screen is in Testing mode.
- `NEXTAUTH_SECRET` is mandatory when running production build.

## Useful Commands

```bash
npm run dev
npm run dev:3001
npm run build
npm run lint
npm run typecheck
npm run check:secrets
```

## High-value Files to Read First

```text
app/page.tsx
app/layout.tsx
components/expenses/ExpensesLayout.tsx
components/expenses/new/NewExpenseClient.tsx
components/expenses/detail/ExpenseDetailClient.tsx
hooks/useBusinesses.ts
hooks/useExpenses.ts
lib/firebase/firestore.ts
lib/auth.ts
lib/gemini.ts
app/api/vision/ocr/route.ts
app/api/gemini/extract-receipt/route.ts
app/api/google/upload-receipt-image/route.ts
lib/db.ts
lib/local/db.ts
```
