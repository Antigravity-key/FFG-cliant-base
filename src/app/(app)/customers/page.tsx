import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Badge, Button, Card, EmptyState, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customer_ticket_summary")
    .select("*")
    .order("status", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    return (
      <div className="text-sm text-danger">
        顧客一覧の取得に失敗しました: {error.message}
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="顧客"
        description={`登録 ${data?.length ?? 0} 名`}
        action={
          <Link href="/customers/new">
            <Button size="sm">
              <Plus className="size-4" /> 新規
            </Button>
          </Link>
        }
      />
      {!data || data.length === 0 ? (
        <EmptyState
          title="顧客が未登録です"
          description="まずは顧客を登録してください。"
          action={
            <Link href="/customers/new">
              <Button>顧客を登録</Button>
            </Link>
          }
        />
      ) : (
        <Card>
          <ul className="divide-y divide-border">
            {data.map((c) => (
              <li key={c.customer_id}>
                <Link
                  href={`/customers/${c.customer_id}`}
                  className="flex items-center justify-between gap-3 px-3 sm:px-4 py-3 hover:bg-muted/40 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{c.name}</span>
                      {c.status !== "active" && (
                        <Badge variant="muted">
                          {c.status === "paused" ? "休会" : "退会"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      最終来店: {formatDate(c.last_session_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-lg font-semibold tabular-nums">
                      {c.remaining_tickets}
                      <span className="text-xs font-normal text-muted-foreground ml-1">
                        枚
                      </span>
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
