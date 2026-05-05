import { ExpenseDetailClient } from "@/components/expenses/detail/ExpenseDetailClient";

export default async function ExpenseDetailPage({
  params
}: {
  params: Promise<{
    id: string;
  }>;
}) {
  const { id } = await params;
  return <ExpenseDetailClient expenseId={id} />;
}
