"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createPairGroup(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const customerA = String(formData.get("customer_a_id") ?? "");
  const customerB = String(formData.get("customer_b_id") ?? "");

  if (!name) throw new Error("組名を入力してください");
  if (!customerA || !customerB) throw new Error("顧客を2名選択してください");
  if (customerA === customerB) throw new Error("同じ顧客を2回選べません");

  const { error } = await supabase.from("pair_groups").insert({
    name,
    customer_a_id: customerA,
    customer_b_id: customerB,
  });
  if (error) throw error;

  revalidatePath("/pair-groups");
  redirect("/pair-groups");
}
