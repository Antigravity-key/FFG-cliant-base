import { createClient } from "@/lib/supabase/server";
import { CalendarView } from "./calendar-view";
import type {
  ActiveBundle,
  ActiveCustomer,
  ActivePairGroup,
  SessionEvent,
} from "@/lib/types/app";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const supabase = await createClient();

  // Load a wide window of sessions (current month ±2) for the calendar.
  // The client refetches on view change for broader navigation; this gives
  // a fast first paint.
  const now = new Date();
  const rangeStart = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString();
  const rangeEnd = new Date(now.getFullYear(), now.getMonth() + 3, 0).toISOString();

  const [customersRes, pairsRes, bundlesRes, sessionsRes] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name")
      .eq("status", "active")
      .order("name"),
    supabase
      .from("pair_groups")
      .select("id, name, customer_a_id, customer_b_id")
      .order("name"),
    supabase
      .from("ticket_bundles")
      .select(
        "id, plan_id, customer_id, pair_group_id, remaining_count, plan:plans(name, is_pair)"
      )
      .eq("status", "active"),
    supabase
      .from("sessions")
      .select(
        "id, start_at, end_at, status, notes, participants:session_participants(customer_id, ticket_bundle_id, is_pair_primary, consumed, customer:customers(name))"
      )
      .gte("start_at", rangeStart)
      .lte("start_at", rangeEnd)
      .order("start_at"),
  ]);

  const customers: ActiveCustomer[] = customersRes.data ?? [];
  const pairGroups: ActivePairGroup[] = pairsRes.data ?? [];
  const bundles: ActiveBundle[] = (bundlesRes.data ?? []).map((b) => {
    const plan = b.plan as { name: string; is_pair: boolean } | null;
    return {
      id: b.id,
      plan_id: b.plan_id,
      plan_name: plan?.name ?? "—",
      is_pair: plan?.is_pair ?? false,
      customer_id: b.customer_id,
      pair_group_id: b.pair_group_id,
      remaining_count: b.remaining_count,
    };
  });
  const sessions: SessionEvent[] = (sessionsRes.data ?? []).map((s) => ({
    id: s.id,
    start_at: s.start_at,
    end_at: s.end_at,
    status: s.status as SessionEvent["status"],
    notes: s.notes,
    participants: (s.participants ?? []).map(
      (p: {
        customer_id: string;
        ticket_bundle_id: string;
        is_pair_primary: boolean;
        consumed: boolean;
        customer: { name: string } | null;
      }) => ({
        customer_id: p.customer_id,
        customer_name: p.customer?.name ?? "—",
        ticket_bundle_id: p.ticket_bundle_id,
        is_pair_primary: p.is_pair_primary,
        consumed: p.consumed,
      })
    ),
  }));

  return (
    <CalendarView
      customers={customers}
      pairGroups={pairGroups}
      bundles={bundles}
      initialSessions={sessions}
    />
  );
}
