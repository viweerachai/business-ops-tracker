import { Download, FileSpreadsheet, HardDrive, Phone, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const thaiDays = ["อา.", "จ.", "อ.", "พ.", "พฤ.", "ศ.", "ส."];
const thaiMonthsFull = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน",
  "พฤษภาคม", "มิถุนายน", "กรกฎาคม", "สิงหาคม",
  "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
];

function todayLabel() {
  const d = new Date();
  return `${thaiDays[d.getDay()]} ${d.getDate()} ${thaiMonthsFull[d.getMonth()]} ${d.getFullYear()}`;
}

export function BusinessHeader({
  businessName = "ธุรกิจของฉัน",
  phone,
  plan = "pro",
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
  plan?: "pro" | "free";
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
    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      {/* Business info */}
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="text-pretty text-[24px] font-bold tracking-tight text-slate-950 sm:text-[26px]">
            {businessName}
          </h1>
          {plan === "pro" ? (
            <Badge className="rounded-md bg-teal-600 px-2 py-0.5 text-[10px] font-bold text-white shadow-none">
              PRO
            </Badge>
          ) : (
            <Badge className="rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-bold text-slate-600 shadow-none">
              FREE
            </Badge>
          )}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-2.5 text-[13px] text-slate-400">
          {phone ? (
            <div className="flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 shrink-0" />
              <span>{phone}</span>
            </div>
          ) : null}
          {phone ? <span className="text-slate-300">·</span> : null}
          <span>{todayLabel()}</span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex flex-col gap-2 sm:items-end">
        {/* Primary */}
        <Button
          onClick={onUpload}
          className="h-10 rounded-lg bg-teal-600 px-4 text-[14px] font-semibold text-white hover:bg-teal-700 focus-visible:ring-teal-500"
        >
          <Upload className="h-4 w-4" />
          อัปโหลดค่าใช้จ่าย
        </Button>

        {/* Secondary tools */}
        <div className="flex flex-wrap items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            disabled={googleDriveDisabled}
            onClick={onGoogleDrive}
            className="h-7 rounded-md px-2.5 text-[12px] font-medium text-slate-500 hover:bg-slate-100 disabled:text-slate-300"
          >
            <HardDrive className="h-3 w-3" />
            Drive
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={googleSheetsDisabled}
            onClick={onGoogleSheets}
            className="h-7 rounded-md px-2.5 text-[12px] font-medium text-slate-500 hover:bg-slate-100 disabled:text-slate-300"
          >
            <FileSpreadsheet className="h-3 w-3" />
            Sheets
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onExportCsv}
            className="h-7 rounded-md px-2.5 text-[12px] font-medium text-slate-500 hover:bg-slate-100"
          >
            <Download className="h-3 w-3" />
            Export CSV
          </Button>
        </div>
      </div>
    </header>
  );
}
