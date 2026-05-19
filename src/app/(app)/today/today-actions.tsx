"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui";
import { cancelSession, confirmSession, revertSession } from "./actions";

type Session = {
  id: string;
  status: "scheduled" | "confirmed" | "canceled";
};

export function TodayActions({ session }: { session: Session }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function run(fn: () => Promise<void>) {
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "操作に失敗しました");
      }
    });
  }

  if (session.status === "scheduled") {
    return (
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="success"
          disabled={pending}
          onClick={() => run(() => confirmSession(session.id))}
        >
          実施
        </Button>
        <Button
          size="sm"
          variant="warning"
          disabled={pending}
          onClick={() => run(() => confirmSession(session.id))}
        >
          当日キャンセル(消化)
        </Button>
        <Button
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => run(() => cancelSession(session.id))}
        >
          キャンセル(返却)
        </Button>
      </div>
    );
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      disabled={pending}
      onClick={() => {
        if (!confirm("確定を取り消して未確定に戻しますか？")) return;
        run(() => revertSession(session.id));
      }}
    >
      確定を取り消す
    </Button>
  );
}
