import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatTime, formatDate, formatYen } from "@/lib/format";
import { TodayActions } from "./today-actions";

export const dynamic = "force-dynamic";

type SessionRow = {
  id: string;
  start_at: string;
  end_at: string;
  status: "scheduled" | "confirmed" | "canceled";
  notes: string | null;
  participants: {
    customer_id: string;
    is_pair_primary: boolean;
    consumed: boolean;
    revenue_amount: number;
    customer: { name: string } | null;
  }[];
};

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const supabase = await createClient();
  const sp = await searchParams;

  // Default to today (local). User can change via the date input below.
  const targetDate = sp.date ?? new Date().toLocaleDateString("sv-SE");
  const start = new Date(`${targetDate}T00:00:00`);
  const end = new Date(`${targetDate}T23:59:59.999`);

  const [todayRes, overdueRes] = await Promise.all([
    supabase
      .from("sessions")
      .select(
        "id, start_at, end_at, status, notes, participants:session_participants(customer_id, is_pair_primary, consumed, revenue_amount, customer:customers(name))"
      )
      .gte("start_at", start.toISOString())
      .lte("start_at", end.toISOString())
      .order("start_at"),
    // Past sessions still in `scheduled` status (forgotten confirmations).
    supabase
      .from("sessions")
      .select(
        "id, start_at, end_at, status, notes, participants:session_participants(customer_id, is_pair_primary, consumed, revenue_amount, customer:customers(name))"
      )
      .eq("status", "scheduled")
      .lt("start_at", start.toISOString())
      .order("start_at", { ascending: false })
      .limit(20),
  ]);

  const today = (todayRes.data ?? []) as SessionRow[];
  const overdue = (overdueRes.data ?? []) as SessionRow[];

  const totalRevenue = today
    .filter((s) => s.status === "confirmed")
    .flatMap((s) => s.participants)
    .reduce((sum, p) => sum + p.revenue_amount, 0);
  const totalConfirmed = today.filter((s) => s.status === "confirmed").length;
  const totalScheduled = today.filter((s) => s.status === "scheduled").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="当日確定"
        description={formatDate(targetDate)}
        action={
          <form>
            <input
              type="date"
              name="date"
              defaultValue={targetDate}
              className="h-9 rounded-md border border-border bg-background px-3 text-sm"
            />
            <button hidden type="submit" />
          </form>
        }
      />

      <div className="grid grid-cols-3 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">未確定</div>
          <div className="text-xl font-semibold tabular-nums">
            {totalScheduled}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">確定済み</div>
          <div className="text-xl font-semibold tabular-nums">
            {totalConfirmed}
          </div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">本日の売上</div>
          <div className="text-xl font-semibold tabular-nums">
            {formatYen(totalRevenue)}
          </div>
        </Card>
      </div>

      {overdue.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-warning mb-2">
            未確定の過去セッション ({overdue.length})
          </h2>
          <Card>
            <ul className="divide-y divide-border">
              {overdue.map((s) => (
                <SessionItem key={s.id} session={s} showDate />
              ))}
            </ul>
          </Card>
        </section>
      )}

      <section>
        <h2 className="text-sm font-semibold text-muted-foreground mb-2">
          {formatDate(targetDate)} のセッション
        </h2>
        {today.length === 0 ? (
          <EmptyState
            title="この日のセッションはありません"
            description="カレンダーで予定を登録してください。"
            action={
              <Link
                href="/calendar"
                className="text-sm text-accent underline"
              >
                カレンダーへ
              </Link>
            }
          />
        ) : (
          <Card>
            <ul className="divide-y divide-border">
              {today.map((s) => (
                <SessionItem key={s.id} session={s} />
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}

function SessionItem({
  session,
  showDate,
}: {
  session: SessionRow;
  showDate?: boolean;
}) {
  const names = session.participants
    .map((p) => p.customer?.name ?? "?")
    .join(" / ");
  const revenue = session.participants.reduce(
    (sum, p) => sum + p.revenue_amount,
    0
  );

  return (
    <li className="px-3 sm:px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium tabular-nums">
              {showDate ? formatDate(session.start_at) + " " : ""}
              {formatTime(session.start_at)}–{formatTime(session.end_at)}
            </span>
            <StatusBadge status={session.status} />
          </div>
          <div className="text-sm mt-0.5">{names || "(参加者なし)"}</div>
          {session.notes && (
            <p className="text-xs text-muted-foreground mt-0.5 whitespace-pre-wrap">
              {session.notes}
            </p>
          )}
        </div>
        {session.status === "confirmed" && revenue > 0 && (
          <span className="text-sm tabular-nums text-muted-foreground">
            {formatYen(revenue)}
          </span>
        )}
      </div>
      <div className="mt-2">
        <TodayActions session={session} />
      </div>
    </li>
  );
}

function StatusBadge({ status }: { status: SessionRow["status"] }) {
  if (status === "confirmed") return <Badge variant="success">確定</Badge>;
  if (status === "canceled") return <Badge variant="muted">キャンセル</Badge>;
  return <Badge variant="default">未確定</Badge>;
}
