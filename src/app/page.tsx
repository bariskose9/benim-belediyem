import { messages } from "@/config/messages";

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">{messages.home.heading}</h1>
      <p className="text-base text-muted-foreground">{messages.home.intro}</p>
    </main>
  );
}
