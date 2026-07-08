"use client";

import type { Expense } from "@/lib/expenseTypes";
import { ExpenseMonthGroup } from "@/components/expenses/ExpenseMonthGroup";
import type { DisplayCurrency } from "@/components/expenses/currency";

export type ExpenseMonthGroupData = {
  key: string;
  label: string;
  total: number;
  expenses: Expense[];
};

export function ExpenseTable({
  groups,
  currency,
  onDelete,
  onOpen
}: {
  groups: ExpenseMonthGroupData[];
  currency: DisplayCurrency;
  onDelete: (expense: Expense) => void;
  onOpen: (expenseId: string) => void;
}) {
  return (
    <div className="mt-7 grid max-w-full gap-6 pb-28">
      {groups.map((group) => (
        <ExpenseMonthGroup
          key={group.key}
          month={group.label}
          total={group.total}
          expenses={group.expenses}
          currency={currency}
          onDelete={onDelete}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
