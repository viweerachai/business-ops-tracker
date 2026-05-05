import { Building2, Download, FileSpreadsheet, HardDrive, Phone, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BusinessHeader({
  businessName = "ธุรกิจของฉัน",
  phone,
  onUpload,
  onEditBusiness,
  onGoogleDrive,
  onGoogleSheets,
  onExportCsv
}: {
  businessName?: string;
  phone?: string;
  onUpload: () => void;
  onEditBusiness: () => void;
  onGoogleDrive: () => void;
  onGoogleSheets: () => void;
  onExportCsv: () => void;
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-6">
      <div className="min-w-[260px]">
        <div className="mb-4 flex h-5 w-5 items-center justify-center rounded border border-slate-300 text-slate-500">
          <Building2 className="h-3.5 w-3.5" />
        </div>
        <h1 className="text-[34px] font-black tracking-normal text-slate-950">{businessName}</h1>
        <div className="mt-3 flex items-center gap-2 text-[20px] text-slate-500">
          <Phone className="h-5 w-5" />
          <span>{phone || "ยังไม่ได้ระบุเบอร์โทร"}</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col items-end gap-4">
        <div className="flex flex-wrap justify-end gap-3">
          <Button className="h-13 rounded-lg bg-slate-950 px-6 text-[16px] font-bold text-white hover:bg-slate-800" onClick={onUpload}>
            <Upload className="h-5 w-5" />
            อัปโหลดค่าใช้จ่าย
          </Button>
          <Button
            variant="outline"
            className="h-13 rounded-lg border-blue-300 bg-white px-6 text-[16px] font-bold text-blue-600 hover:bg-blue-50"
            onClick={onEditBusiness}
          >
            แก้ไขธุรกิจ
          </Button>
        </div>
        <div className="flex max-w-full flex-wrap justify-end gap-3">
          <Button variant="outline" className="h-11 rounded-lg border-blue-200 bg-white px-5 text-[15px] text-slate-700" onClick={onGoogleDrive}>
            <HardDrive className="h-5 w-5" />
            Google Drive
          </Button>
          <Button variant="outline" className="h-11 rounded-lg border-blue-200 bg-white px-5 text-[15px] text-slate-700" onClick={onGoogleSheets}>
            <FileSpreadsheet className="h-5 w-5" />
            Google Sheets
          </Button>
          <Button variant="outline" className="h-11 max-w-full rounded-lg border-blue-200 bg-white px-5 text-[15px] text-slate-700" onClick={onExportCsv}>
            <Download className="h-5 w-5" />
            <span className="truncate">ดาวน์โหลดเป็นไฟล์ Excel</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
