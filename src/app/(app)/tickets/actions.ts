"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createTicketBundle(formData: FormData) {
  const supabase = await createClient();
  const planId = String(formData.get("plan_id") ?? "");
  const target = String(formData.get("target") ?? "customer");
  const targetId = String(formData.get("target_id") ?? "");
  const purchaseDate = String(formData.get("purchase_date") ?? "");
  const overridePriceRaw = String(formData.get("override_total_price") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();
  const initialCountRaw = String(formData.get("initial_count") ?? "").trim();

  if (!planId) throw new Error("プランを選択してください");
  if (!targetId) throw new Error("顧客またはペア組を選択してください");
  if (!purchaseDate) throw new Error("購入日を入力してください");

  const { data: plan, error: planErr } = await supabase
    .from("plans")
    .select("session_count, is_pair")
    .eq("id", planId)
    .single();
  if (planErr || !plan) throw planErr ?? new Error("プランが見つかりません");

  if (target === "customer" && plan.is_pair) {
    throw new Error("ペアプランは個人ではなくペア組を指定してください");
  }
  if (target === "pair" && !plan.is_pair) {
    throw new Error("個人向けプランはペア組ではなく顧客を指定してください");
  }

  const initialCount = initialCountRaw
    ? Math.max(1, parseInt(initialCountRaw, 10))
    : plan.session_count;
  const overridePrice = overridePriceRaw
    ? Math.max(0, parseInt(overridePriceRaw, 10))
    : null;

  const insert =
    target === "customer"
      ? { customer_id: targetId, pair_group_id: null }
      : { customer_id: null, pair_group_id: targetId };

  const { data, error } = await supabase
    .from("ticket_bundles")
    .insert({
      plan_id: planId,
      ...insert,
      purchase_date: purchaseDate,
      initial_count: initialCount,
      remaining_count: initialCount,
      override_total_price: overridePrice,
      note: note || null,
    })
    .select("id, customer_id, pair_group_id")
    .single();
  if (error) throw error;

  revalidatePath("/customers");
  if (data.customer_id) {
    revalidatePath(`/customers/${data.customer_id}`);
    redirect(`/customers/${data.customer_id}`);
  } else if (data.pair_group_id) {
    revalidatePath(`/pair-groups`);
    redirect(`/pair-groups`);
  }
  redirect("/customers");
}
