import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatYen } from "@/lib/format";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PlansPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("*")
    .order("is_active", { ascending: false })
    .order("is_pair", { ascending: true })
    .order("session_count", { ascending: false });

  return (
    <div className="space-y-4">
      <PageHeader
        title="プラン"
        description="回数券プランのマスタ"
        action={
          <Link href="/plans/new">
            <Button size="sm">
              <Plus className="size-4" /> 新規
            </Button>
          </Link>
        }
      />

      {!plans || plans.length === 0 ? (
        <EmptyState
          title="プランがありません"
          description="まずは回数券プランを登録してください。"
          action={
            <Link href="/plans/new">
              <Button>プランを登録</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {plans.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/plans/${p.id}`}
                  className="flex items-center justify-between gap-3 px-3 sm:px-4 py-3 hover:bg-muted/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{p.name}</span>
                      {p.is_pair && <Badge variant="default">ペア</Badge>}
                      {!p.is_active && <Badge variant="muted">非表示</Badge>}
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {p.session_count}回 ・ 1回あたり{" "}
                      {formatYen(Math.round(p.total_price / p.session_count))}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-base font-semibold tabular-nums">
                      {formatYen(p.total_price)}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
