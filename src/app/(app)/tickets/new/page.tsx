import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Button, Card, Input, Label, PageHeader, Select, Textarea } from "@/components/ui";
import { createTicketBundle } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewTicketPage({
  searchParams,
}: {
  searchParams: Promise<{ customer?: string; pair?: string }>;
}) {
  const sp = await searchParams;
  const supabase = await createClient();

  const [plansRes, customersRes, pairsRes] = await Promise.all([
    supabase
      .from("plans")
      .select("*")
      .eq("is_active", true)
      .order("is_pair", { ascending: true })
      .order("session_count", { ascending: false }),
    supabase
      .from("customers")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
    supabase.from("pair_groups").select("id, name").order("name"),
  ]);

  const plans = plansRes.data ?? [];
  const customers = customersRes.data ?? [];
  const pairs = pairsRes.data ?? [];

  const defaultTarget = sp.pair ? "pair" : "customer";
  const defaultTargetId = sp.pair ?? sp.customer ?? "";
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="チケット販売記録" />
      <Card className="p-4 sm:p-6">
        <form action={createTicketBundle} className="space-y-4">
          <div>
            <Label htmlFor="target">対象</Label>
            <Select id="target" name="target" defaultValue={defaultTarget}>
              <option value="customer">個人顧客</option>
              <option value="pair">ペア組</option>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              ペア専用プランの場合はペア組を選択してください。
            </p>
          </div>

          <div>
            <Label htmlFor="target_id">顧客 / ペア組</Label>
            <Select
              id="target_id"
              name="target_id"
              required
              defaultValue={defaultTargetId}
            >
              <option value="" disabled>
                — 選択 —
              </option>
              <optgroup label="個人顧客">
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
              <optgroup label="ペア組">
                {pairs.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </optgroup>
            </Select>
            <p className="text-xs text-muted-foreground mt-1">
              ペア組が未登録の場合は
              <Link href="/pair-groups" className="text-accent underline ml-0.5">
                ペア組管理
              </Link>
              から登録してください。
            </p>
          </div>

          <div>
            <Label htmlFor="plan_id">プラン</Label>
            <Select id="plan_id" name="plan_id" required defaultValue="">
              <option value="" disabled>
                — 選択 —
              </option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.session_count}回 / ¥
                  {p.total_price.toLocaleString()})
                </option>
              ))}
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="purchase_date">購入日</Label>
              <Input
                id="purchase_date"
                name="purchase_date"
                type="date"
                defaultValue={today}
                required
              />
            </div>
            <div>
              <Label htmlFor="initial_count">回数（空欄ならプラン既定）</Label>
              <Input
                id="initial_count"
                name="initial_count"
                type="number"
                min={1}
                placeholder="例: 16"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="override_total_price">
              個別単価 ¥（空欄ならプラン既定）
            </Label>
            <Input
              id="override_total_price"
              name="override_total_price"
              type="number"
              min={0}
              placeholder="例: 72000"
            />
            <p className="text-xs text-muted-foreground mt-1">
              継続割引など、この顧客だけ価格が違う場合に指定。
            </p>
          </div>

          <div>
            <Label htmlFor="note">メモ</Label>
            <Textarea id="note" name="note" rows={3} />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Link href="/customers">
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
            <Button type="submit">登録する</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
