import Link from "next/link";
import { Button, Card, Input, Label, PageHeader } from "@/components/ui";
import { createPlan } from "../actions";

export default function NewPlanPage() {
  return (
    <div className="max-w-md mx-auto">
      <PageHeader title="プランを登録" />
      <Card className="p-4 sm:p-6">
        <form action={createPlan} className="space-y-4">
          <div>
            <Label htmlFor="name">プラン名</Label>
            <Input
              id="name"
              name="name"
              placeholder="例: 16回券（通常）"
              required
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="session_count">回数</Label>
              <Input
                id="session_count"
                name="session_count"
                type="number"
                min={1}
                required
                placeholder="16"
              />
            </div>
            <div>
              <Label htmlFor="total_price">セット価格 ¥</Label>
              <Input
                id="total_price"
                name="total_price"
                type="number"
                min={0}
                required
                placeholder="80000"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="is_pair" className="size-4" />
            ペア専用プラン（1セッション=1枚を2人で共有）
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Link href="/plans">
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
            <Button type="submit">登録</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
