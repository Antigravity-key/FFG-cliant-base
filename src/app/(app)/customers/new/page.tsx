import Link from "next/link";
import { Button, Card, Input, Label, PageHeader, Textarea } from "@/components/ui";
import { createCustomer } from "../actions";

export default function NewCustomerPage() {
  return (
    <div className="max-w-xl mx-auto">
      <PageHeader title="顧客を登録" />
      <Card className="p-4 sm:p-6">
        <form action={createCustomer} className="space-y-4">
          <div>
            <Label htmlFor="name">名前 *</Label>
            <Input id="name" name="name" required autoFocus />
          </div>
          <div>
            <Label htmlFor="tags">タグ（カンマ区切り）</Label>
            <Input
              id="tags"
              name="tags"
              placeholder="例: 紹介, 継続"
            />
          </div>
          <div>
            <Label htmlFor="notes">メモ</Label>
            <Textarea id="notes" name="notes" rows={5} />
          </div>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Link href="/customers">
              <Button type="button" variant="outline">
                キャンセル
              </Button>
            </Link>
            <Button type="submit">登録する</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
