import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { updatePlan } from "../actions";

export default async function EditPlanPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (!plan) notFound();

  const action = updatePlan.bind(null, id);

  return (
    <div className="max-w-md mx-auto">
      <PageHeader title="プランを編集" description={plan.name} />
      <Card className="p-4 sm:p-6">
        <form action={action} className="space-y-4">
          <div>
            <Label htmlFor="name">プラン名</Label>
            <Input id="name" name="name" defaultValue={plan.name} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="session_count">回数</Label>
              <Input
                id="session_count"
                name="session_count"
                type="number"
                min={1}
                required
                defaultValue={plan.session_count}
              />
            </div>
            <div>
              <Label htmlFor="total_price">セット価格 ¥</Label>
              <Input
                id="total_price"
                name="total_price"
                type="number"
                min={0}
                required
                defaultValue={plan.total_price}
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_pair"
              defaultChecked={plan.is_pair}
              className="size-4"
            />
            ペア専用プラン
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="is_active"
              defaultChecked={plan.is_active}
              className="size-4"
            />
            販売中（新規購入時の選択肢に表示）
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/plans">
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
            <Button type="submit">保存</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
