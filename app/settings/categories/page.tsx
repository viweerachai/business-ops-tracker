"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { createDefaultCategoryRules } from "@/lib/local/category-rules";
import { ensureDefaultCategoryRules, localDb } from "@/lib/local/db";
import {
  getVisionUsage,
  resetVisionUsageCounters,
  setVisionLimits,
  type VisionUsage
} from "@/lib/local/vision-usage";
import { CATEGORIES, type CategoryRule, type ReceiptCategory } from "@/lib/types/receipt";

const languages: CategoryRule["language"][] = ["ja", "th", "en", "any"];

export default function CategorySettingsPage() {
  const router = useRouter();
  const [rules, setRules] = useState<CategoryRule[]>([]);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState<ReceiptCategory>("Other");
  const [language, setLanguage] = useState<CategoryRule["language"]>("any");
  const [visionUsage, setVisionUsage] = useState<VisionUsage | null>(null);
  const [dailyLimit, setDailyLimit] = useState(30);
  const [monthlyLimit, setMonthlyLimit] = useState(900);

  async function loadRules() {
    await ensureDefaultCategoryRules();
    setRules(await localDb.categoryRules.orderBy("category").toArray());
  }

  useEffect(() => {
    void loadRules();
    const usage = getVisionUsage();
    setVisionUsage(usage);
    setDailyLimit(usage.dailyLimit);
    setMonthlyLimit(usage.monthlyLimit);
  }, []);

  async function addRule() {
    const trimmed = keyword.trim();
    if (!trimmed) return;
    const timestamp = new Date().toISOString();
    await localDb.categoryRules.add({
      category,
      keyword: trimmed,
      language,
      createdAt: timestamp,
      updatedAt: timestamp
    });
    setKeyword("");
    await loadRules();
  }

  async function updateRule(rule: CategoryRule, patch: Partial<CategoryRule>) {
    if (!rule.id) return;
    await localDb.categoryRules.update(rule.id, {
      ...patch,
      updatedAt: new Date().toISOString()
    });
    await loadRules();
  }

  async function resetDefaults() {
    await localDb.categoryRules.clear();
    await localDb.categoryRules.bulkAdd(createDefaultCategoryRules());
    await loadRules();
  }

  function saveVisionLimits() {
    const usage = setVisionLimits(dailyLimit, monthlyLimit);
    setVisionUsage(usage);
    setDailyLimit(usage.dailyLimit);
    setMonthlyLimit(usage.monthlyLimit);
  }

  function resetVisionCounters() {
    setVisionUsage(resetVisionUsageCounters());
  }

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-4 px-4 py-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-normal">กฎจัดหมวดหมู่</h1>
          <p className="mt-1 text-sm text-muted-foreground">เพิ่มคำญี่ปุ่น/ไทยเพื่อให้ parser จัดหมวดได้เอง</p>
        </div>
        <Button variant="ghost" size="icon" title="Back" onClick={() => router.push("/receipts/history")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </header>

      <section className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm">
        <div>
          <h2 className="text-lg font-bold">Google Vision OCR usage</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            จำกัดจำนวนครั้งเพื่อคุมค่าใช้จ่าย Vision OCR จะถูกเรียกเฉพาะตอนกดปุ่ม OCR เท่านั้น
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-md border bg-background p-3">
            <p className="text-sm text-muted-foreground">วันนี้</p>
            <p className="mt-1 text-2xl font-bold">
              {visionUsage?.callsToday ?? 0}/{visionUsage?.dailyLimit ?? dailyLimit}
            </p>
          </div>
          <div className="rounded-md border bg-background p-3">
            <p className="text-sm text-muted-foreground">เดือนนี้</p>
            <p className="mt-1 text-2xl font-bold">
              {visionUsage?.callsThisMonth ?? 0}/{visionUsage?.monthlyLimit ?? monthlyLimit}
            </p>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <div className="grid gap-2">
            <Label>Daily limit</Label>
            <Input
              inputMode="numeric"
              value={dailyLimit}
              onChange={(event) => setDailyLimit(Number(event.target.value))}
            />
          </div>
          <div className="grid gap-2">
            <Label>Monthly limit</Label>
            <Input
              inputMode="numeric"
              value={monthlyLimit}
              onChange={(event) => setMonthlyLimit(Number(event.target.value))}
            />
          </div>
          <Button className="self-end" onClick={saveVisionLimits}>
            บันทึก limit
          </Button>
        </div>
        <Button variant="outline" onClick={resetVisionCounters}>
          รีเซ็ตตัวนับเดือน/วันนี้
        </Button>
      </section>

      <section className="grid gap-3 rounded-lg border bg-card p-4 shadow-sm md:grid-cols-[1fr_180px_120px_auto]">
        <div className="grid gap-2">
          <Label>Keyword</Label>
          <Input value={keyword} onChange={(event) => setKeyword(event.target.value)} placeholder="例: ポケモン" />
        </div>
        <div className="grid gap-2">
          <Label>Category</Label>
          <Select value={category} onValueChange={(value) => setCategory(value as ReceiptCategory)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map((itemCategory) => (
                <SelectItem key={itemCategory} value={itemCategory}>
                  {itemCategory}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Lang</Label>
          <Select value={language} onValueChange={(value) => setLanguage(value as CategoryRule["language"])}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang} value={lang}>
                  {lang}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button className="self-end" onClick={addRule}>
          <Plus className="h-4 w-4" />
          เพิ่ม
        </Button>
      </section>

      <Button variant="outline" onClick={resetDefaults}>
        <RotateCcw className="h-4 w-4" />
        คืนค่า default rules
      </Button>

      <section className="grid gap-3">
        {rules.map((rule) => (
          <div key={rule.id} className="grid gap-2 rounded-lg border bg-card p-3 shadow-sm md:grid-cols-[1fr_180px_120px_auto]">
            <Input value={rule.keyword} onChange={(event) => void updateRule(rule, { keyword: event.target.value })} />
            <Select value={rule.category} onValueChange={(value) => void updateRule(rule, { category: value as ReceiptCategory })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((itemCategory) => (
                  <SelectItem key={itemCategory} value={itemCategory}>
                    {itemCategory}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={rule.language} onValueChange={(value) => void updateRule(rule, { language: value as CategoryRule["language"] })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {languages.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" title="Delete rule" onClick={() => rule.id && void localDb.categoryRules.delete(rule.id).then(loadRules)}>
              <Trash2 className="h-5 w-5 text-destructive" />
            </Button>
          </div>
        ))}
      </section>
    </main>
  );
}
