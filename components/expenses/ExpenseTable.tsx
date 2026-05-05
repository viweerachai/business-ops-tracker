"use client";

import type { Expense } from "@/lib/expenseTypes";
import { ExpenseMonthGroup } from "@/components/expenses/ExpenseMonthGroup";

export type ExpenseMonthGroupData = {
  key: string;
  label: string;
  total: number;
  expenses: Expense[];
};

export function ExpenseTable({
  groups,
  onDelete,
  onOpen
}: {
  groups: ExpenseMonthGroupData[];
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
          onDelete={onDelete}
          onOpen={onOpen}
        />
      ))}
    </div>
  );
}
