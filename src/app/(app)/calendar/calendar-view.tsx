"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import type { EventInput, EventClickArg, DateSelectArg, EventDropArg } from "@fullcalendar/core";
import jaLocale from "@fullcalendar/core/locales/ja";
import { useRouter } from "next/navigation";
import {
  createSession,
  deleteSession,
  rescheduleSession,
  updateSession,
} from "./actions";
import {
  Button,
  Card,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui";
import { Trash2, X } from "lucide-react";
import type {
  ActiveBundle,
  ActiveCustomer,
  ActivePairGroup,
  SessionEvent,
} from "@/lib/types/app";

type ParticipantDraft = {
  customerId: string;
  ticketBundleId: string;
};

type DraftState =
  | { mode: "create"; start: Date; end: Date }
  | { mode: "edit"; session: SessionEvent }
  | null;

export function CalendarView({
  customers,
  pairGroups,
  bundles,
  initialSessions,
}: {
  customers: ActiveCustomer[];
  pairGroups: ActivePairGroup[];
  bundles: ActiveBundle[];
  initialSessions: SessionEvent[];
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftState>(null);
  const calRef = useRef<FullCalendar | null>(null);

  const events: EventInput[] = useMemo(
    () =>
      initialSessions.map((s) => ({
        id: s.id,
        start: s.start_at,
        end: s.end_at,
        title: s.participants.map((p) => p.customer_name).join(" / "),
        classNames: [`fc-event-${s.status}`],
        extendedProps: { session: s },
        editable: s.status === "scheduled",
      })),
    [initialSessions]
  );

  function onSelect(arg: DateSelectArg) {
    setDraft({ mode: "create", start: arg.start, end: arg.end });
    arg.view.calendar.unselect();
  }

  function onEventClick(arg: EventClickArg) {
    const session = arg.event.extendedProps.session as SessionEvent;
    setDraft({ mode: "edit", session });
  }

  async function onEventDrop(arg: EventDropArg) {
    try {
      await rescheduleSession(
        arg.event.id,
        arg.event.start!.toISOString(),
        arg.event.end!.toISOString()
      );
      router.refresh();
    } catch (e) {
      arg.revert();
      alert(e instanceof Error ? e.message : "更新に失敗しました");
    }
  }

  return (
    <div>
      <FullCalendar
        ref={calRef}
        plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "timeGridWeek,timeGridDay,dayGridMonth",
        }}
        locale={jaLocale}
        height="auto"
        nowIndicator
        slotMinTime="06:00:00"
        slotMaxTime="23:00:00"
        slotDuration="00:30:00"
        snapDuration="00:15:00"
        slotLabelInterval="01:00:00"
        slotLabelFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        eventTimeFormat={{ hour: "2-digit", minute: "2-digit", hour12: false }}
        selectable
        selectMirror
        editable
        longPressDelay={300}
        select={onSelect}
        eventClick={onEventClick}
        eventDrop={onEventDrop}
        eventResize={(arg) => onEventDrop(arg as unknown as EventDropArg)}
        events={events}
        views={{
          timeGridWeek: { dayHeaderFormat: { weekday: "short", day: "numeric" } },
          timeGridDay: { dayHeaderFormat: { weekday: "short", month: "numeric", day: "numeric" } },
        }}
      />

      {draft && (
        <SessionDialog
          state={draft}
          customers={customers}
          pairGroups={pairGroups}
          bundles={bundles}
          onClose={() => setDraft(null)}
          onSaved={() => {
            setDraft(null);
            router.refresh();
          }}
        />
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        空きスロットをタップ＝新規予約／予定をタップ＝編集／予定をドラッグ＝時間変更
      </p>
    </div>
  );
}

function SessionDialog({
  state,
  customers,
  pairGroups,
  bundles,
  onClose,
  onSaved,
}: {
  state: NonNullable<DraftState>;
  customers: ActiveCustomer[];
  pairGroups: ActivePairGroup[];
  bundles: ActiveBundle[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const initial =
    state.mode === "edit"
      ? {
          start: state.session.start_at,
          end: state.session.end_at,
          notes: state.session.notes ?? "",
          participants: state.session.participants.map((p) => ({
            customerId: p.customer_id,
            ticketBundleId: p.ticket_bundle_id,
          })),
        }
      : {
          start: state.start.toISOString(),
          end: state.end.toISOString(),
          notes: "",
          participants: [{ customerId: "", ticketBundleId: "" }],
        };

  const [start, setStart] = useState(toLocalInput(initial.start));
  const [end, setEnd] = useState(toLocalInput(initial.end));
  const [notes, setNotes] = useState(initial.notes);
  const [participants, setParticipants] = useState<ParticipantDraft[]>(
    initial.participants
  );
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // bundlesAvailableFor: bundles for this customer = own bundles + bundles
  // attached to any pair_group they belong to.
  function bundlesFor(customerId: string): ActiveBundle[] {
    if (!customerId) return [];
    const myPairGroupIds = pairGroups
      .filter(
        (g) => g.customer_a_id === customerId || g.customer_b_id === customerId
      )
      .map((g) => g.id);
    return bundles.filter(
      (b) =>
        (b.customer_id === customerId ||
          (b.pair_group_id && myPairGroupIds.includes(b.pair_group_id))) &&
        b.remaining_count > 0
    );
  }

  function updateParticipant(idx: number, patch: Partial<ParticipantDraft>) {
    setParticipants((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, ...patch } : p))
    );
  }

  function addParticipant() {
    if (participants.length >= 2) return;
    setParticipants((prev) => [...prev, { customerId: "", ticketBundleId: "" }]);
  }

  function removeParticipant(idx: number) {
    setParticipants((prev) => prev.filter((_, i) => i !== idx));
  }

  async function save() {
    setError(null);
    if (participants.length === 0) {
      setError("参加者を1人以上選択してください");
      return;
    }
    if (participants.some((p) => !p.customerId || !p.ticketBundleId)) {
      setError("各参加者の顧客とチケットを選択してください");
      return;
    }
    if (
      participants.length === 2 &&
      participants[0].customerId === participants[1].customerId
    ) {
      setError("同じ顧客は2回追加できません");
      return;
    }

    const startIso = new Date(start).toISOString();
    const endIso = new Date(end).toISOString();
    if (new Date(endIso) <= new Date(startIso)) {
      setError("終了時刻は開始時刻より後にしてください");
      return;
    }

    startTransition(async () => {
      try {
        if (state.mode === "create") {
          await createSession({
            startAt: startIso,
            endAt: endIso,
            notes: notes || null,
            participants,
          });
        } else {
          await updateSession(state.session.id, {
            startAt: startIso,
            endAt: endIso,
            notes: notes || null,
            participants,
          });
        }
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : "保存に失敗しました");
      }
    });
  }

  async function remove() {
    if (state.mode !== "edit") return;
    if (!confirm("この予定を削除しますか？")) return;
    startTransition(async () => {
      try {
        await deleteSession(state.session.id);
        onSaved();
      } catch (e) {
        setError(e instanceof Error ? e.message : "削除に失敗しました");
      }
    });
  }

  const isConfirmed =
    state.mode === "edit" && state.session.status !== "scheduled";

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3">
      <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 bg-background">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold">
            {state.mode === "create" ? "新規セッション" : "セッション編集"}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="size-5" />
          </button>
        </div>

        {isConfirmed && (
          <div className="mb-3 text-xs text-warning bg-warning/10 rounded p-2">
            このセッションは確定済みです。変更は限定的です。
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label htmlFor="start">開始</Label>
              <Input
                id="start"
                type="datetime-local"
                value={start}
                onChange={(e) => setStart(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="end">終了</Label>
              <Input
                id="end"
                type="datetime-local"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>参加者</Label>
            {participants.map((p, idx) => {
              const myBundles = bundlesFor(p.customerId);
              return (
                <div
                  key={idx}
                  className="rounded-md border border-border p-2 space-y-2"
                >
                  <div className="flex gap-2">
                    <Select
                      value={p.customerId}
                      onChange={(e) =>
                        updateParticipant(idx, {
                          customerId: e.target.value,
                          ticketBundleId: "",
                        })
                      }
                    >
                      <option value="" disabled>
                        — 顧客 —
                      </option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                    {participants.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeParticipant(idx)}
                      >
                        <X className="size-4" />
                      </Button>
                    )}
                  </div>
                  <Select
                    value={p.ticketBundleId}
                    onChange={(e) =>
                      updateParticipant(idx, { ticketBundleId: e.target.value })
                    }
                    disabled={!p.customerId}
                  >
                    <option value="" disabled>
                      — 使用するチケット —
                    </option>
                    {myBundles.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.plan_name} (残{b.remaining_count})
                        {b.is_pair ? " ★ペア" : ""}
                      </option>
                    ))}
                  </Select>
                  {p.customerId && myBundles.length === 0 && (
                    <p className="text-xs text-warning">
                      使えるチケットがありません。先にチケット販売を登録してください。
                    </p>
                  )}
                </div>
              );
            })}
            {participants.length < 2 && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={addParticipant}
              >
                + ペアでもう1名追加
              </Button>
            )}
            {participants.length === 2 &&
              participants[0].ticketBundleId &&
              participants[0].ticketBundleId === participants[1].ticketBundleId && (
                <p className="text-xs text-muted-foreground">
                  ペアプランの共有チケットとして1枚消費されます。
                </p>
              )}
          </div>

          <div>
            <Label htmlFor="notes">メモ</Label>
            <Textarea
              id="notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <div className="flex items-center justify-between pt-2">
            <div>
              {state.mode === "edit" && (
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={remove}
                  disabled={pending}
                >
                  <Trash2 className="size-4" /> 削除
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={pending}
              >
                キャンセル
              </Button>
              <Button type="button" onClick={save} disabled={pending}>
                {pending ? "保存中…" : "保存"}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}

// Convert ISO string to "yyyy-MM-ddTHH:mm" in the local timezone for <input type=datetime-local>.
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}
