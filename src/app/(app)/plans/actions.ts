"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createPlan(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const sessionCount = parseInt(String(formData.get("session_count") ?? "0"), 10);
  const totalPrice = parseInt(String(formData.get("total_price") ?? "0"), 10);
  const isPair = formData.get("is_pair") === "on";

  if (!name) throw new Error("プラン名を入力してください");
  if (!sessionCount || sessionCount <= 0) throw new Error("回数を入力してください");
  if (!totalPrice || totalPrice < 0) throw new Error("価格を入力してください");

  const { error } = await supabase.from("plans").insert({
    name,
    session_count: sessionCount,
    total_price: totalPrice,
    is_pair: isPair,
  });
  if (error) throw error;

  revalidatePath("/plans");
  redirect("/plans");
}

export async function updatePlan(id: string, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const sessionCount = parseInt(String(formData.get("session_count") ?? "0"), 10);
  const totalPrice = parseInt(String(formData.get("total_price") ?? "0"), 10);
  const isPair = formData.get("is_pair") === "on";
  const isActive = formData.get("is_active") === "on";

  if (!name || sessionCount <= 0 || totalPrice < 0) throw new Error("入力値を確認してください");

  const { error } = await supabase
    .from("plans")
    .update({
      name,
      session_count: sessionCount,
      total_price: totalPrice,
      is_pair: isPair,
      is_active: isActive,
    })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/plans");
  redirect("/plans");
}
