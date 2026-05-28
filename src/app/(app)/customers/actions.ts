"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCustomer(formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tags = tagsRaw
    ? tagsRaw.split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean)
    : [];

  if (!name) throw new Error("名前を入力してください");

  const { data, error } = await supabase
    .from("customers")
    .insert({ name, notes: notes || null, tags })
    .select("id")
    .single();
  if (error) throw error;

  revalidatePath("/customers");
  redirect(`/customers/${data.id}`);
}

export async function updateCustomer(id: string, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim();
  const status = String(formData.get("status") ?? "active");
  const tagsRaw = String(formData.get("tags") ?? "").trim();
  const tags = tagsRaw
    ? tagsRaw.split(/[,、\s]+/).map((t) => t.trim()).filter(Boolean)
    : [];

  if (!name) throw new Error("名前を入力してください");
  if (!["active", "paused", "inactive"].includes(status)) {
    throw new Error("status invalid");
  }

  const { error } = await supabase
    .from("customers")
    .update({
      name,
      notes: notes || null,
      tags,
      status: status as "active" | "paused" | "inactive",
    })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/customers");
  revalidatePath(`/customers/${id}`);
}

export async function deleteCustomer(id: string) {
  const supabase = await createClient();

  const { error } = await supabase.from("customers").delete().eq("id", id);

  if (error) {
    if (error.code === "23503") {
      throw new Error(
        "この顧客はセッション履歴や購入済みチケットが存在するため削除できません。ステータスを「退会」等に変更してください。"
      );
    }
    throw error;
  }

  revalidatePath("/customers");
  redirect("/customers");
}

