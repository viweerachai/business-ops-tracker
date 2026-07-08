import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";
import { ArrowRight, ExternalLink, Lock, Smartphone } from "lucide-react";

type GuideSection = {
  id: string;
  title: string;
  path: string;
  href: string;
  image: string;
  width: number;
  height: number;
  state: string;
  summary: string;
  actions: string[];
  notes: string[];
};

const sections: GuideSection[] = [
  {
    id: "home",
    title: "หน้าเริ่มต้น",
    path: "/",
    href: "/",
    image: "/mobile-guide/home.png",
    width: 786,
    height: 1704,
    state: "Guest",
    summary: "หน้า landing สำหรับคนที่ยังไม่ล็อกอิน ใช้เริ่มต้นเข้า Google หรือเข้าโหมดเดโม",
    actions: [
      "เข้าสู่ระบบ Google",
      "ลองโหมดเดโม",
      "อ่านคำอธิบายว่าแอปใช้จัดการรายจ่ายธุรกิจ"
    ],
    notes: [
      "เหมาะกับการแชร์ให้คนใหม่เข้าระบบครั้งแรก",
      "ถ้าล็อกอินแล้ว ปุ่มหลักจะพาไปหน้า /expenses"
    ]
  },
  {
    id: "mobile-home",
    title: "หน้า Mobile Summary",
    path: "/mobile",
    href: "/mobile",
    image: "/mobile-guide/mobile-home.png",
    width: 786,
    height: 1704,
    state: "Guest",
    summary: "หน้า mobile แบบสรุปเร็ว แสดงสถานะล็อกอินและพาไปหน้าตั้งค่าเมื่อยังไม่เชื่อม Google",
    actions: [
      "ดูสถานะการเข้าสู่ระบบ",
      "ไปหน้าตั้งค่าเพื่อเชื่อม Google",
      "หลังล็อกอินแล้วจะเห็นสรุปรายจ่ายล่าสุดและ quick actions"
    ],
    notes: [
      "route นี้เป็น mobile dashboard แบบย่อ",
      "ถ้ายังไม่มีธุรกิจ ระบบจะพาไปสร้างธุรกิจจากหน้าตั้งค่า"
    ]
  },
  {
    id: "expenses",
    title: "หน้ารายจ่ายหลัก",
    path: "/expenses",
    href: "/expenses",
    image: "/mobile-guide/expenses.png",
    width: 786,
    height: 1704,
    state: "Guest overlay",
    summary: "หน้าหลักที่ใช้ทุกวัน ดู KPI รายเดือน กราฟ ตัวกรอง และรายการค่าใช้จ่าย",
    actions: [
      "อัปโหลดค่าใช้จ่าย",
      "Export CSV",
      "ดูการ์ดสรุป ใบเสร็จเดือนนี้ ค่าใช้จ่ายเดือนนี้ ค่าใช้จ่ายปีนี้",
      "เปิดเมนูด้านล่างไปหน้า เพิ่ม สแกน สินค้า และตั้งค่า"
    ],
    notes: [
      "ภาพนี้เป็น mobile responsive ของหน้า dashboard หลัก",
      "แม้ยังไม่ล็อกอิน ตัวโครงหน้าและเมนูมือถือยังแสดงให้เห็น flow หลักของแอป"
    ]
  },
  {
    id: "new-expense",
    title: "หน้าเพิ่มรายจ่าย",
    path: "/expenses/new",
    href: "/expenses/new?mock=1",
    image: "/mobile-guide/new-expense.png",
    width: 786,
    height: 1704,
    state: "Mock",
    summary: "ฟอร์มเพิ่มรายจ่ายแบบละเอียด สำหรับอัปโหลดรูป กรอกหัวบิล รายการสินค้า และยอดสรุป",
    actions: [
      "อัปโหลดรูปใบเสร็จ",
      "ใช้ mock data เพื่อทดสอบ flow",
      "เรียก Google Vision OCR",
      "เพิ่ม ลบ และแก้ไขรายการสินค้า",
      "สรุปยอดตามสกุลเงินต้นทางและ THB"
    ],
    notes: [
      "ภาพนี้จับจาก /expenses/new?mock=1 เพื่อให้เห็นฟอร์มครบโดยไม่ต้องพึ่งข้อมูลจริง",
      "หน้าใช้งานจริงรองรับการบันทึกลง Firestore และอัปโหลดรูปไป Google Drive หลังล็อกอิน"
    ]
  },
  {
    id: "receipt-chat",
    title: "หน้าสแกนใบเสร็จ",
    path: "/receipt-chat",
    href: "/receipt-chat?mock=1",
    image: "/mobile-guide/receipt-chat.png",
    width: 786,
    height: 1704,
    state: "Mock",
    summary: "flow สแกนใบเสร็จแบบ chat ใช้ถ่ายรูปหรืออัปโหลด แล้วระบบช่วยอ่านข้อมูลก่อนบันทึก",
    actions: [
      "ถ่ายรูปใบเสร็จ",
      "อัปโหลดรูปจากเครื่อง",
      "ใช้ mock data",
      "ดูผล OCR และข้อมูลที่สรุปแล้ว",
      "พิมพ์คำสั่งแก้ไขข้อมูลในช่องแชต"
    ],
    notes: [
      "ภาพนี้จับจาก /receipt-chat?mock=1 เพื่อให้เห็น UI เต็มของหน้า scan",
      "หน้าใช้งานจริงผูกกับ Google account เพื่อบันทึกรายจ่ายเข้าระบบ"
    ]
  },
  {
    id: "products",
    title: "หน้าสินค้าและบริการ",
    path: "/products",
    href: "/products",
    image: "/mobile-guide/products.png",
    width: 786,
    height: 1704,
    state: "Guest / empty",
    summary: "รวมสินค้าและบริการจากทุกใบเสร็จที่ระบบจับรายการได้ แล้ว aggregate ซ้ำให้อัตโนมัติ",
    actions: [
      "ดูคลังสินค้าที่รวมจากใบเสร็จทั้งหมด",
      "ค้นหาตามชื่อสินค้า หมวดหมู่ หรือร้านค้า",
      "สลับดูยอดตาม JPY และ THB เมื่อมีข้อมูลจริง"
    ],
    notes: [
      "ถ้ายังไม่มีธุรกิจหรือยังไม่มีรายการสินค้า หน้าอาจว่างหรือขึ้น empty state",
      "หน้านี้มีประโยชน์หลังเริ่มใช้งานจริงและมีรายการสินค้าสะสมแล้ว"
    ]
  },
  {
    id: "settings",
    title: "หน้าตั้งค่าและธุรกิจ",
    path: "/settings/businesses",
    href: "/settings/businesses",
    image: "/mobile-guide/settings.png",
    width: 786,
    height: 1704,
    state: "Guest",
    summary: "ศูนย์กลางสำหรับล็อกอิน Google และจัดการธุรกิจในเวอร์ชันมือถือ",
    actions: [
      "เข้าสู่ระบบ Google",
      "สร้างธุรกิจใหม่",
      "ดูรายการธุรกิจทั้งหมด",
      "เปลี่ยนธุรกิจที่ใช้งานอยู่",
      "ออกจากระบบ เมื่ออยู่ในสถานะล็อกอิน"
    ],
    notes: [
      "ตอนนี้ปุ่ม login ของ mobile ถูกย้ายมาอยู่หน้านี้ตาม flow ที่ต้องการ",
      "หลังล็อกอินแล้ว หน้าเดียวกันนี้จะกลายเป็นจุดจัดการ sign out และธุรกิจทั้งหมด"
    ]
  },
  {
    id: "edit-expense",
    title: "หน้าแก้ไขรายจ่าย",
    path: "/expenses/[id]",
    href: "/expenses/example-id",
    image: "/mobile-guide/edit-expense.png",
    width: 786,
    height: 1704,
    state: "Locked",
    summary: "ใช้เปิดรายจ่ายรายใบเพื่อแก้รูป หลักฐาน OCR รายการสินค้า ยอดรวม และบันทึกทับข้อมูลเดิม",
    actions: [
      "เข้าสู่ระบบก่อนแก้ไข",
      "กลับหน้ารายจ่าย",
      "หลังล็อกอินแล้วสามารถแก้ข้อมูลใบเสร็จและกดบันทึกการแก้ไข"
    ],
    notes: [
      "ภาพนี้เป็นสถานะล็อกก่อนเข้าใช้งาน เพราะหน้า detail ผูกกับข้อมูลจริงใน Firestore",
      "หลังล็อกอิน หน้าเดียวกันจะโหลดฟอร์ม edit เต็มรูปแบบ"
    ]
  }
];

