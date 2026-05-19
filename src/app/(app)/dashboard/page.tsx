import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { formatYen, formatMonth } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "owner") {
    return (
      <EmptyState
        title="権限がありません"
        description="売上ダッシュボードはオーナー専用です。"
      />
    );
  }

  const { data: monthly, error } = await supabase
    .from("monthly_revenue")
    .select("*")
    .order("month", { ascending: false })
    .limit(12);

  if (error) {
    return (
      <div className="text-sm text-danger">取得失敗: {error.message}</div>
    );
  }

  const rows = monthly ?? [];
  const max = rows.reduce((m, r) => Math.max(m, r.revenue), 0) || 1;
  const currentMonth = rows[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="月別売上"
        description="セッション消化時点で計上（稼働ベース）"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="p-4 sm:col-span-2">
          <div className="text-xs text-muted-foreground">今月の売上</div>
          <div className="text-3xl font-semibold tabular-nums mt-1">
            {formatYen(currentMonth?.revenue ?? 0)}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            消化セッション数: {currentMonth?.consumed_sessions ?? 0}
          </div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-muted-foreground">過去12ヶ月平均</div>
          <div className="text-xl font-semibold tabular-nums mt-1">
            {formatYen(
              rows.length > 0
                ? Math.round(
                    rows.reduce((s, r) => s + r.revenue, 0) / rows.length
                  )
                : 0
            )}
          </div>
        </Card>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="売上データがありません"
          description="セッションを確定すると、ここに月別の売上が表示されます。"
        />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {rows.map((r) => {
              const pct = Math.round((r.revenue / max) * 100);
              return (
                <li key={r.month} className="px-3 sm:px-4 py-3">
                  <div className="flex items-center justify-between text-sm mb-1.5">
                    <span className="font-medium">{formatMonth(r.month)}</span>
                    <span className="tabular-nums">
                      {formatYen(r.revenue)}
                      <span className="text-xs text-muted-foreground ml-2">
                        ({r.consumed_sessions}回)
                      </span>
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded overflow-hidden">
                    <div
                      className="h-full bg-accent"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
      )}
    </div>
  );
}
