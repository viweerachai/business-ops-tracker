import { type CategoryRule, type ReceiptCategory } from "@/lib/types/receipt";

const now = () => new Date().toISOString();

const rulesByCategory: Record<ReceiptCategory, { ja?: string[]; th?: string[]; en?: string[] }> = {
  "Trading Card": {
    ja: ["ポケモン", "ポケカ", "カード", "トレカ", "ワンピースカード", "遊戯王"],
    th: ["การ์ด", "โปเกมอน", "วันพีซการ์ด", "การ์ดสะสม"]
  },
  Figure: {
    ja: ["フィギュア", "ぬいぐるみ", "アクリル", "アクスタ"],
    th: ["ฟิกเกอร์", "โมเดล", "ตุ๊กตา", "อะคริลิค"]
  },
  "Ichiban Kuji": {
    ja: ["一番くじ", "くじ", "ラストワン"],
    th: ["อิจิบังคุจิ", "คุจิ", "สุ่ม"]
  },
  Book: {
    ja: ["書籍", "コミック", "本", "雑誌", "巻"],
    th: ["หนังสือ", "มังงะ", "การ์ตูน", "เล่ม"]
  },
  Toy: {
    ja: ["おもちゃ", "玩具", "グッズ", "キャラ"],
    th: ["ของเล่น", "กาชา", "ของสะสม"]
  },
  Game: {
    ja: ["ゲーム", "Switch", "PS5", "ソフト"],
    th: ["เกม", "แผ่นเกม", "สวิตช์"]
  },
  Monchhichi: {
    ja: ["モンチッチ"],
    th: ["มอนชิชิ"]
  },
  Food: {
    ja: ["おにぎり", "弁当", "飲料", "ドリンク", "パン", "チョコ", "菓子", "食品"],
    th: ["ข้าว", "น้ำ", "ขนม", "อาหาร", "เครื่องดื่ม"]
  },
  "Daily Goods": {
    ja: ["雑貨", "日用品", "袋", "テープ"],
    th: ["ของใช้", "ถุง", "เทป", "กล่อง"]
  },
  Transport: {
    ja: ["送料", "配送", "運賃"],
    th: ["ค่าส่ง", "ขนส่ง"]
  },
  Other: {}
};

export function createDefaultCategoryRules(): CategoryRule[] {
  const timestamp = now();
  return Object.entries(rulesByCategory).flatMap(([category, languages]) =>
    Object.entries(languages).flatMap(([language, keywords]) =>
      (keywords ?? []).map((keyword) => ({
        category: category as ReceiptCategory,
        keyword,
        language: language as CategoryRule["language"],
        createdAt: timestamp,
        updatedAt: timestamp
      }))
    )
  );
}

export function shouldBeResaleItem(category: ReceiptCategory) {
  return [
    "Trading Card",
    "Figure",
    "Ichiban Kuji",
    "Book",
    "Toy",
    "Game",
    "Monchhichi"
  ].includes(category);
}
