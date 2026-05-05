import {
  escapeDriveQueryValue,
  findDriveFile,
  googleFetch,
  sanitizeDriveName,
  type GoogleFile
} from "@/lib/google/storageStructure";

export const expenseSheetHeaders = [
  "วันที่",
  "ไอดี",
  "เลขที่ใบกำกับภาษี",
  "ประเภทเอกสาร",
  "สถานะการจ่ายเงิน",
  "ใบกำกับภาษีซื้อ",
  "รายละเอียด",
  "จำนวน",
  "ราคาต่อหน่วย",
  "ยอดรวมก่อนภาษี",
  "ภาษีมูลค่าเพิ่ม",
  "ภาษีหัก ณ ที่จ่าย",
  "ยอดชำระ",
  "ประเภทค่าใช้จ่าย",
  "หมวดหมู่",
  "หมวดหมู่ย่อย",
  "ผู้ขาย/ผู้ให้บริการ",
  "เลขประจำตัวผู้เสียภาษีของผู้ขาย/ผู้ให้บริการ",
  "สาขา",
  "รหัสสาขา",
  "ที่อยู่ของผู้ขาย/ผู้ให้บริการ",
  "ผู้ขออนุญาตเบิกจ่าย",
  "หลักฐาน",
  "หมายเหตุ"
] as const;

type SheetProperty = {
  properties: {
    sheetId: number;
    title: string;
  };
};

type SpreadsheetMetadata = {
  spreadsheetId: string;
  spreadsheetUrl?: string;
  sheets?: SheetProperty[];
};

function sheetRange(sheetName: string, range: string) {
  return encodeURIComponent(`'${sheetName.replace(/'/g, "''")}'!${range}`);
}

export async function getSpreadsheetMetadata(accessToken: string, spreadsheetId: string) {
  const response = await googleFetch(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId,spreadsheetUrl,sheets(properties(sheetId,title))`
  );
  return (await response.json()) as SpreadsheetMetadata;
}

export async function getOrCreateExpenseSpreadsheet(accessToken: string, companyName: string, year: string | number, yearFolderId: string) {
  const spreadsheetName = `${sanitizeDriveName(companyName)}_${year}`;
  const existing = await findDriveFile(
    accessToken,
    `name='${escapeDriveQueryValue(spreadsheetName)}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false and '${escapeDriveQueryValue(yearFolderId)}' in parents`
  );
  if (existing) return existing;

  const response = await googleFetch(accessToken, "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink,mimeType", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: spreadsheetName,
      mimeType: "application/vnd.google-apps.spreadsheet",
      parents: [yearFolderId]
    })
  });

  return (await response.json()) as GoogleFile;
}

export async function ensureSheetExists(accessToken: string, spreadsheetId: string, sheetName: string) {
  const metadata = await getSpreadsheetMetadata(accessToken, spreadsheetId);
  const sheets = metadata.sheets ?? [];
  const existing = sheets.find((sheet) => sheet.properties.title === sheetName);
  if (existing) return existing.properties;

  const defaultSheet = sheets.length === 1 && sheets[0]?.properties.title === "Sheet1" ? sheets[0] : null;
  if (defaultSheet) {
    await googleFetch(accessToken, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        requests: [
          {
            updateSheetProperties: {
              properties: {
                sheetId: defaultSheet.properties.sheetId,
                title: sheetName
              },
              fields: "title"
            }
          }
        ]
      })
    });
    return {
      ...defaultSheet.properties,
      title: sheetName
    };
  }

  const response = await googleFetch(accessToken, `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      requests: [
        {
          addSheet: {
            properties: {
              title: sheetName
            }
          }
        }
      ]
    })
  });
  const data = (await response.json()) as {
    replies?: Array<{ addSheet?: { properties?: { sheetId: number; title: string } } }>;
  };
  return data.replies?.[0]?.addSheet?.properties ?? { sheetId: -1, title: sheetName };
}

export async function ensureHeaderRow(accessToken: string, spreadsheetId: string, sheetName: string) {
  const response = await googleFetch(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetRange(sheetName, "A1:X1")}`
  );
  const data = (await response.json()) as { values?: string[][] };
  const currentHeader = data.values?.[0] ?? [];
  const alreadyCorrect = expenseSheetHeaders.every((header, index) => currentHeader[index] === header);
  if (alreadyCorrect) return;

  if (currentHeader.length > 0) {
    return;
  }

  await googleFetch(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetRange(sheetName, "A1:X1")}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        values: [expenseSheetHeaders]
      })
    }
  );
}

export async function appendRows(accessToken: string, spreadsheetId: string, sheetName: string, rows: unknown[][]) {
  if (rows.length === 0) return;

  await googleFetch(
    accessToken,
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetRange(sheetName, "A1")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        values: rows
      })
    }
  );
}
