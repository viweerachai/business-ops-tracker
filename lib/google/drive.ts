import { googleFetch, sanitizeDriveName, type GoogleFile } from "@/lib/google/storageStructure";

function parseDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("imageDataUrl must be a base64 data URL.");
  }

  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64")
  };
}

export async function uploadReceiptImage({
  accessToken,
  imageDataUrl,
  imagesFolderId,
  fileName
}: {
  accessToken: string;
  imageDataUrl: string;
  imagesFolderId: string;
  fileName: string;
}) {
  const image = parseDataUrl(imageDataUrl);
  const boundary = `receipt_app_${Date.now()}`;
  const metadata = {
    name: sanitizeDriveName(fileName),
    parents: [imagesFolderId]
  };
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n` +
        `--${boundary}\r\nContent-Type: ${image.mimeType}\r\n\r\n`
    ),
    image.buffer,
    Buffer.from(`\r\n--${boundary}--`)
  ]);

  const response = await googleFetch(
    accessToken,
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,mimeType",
    {
      method: "POST",
      headers: {
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": String(body.length)
      },
      body
    }
  );

  return (await response.json()) as GoogleFile;
}
