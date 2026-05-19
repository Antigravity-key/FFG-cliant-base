"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

type ParticipantInput = {
  customerId: string;
  ticketBundleId: string;
};

export async function createSession(input: {
  startAt: string;
  endAt: string;
  notes?: string | null;
  participants: ParticipantInput[];
}) {
  const supabase = await createClient();

  if (input.participants.length === 0 || input.participants.length > 2) {
    throw new Error("参加者は1〜2名です");
  }
  if (new Date(input.endAt) <= new Date(input.startAt)) {
    throw new Error("終了時刻は開始時刻より後にしてください");
  }

  const { data: session, error: sessErr } = await supabase
    .from("sessions")
    .insert({
      start_at: input.startAt,
      end_at: input.endAt,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();
  if (sessErr) throw sessErr;

  const sharedBundle =
    input.participants.length === 2 &&
    input.participants[0].ticketBundleId === input.participants[1].ticketBundleId;

  const rows = input.participants.map((p, idx) => ({
    session_id: session.id,
    customer_id: p.customerId,
    ticket_bundle_id: p.ticketBundleId,
    // When two participants share a pair bundle, the first is the primary (consumes the single ticket).
    is_pair_primary: sharedBundle ? idx === 0 : true,
  }));

  const { error: partErr } = await supabase
    .from("session_participants")
    .insert(rows);
  if (partErr) {
    await supabase.from("sessions").delete().eq("id", session.id);
    throw partErr;
  }

  revalidatePath("/calendar");
  revalidatePath("/today");
  return { id: session.id };
}

export async function updateSession(
  id: string,
  input: {
    startAt: string;
    endAt: string;
    notes?: string | null;
    participants: ParticipantInput[];
  }
) {
  const supabase = await createClient();

  if (input.participants.length === 0 || input.participants.length > 2) {
    throw new Error("参加者は1〜2名です");
  }

  const { error: sessErr } = await supabase
    .from("sessions")
    .update({
      start_at: input.startAt,
      end_at: input.endAt,
      notes: input.notes ?? null,
    })
    .eq("id", id);
  if (sessErr) throw sessErr;

  // Simplest correct approach: delete and re-insert participants.
  // Safe because session status is `scheduled` (not confirmed).
  const { error: delErr } = await supabase
    .from("session_participants")
    .delete()
    .eq("session_id", id);
  if (delErr) throw delErr;

  const sharedBundle =
    input.participants.length === 2 &&
    input.participants[0].ticketBundleId === input.participants[1].ticketBundleId;

  const rows = input.participants.map((p, idx) => ({
    session_id: id,
    customer_id: p.customerId,
    ticket_bundle_id: p.ticketBundleId,
    is_pair_primary: sharedBundle ? idx === 0 : true,
  }));

  const { error: insErr } = await supabase
    .from("session_participants")
    .insert(rows);
  if (insErr) throw insErr;

  revalidatePath("/calendar");
  revalidatePath("/today");
}

export async function deleteSession(id: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("sessions").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/calendar");
  revalidatePath("/today");
}

export async function rescheduleSession(
  id: string,
  startAt: string,
  endAt: string
) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ start_at: startAt, end_at: endAt })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/calendar");
  revalidatePath("/today");
}
