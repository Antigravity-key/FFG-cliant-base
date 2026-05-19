"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function confirmSession(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("confirm_session", { p_session_id: id });
  if (error) throw error;
  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/customers");
}

export async function cancelSession(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_session", { p_session_id: id });
  if (error) throw error;
  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/customers");
}

export async function revertSession(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.rpc("revert_session", { p_session_id: id });
  if (error) throw error;
  revalidatePath("/today");
  revalidatePath("/calendar");
  revalidatePath("/dashboard");
  revalidatePath("/customers");
}