function SectionCard({ section }: { section: GuideSection }) {
  return (
    <section
      id={section.id}
      className="scroll-mt-24 rounded-[28px] border border-[var(--line)] bg-white/92 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.08)] backdrop-blur md:p-6"
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(280px,360px)_minmax(0,1fr)] lg:items-start">
        <div className="mx-auto w-full max-w-[320px] rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-3 shadow-inner">
          <Image
            src={section.image}
            alt={section.title}
            width={section.width}
            height={section.height}
            className="h-auto w-full rounded-[22px] border border-slate-200"
            priority={section.id === "home"}
          />
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center rounded-full bg-teal-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">
              {section.state}
            </span>
            <a
              href={section.href}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 transition hover:text-slate-900"
            >
              <span>{section.path}</span>
              <ExternalLink className="h-4 w-4" />
            </a>
          </div>

          <h2 className="mt-3 text-[26px] font-black tracking-tight text-slate-950">{section.title}</h2>
          <p className="mt-3 max-w-3xl text-[15px] leading-7 text-slate-600">{section.summary}</p>

          <div className="mt-5 grid gap-4 xl:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">ทำอะไรได้บ้าง</p>
              <div className="mt-3 grid gap-2">
                {section.actions.map((action) => (
                  <div key={action} className="rounded-xl bg-white px-3 py-2.5 text-[14px] font-semibold text-slate-800 shadow-sm">
                    {action}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">หมายเหตุ</p>
              <div className="mt-3 grid gap-2">
                {section.notes.map((note) => (
                  <div key={note} className="rounded-xl border border-dashed border-slate-200 bg-white px-3 py-2.5 text-[14px] leading-6 text-slate-700">
                    {note}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function MobileGuidePage() {
  return (
    <main
      className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(20,184,166,0.14),transparent_28%),radial-gradient(circle_at_top_right,rgba(14,165,233,0.10),transparent_20%),linear-gradient(180deg,#f8fafc_0%,#eff6f4_100%)] text-slate-900"
      style={
        {
          "--panel": "#f8fbfb",
          "--line": "rgba(148, 163, 184, 0.22)"
        } as CSSProperties
      }
    >
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 md:px-6 md:pt-10">
        <section className="overflow-hidden rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.10)] backdrop-blur md:p-8">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1.35fr)_320px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-teal-700">
                <Smartphone className="h-4 w-4" />
                Mobile Guide
              </div>
              <h1 className="mt-4 max-w-4xl text-[36px] font-black leading-tight tracking-tight text-slate-950 md:text-[52px]">
                คู่มือหน้า mobile ของ Business Ops
              </h1>
              <p className="mt-4 max-w-3xl text-[16px] leading-8 text-slate-600">
                รวมหน้าหลักที่ใช้บนมือถือ พร้อมภาพหน้าจอจริงและคำอธิบายว่าแต่ละหน้าทำอะไรได้บ้าง
                ใช้เปิดดูเองหรือส่งให้ทีม onboard การใช้งานได้ทันที
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="#guide-list"
                  className="inline-flex h-11 items-center gap-2 rounded-2xl bg-teal-600 px-5 text-sm font-semibold text-white transition hover:bg-teal-700"
                >
                  ดูทุกหน้า
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/expenses"
                  className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  เปิดแอป
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-[var(--line)] bg-[var(--panel)] p-5">
              <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-slate-500">สถานะภาพที่ใช้</p>
              <div className="mt-4 grid gap-2">
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                  <strong className="text-slate-950">Guest</strong> คือภาพตอนยังไม่ล็อกอิน
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                  <strong className="text-slate-950">Mock</strong> คือภาพทดสอบเพื่อให้เห็น flow เต็ม
                </div>
                <div className="rounded-2xl bg-white px-4 py-3 text-sm text-slate-700">
                  <strong className="text-slate-950">Locked</strong> คือหน้าใช้งานจริงที่ต้องล็อกอินก่อน
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                ภาพชุดนี้แคปจาก localhost mobile viewport วันที่ 2 กรกฎาคม 2026
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-white/70 bg-white/82 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.18em] text-slate-500">
            <Lock className="h-4 w-4" />
            Quick Jump
          </div>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {sections.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
              >
                {section.title}
              </a>
            ))}
          </div>
        </section>

        <div id="guide-list" className="mt-6 grid gap-6">
          {sections.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>
      </div>
    </main>
  );
}
