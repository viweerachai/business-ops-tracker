import { NextResponse } from "next/server";
import { fetchHistoricalExchangeRate } from "@/lib/exchange-rate";
import type { ExpenseCurrency } from "@/lib/expenseTypes";

export const runtime = "nodejs";

const supportedCurrencies: ExpenseCurrency[] = ["JPY", "THB"];

function isExpenseCurrency(value: unknown): value is ExpenseCurrency {
  return supportedCurrencies.includes(value as ExpenseCurrency);
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      from?: string;
      to?: string;
      date?: string;
    };

    if (!isExpenseCurrency(body.from) || !isExpenseCurrency(body.to)) {
      return NextResponse.json(
        {
          success: false,
            error: "รองรับเฉพาะสกุลเงิน JPY, THB"
        },
        { status: 400 }
      );
    }

    const result = await fetchHistoricalExchangeRate({
      from: body.from,
      to: body.to,
      date: body.date ?? ""
    });

    return NextResponse.json({
      success: true,
      rate: result.rate,
      source: result.source,
      effectiveDate: result.effectiveDate
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "ไม่สามารถดึงอัตราแลกเปลี่ยนได้"
      },
      { status: 500 }
    );
  }
}
