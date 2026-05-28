"use client";

import { useTransition, useState } from "react";
import { Button } from "@/components/ui";
import { deleteCustomer } from "../../actions";

export function DeleteCustomerButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!window.confirm("この顧客を完全に削除しますか？\n※セッション履歴や購入済みチケットがある場合は削除できません。")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      try {
        await deleteCustomer(id);
      } catch (err: any) {
        setError(err.message || "削除に失敗しました");
      }
    });
  };

  return (
    <div className="w-full">
      {error && (
        <div className="mb-4 p-3 text-sm text-danger bg-danger/10 border border-danger/20 rounded-md">
          {error}
        </div>
      )}
      <Button
        type="button"
        variant="danger"
        disabled={isPending}
        onClick={handleDelete}
        className="w-full sm:w-auto"
      >
        {isPending ? "削除中..." : "顧客を削除"}
      </Button>
    </div>
  );
}
