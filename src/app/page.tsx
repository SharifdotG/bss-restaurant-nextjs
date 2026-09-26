import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="grid min-h-dvh place-items-center p-6">
      <div className="w-full max-w-sm rounded-xl bg-card p-6 shadow-md">
        <h1 className="text-xl font-semibold">Shorshe Kitchen</h1>
        <p className="mt-1 text-sm text-muted-foreground">Token check · ৳5,535.61 · আজকের অর্ডার</p>
        <div className="mt-5 flex gap-2">
          <Button>Primary</Button>
          <Button variant="outline">Outline</Button>
          <span className="rounded-full bg-tone-green-subtle px-2.5 py-1 text-xs font-medium text-tone-green-text">
            Ready
          </span>
        </div>
      </div>
    </main>
  );
}
