import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button, Card, Input, Label, PageHeader, Select, Textarea } from "@/components/ui";
import { updateCustomer } from "../../actions";

export default async function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: customer } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!customer) notFound();

  const action = updateCustomer.bind(null, id);

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="顧客を編集" description={customer.name} />
      <Card className="p-4 sm:p-6">
        <form action={action} className="space-y-4">
          <div>
            <Label htmlFor="name">名前 *</Label>
            <Input id="name" name="name" defaultValue={customer.name} required />
          </div>
          <div>
            <Label htmlFor="status">ステータス</Label>
            <Select id="status" name="status" defaultValue={customer.status}>
              <option value="active">アクティブ</option>
              <option value="paused">休会</option>
              <option value="inactive">退会</option>
            </Select>
          </div>
          <div>
            <Label htmlFor="tags">タグ（カンマ区切り）</Label>
            <Input
              id="tags"
              name="tags"
              defaultValue={customer.tags.join(", ")}
            />
          </div>
          <div>
            <Label htmlFor="notes">メモ</Label>
            <Textarea
              id="notes"
              name="notes"
              rows={6}
              defaultValue={customer.notes ?? ""}
            />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Link href={`/customers/${id}`}>
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
