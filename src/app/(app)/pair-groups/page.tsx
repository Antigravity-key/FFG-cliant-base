import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  Button,
  Card,
  EmptyState,
  Input,
  Label,
  PageHeader,
  Select,
} from "@/components/ui";
import { createPairGroup } from "./actions";

export const dynamic = "force-dynamic";

export default async function PairGroupsPage() {
  const supabase = await createClient();
  const [groupsRes, customersRes] = await Promise.all([
    supabase
      .from("pair_groups")
      .select(
        "id, name, customer_a:customers!pair_groups_customer_a_id_fkey(id, name), customer_b:customers!pair_groups_customer_b_id_fkey(id, name)"
      )
      .order("name"),
    supabase
      .from("customers")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
  ]);

  const groups = groupsRes.data ?? [];
  const customers = customersRes.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="ペア組"
        description="ペア専用プランを使う2名の組み合わせ"
      />

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">
          登録済み
        </h2>
        {groups.length === 0 ? (
          <EmptyState
            title="ペア組がありません"
            description="ペア専用プランを購入する2人組をまず登録してください。"
          />
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {groups.map((g) => {
                const a = g.customer_a as { id: string; name: string } | null;
                const b = g.customer_b as { id: string; name: string } | null;
                return (
                  <li key={g.id} className="px-4 py-3">
                    <div className="font-medium">{g.name}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {a?.name ?? "?"} ＆ {b?.name ?? "?"}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">
          新規登録
        </h2>
        <Card className="p-4 sm:p-6">
          {customers.length < 2 ? (
            <p className="text-sm text-muted-foreground">
              ペア組を作るには、顧客を2名以上
              <Link
                href="/customers/new"
                className="text-accent underline ml-0.5"
              >
                登録
              </Link>
              してください。
            </p>
          ) : (
            <form action={createPairGroup} className="space-y-4">
              <div>
                <Label htmlFor="name">組名</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder="例: 田中ご夫妻"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="customer_a_id">顧客 A</Label>
                  <Select
                    id="customer_a_id"
                    name="customer_a_id"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      — 選択 —
                    </option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label htmlFor="customer_b_id">顧客 B</Label>
                  <Select
                    id="customer_b_id"
                    name="customer_b_id"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      — 選択 —
                    </option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div className="flex justify-end">
                <Button type="submit">登録する</Button>
              </div>
            </form>
          )}
        </Card>
      </section>
    </div>
  );
}
