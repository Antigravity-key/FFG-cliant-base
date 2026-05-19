import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { formatDate, formatDateTime, formatYen } from "@/lib/format";
import { Plus, Pencil } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [customerRes, summaryRes, individualBundlesRes, pairGroupsRes, sessionsRes] =
    await Promise.all([
      supabase.from("customers").select("*").eq("id", id).maybeSingle(),
      supabase
        .from("customer_ticket_summary")
        .select("*")
        .eq("customer_id", id)
        .maybeSingle(),
      supabase
        .from("ticket_bundles")
        .select("*, plan:plans(name, session_count, total_price, is_pair)")
        .eq("customer_id", id)
        .order("purchase_date", { ascending: false }),
      supabase
        .from("pair_groups")
        .select("id, name")
        .or(`customer_a_id.eq.${id},customer_b_id.eq.${id}`),
      supabase
        .from("session_participants")
        .select(
          "consumed, revenue_amount, session:sessions(id, start_at, end_at, status)"
        )
        .eq("customer_id", id)
        .order("session(start_at)", { ascending: false })
        .limit(30),
    ]);

  if (!customerRes.data) notFound();
  const customer = customerRes.data;
  const summary = summaryRes.data;
  const individualBundles = individualBundlesRes.data ?? [];
  const pairGroups = pairGroupsRes.data ?? [];
  const sessions = sessionsRes.data ?? [];

  let pairBundles: typeof individualBundles = [];
  if (pairGroups.length > 0) {
    const pairIds = pairGroups.map((g) => g.id);
    const { data } = await supabase
      .from("ticket_bundles")
      .select("*, plan:plans(name, session_count, total_price, is_pair)")
      .in("pair_group_id", pairIds)
      .order("purchase_date", { ascending: false });
    pairBundles = (data ?? []).map((b) => ({
      ...b,
      pairGroupName:
        pairGroups.find((g) => g.id === b.pair_group_id)?.name ?? null,
    })) as typeof individualBundles;
  }
  const allBundles = [...individualBundles, ...pairBundles].sort((a, b) =>
    b.purchase_date.localeCompare(a.purchase_date)
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={customer.name}
        description={
          customer.tags.length > 0 ? customer.tags.join(" / ") : undefined
        }
        action={
          <div className="flex gap-2">
            <Link href={`/tickets/new?customer=${id}`}>
              <Button size="sm">
                <Plus className="size-4" /> チケット販売
              </Button>
            </Link>
            <Link href={`/customers/${id}/edit`}>
              <Button size="sm" variant="outline">
                <Pencil className="size-4" /> 編集
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">残チケット</div>
          <div className="text-2xl font-semibold tabular-nums mt-1">
            {summary?.remaining_tickets ?? 0}
            <span className="text-xs font-normal text-muted-foreground ml-1">
              枚
            </span>
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">最終来店</div>
          <div className="text-sm font-medium mt-1">
            {formatDate(summary?.last_session_at)}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">ステータス</div>
          <div className="mt-1">
            <Badge
              variant={
                customer.status === "active"
                  ? "success"
                  : customer.status === "paused"
                    ? "warning"
                    : "muted"
              }
            >
              {customer.status === "active"
                ? "アクティブ"
                : customer.status === "paused"
                  ? "休会"
                  : "退会"}
            </Badge>
          </div>
        </Card>
      </div>

      {customer.notes && (
        <Card className="p-4">
          <div className="text-xs text-muted-foreground mb-1">メモ</div>
          <p className="text-sm whitespace-pre-wrap">{customer.notes}</p>
        </Card>
      )}

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">
          チケット履歴
        </h2>
        {allBundles.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            チケット販売記録がありません。
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {allBundles.map((b) => {
                const plan = b.plan as {
                  name: string;
                  session_count: number;
                  total_price: number;
                  is_pair: boolean;
                } | null;
                const price = b.override_total_price ?? plan?.total_price ?? 0;
                const pairName = (b as { pairGroupName?: string | null })
                  .pairGroupName;
                return (
                  <li
                    key={b.id}
                    className="px-4 py-3 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium">
                        {plan?.name ?? "—"}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        {formatDate(b.purchase_date)} ・ {formatYen(price)}
                        {pairName && ` ・ ペア組: ${pairName}`}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-semibold tabular-nums">
                        {b.remaining_count}
                        <span className="text-xs text-muted-foreground">
                          /{b.initial_count}
                        </span>
                      </div>
                      <Badge
                        variant={b.status === "active" ? "success" : "muted"}
                        className="mt-0.5"
                      >
                        {b.status === "active"
                          ? "有効"
                          : b.status === "exhausted"
                            ? "消化済"
                            : "期限切"}
                      </Badge>
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
          セッション履歴（直近30件）
        </h2>
        {sessions.length === 0 ? (
          <Card className="p-4 text-sm text-muted-foreground">
            セッション記録がありません。
          </Card>
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {sessions.map((sp, idx) => {
                const session = sp.session as {
                  id: string;
                  start_at: string;
                  status: string;
                } | null;
                if (!session) return null;
                return (
                  <li
                    key={`${session.id}-${idx}`}
                    className="px-4 py-2.5 flex items-center justify-between gap-3 text-sm"
                  >
                    <div>{formatDateTime(session.start_at)}</div>
                    <div className="flex items-center gap-2">
                      {sp.consumed && (
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {formatYen(sp.revenue_amount)}
                        </span>
                      )}
                      <Badge
                        variant={
                          session.status === "confirmed"
                            ? "success"
                            : session.status === "canceled"
                              ? "muted"
                              : "default"
                        }
                      >
                        {session.status === "confirmed"
                          ? sp.consumed
                            ? "実施"
                            : "確定(無消化)"
                          : session.status === "canceled"
                            ? "キャンセル"
                            : "予定"}
                      </Badge>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
