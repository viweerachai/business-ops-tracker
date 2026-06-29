import { Building2, Download, FileSpreadsheet, HardDrive, Phone, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BusinessHeader({
  businessName = "ธุรกิจของฉัน",
  phone,
  onUpload,
  onEditBusiness,
  onGoogleDrive,
  onGoogleSheets,
  onExportCsv,
  editBusinessDisabled = false,
  googleDriveDisabled = false,
  googleSheetsDisabled = false
}: {
  businessName?: string;
  phone?: string;
  onUpload: () => void;
  onEditBusiness: () => void;
  onGoogleDrive: () => void;
  onGoogleSheets: () => void;
  onExportCsv: () => void;
  editBusinessDisabled?: boolean;
  googleDriveDisabled?: boolean;
  googleSheetsDisabled?: boolean;
}) {
  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
      <div className="min-w-0">
        <div className="mb-3 flex h-5 w-5 items-center justify-center rounded border border-slate-300 text-slate-500 lg:mb-4">
          <Building2 className="h-3.5 w-3.5" />
        </div>
        <h1 className="break-words text-2xl font-black tracking-normal text-slate-950 sm:text-[30px] lg:text-[34px]">{businessName}</h1>
        <div className="mt-2 flex items-center gap-2 text-sm text-slate-500 sm:text-base lg:mt-3 lg:text-[20px]">
          <Phone className="h-4 w-4 shrink-0 lg:h-5 lg:w-5" />
          <span className="min-w-0 truncate">{phone || "ยังไม่ได้ระบุเบอร์โทร"}</span>
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-3 lg:items-end lg:gap-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:flex lg:flex-wrap lg:justify-end">
          <Button className="h-12 rounded-xl bg-slate-950 px-4 text-[15px] font-bold text-white hover:bg-slate-800 lg:h-13 lg:rounded-lg lg:px-6 lg:text-[16px]" onClick={onUpload}>
            <Upload className="h-5 w-5" />
            อัปโหลดค่าใช้จ่าย
          </Button>
          <Button
            variant="outline"
            disabled={editBusinessDisabled}
            className="h-12 rounded-xl border-blue-300 bg-white px-4 text-[15px] font-bold text-blue-600 hover:bg-blue-50 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 lg:h-13 lg:rounded-lg lg:px-6 lg:text-[16px]"
            onClick={onEditBusiness}
          >
            แก้ไขธุรกิจ
          </Button>
        </div>
        <div className="grid max-w-full grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-wrap lg:justify-end lg:gap-3">
          <Button
            variant="outline"
            disabled={googleDriveDisabled}
            className="h-11 rounded-xl border-blue-200 bg-white px-3 text-[13px] text-slate-700 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 lg:rounded-lg lg:px-5 lg:text-[15px]"
            onClick={onGoogleDrive}
          >
            <HardDrive className="h-5 w-5" />
            Google Drive
          </Button>
          <Button
            variant="outline"
            disabled={googleSheetsDisabled}
            className="h-11 rounded-xl border-blue-200 bg-white px-3 text-[13px] text-slate-700 disabled:border-slate-200 disabled:bg-slate-50 disabled:text-slate-400 lg:rounded-lg lg:px-5 lg:text-[15px]"
            onClick={onGoogleSheets}
          >
            <FileSpreadsheet className="h-5 w-5" />
            Google Sheets
          </Button>
          <Button variant="outline" className="col-span-2 h-11 max-w-full rounded-xl border-blue-200 bg-white px-3 text-[13px] text-slate-700 sm:col-span-1 lg:rounded-lg lg:px-5 lg:text-[15px]" onClick={onExportCsv}>
            <Download className="h-5 w-5" />
            <span className="truncate">ดาวน์โหลดเป็นไฟล์ Excel</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
