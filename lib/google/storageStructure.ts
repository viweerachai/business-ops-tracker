export type GoogleFile = {
  id: string;
  name?: string;
  webViewLink?: string;
  mimeType?: string;
};

export type GoogleStorageStructure = {
  rootFolder: GoogleFile;
  companyFolder: GoogleFile;
  yearFolder: GoogleFile;
  imagesFolder: GoogleFile;
};

export const thaiMonthNames = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม"
] as const;

export function sanitizeDriveName(name: string) {
  return name.replace(/[\\/:*?"<>|#%{}~]/g, " ").replace(/\s+/g, " ").trim() || "ไม่ระบุ";
}

export function getThaiMonthName(date: string | Date) {
  const value = typeof date === "string" ? new Date(`${date}T00:00:00`) : date;
  const monthIndex = value.getMonth();
  return thaiMonthNames[monthIndex] ?? "ไม่ระบุเดือน";
}

export function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

export async function googleFetch(accessToken: string, url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(text || `Google API request failed with HTTP ${response.status}`);
  }

  return response;
}

export async function findDriveFile(accessToken: string, query: string): Promise<GoogleFile | null> {
  const params = new URLSearchParams({
    q: query,
    pageSize: "1",
    fields: "files(id,name,webViewLink,mimeType)"
  });
  const response = await googleFetch(accessToken, `https://www.googleapis.com/drive/v3/files?${params.toString()}`);
  const data = (await response.json()) as { files?: GoogleFile[] };
  return data.files?.[0] ?? null;
}

export async function getOrCreateFolder(accessToken: string, parentId: string | null, folderName: string) {
  const safeName = sanitizeDriveName(folderName);
  const parentQuery = parentId ? ` and '${escapeDriveQueryValue(parentId)}' in parents` : "";
  const existing = await findDriveFile(
    accessToken,
    `name='${escapeDriveQueryValue(safeName)}' and mimeType='application/vnd.google-apps.folder' and trashed=false${parentQuery}`
  );
  if (existing) return existing;

  const response = await googleFetch(accessToken, "https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink,mimeType", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name: safeName,
      mimeType: "application/vnd.google-apps.folder",
      ...(parentId ? { parents: [parentId] } : {})
    })
  });
  return (await response.json()) as GoogleFile;
}

export async function getOrCreateReceiptRootFolder(accessToken: string) {
  return getOrCreateFolder(accessToken, null, "Receipt");
}

export async function getOrCreateCompanyFolder(accessToken: string, companyName: string) {
  const rootFolder = await getOrCreateReceiptRootFolder(accessToken);
  return getOrCreateFolder(accessToken, rootFolder.id, companyName);
}

export async function getOrCreateYearFolder(accessToken: string, companyName: string, year: string | number) {
  const companyFolder = await getOrCreateCompanyFolder(accessToken, companyName);
  return getOrCreateFolder(accessToken, companyFolder.id, String(year));
}

export async function getOrCreateImagesFolder(accessToken: string, companyName: string, year: string | number) {
  const yearFolder = await getOrCreateYearFolder(accessToken, companyName, year);
  return getOrCreateFolder(accessToken, yearFolder.id, "images");
}

export async function getOrCreateExpenseStorageStructure(accessToken: string, companyName: string, year: string | number): Promise<GoogleStorageStructure> {
  const rootFolder = await getOrCreateReceiptRootFolder(accessToken);
  const companyFolder = await getOrCreateFolder(accessToken, rootFolder.id, companyName);
  const yearFolder = await getOrCreateFolder(accessToken, companyFolder.id, String(year));
  const imagesFolder = await getOrCreateFolder(accessToken, yearFolder.id, "images");

  return {
    rootFolder,
    companyFolder,
    yearFolder,
    imagesFolder
  };
}
