import Wizard from "@/components/Wizard";

export default function Home() {
  return (
    <div className="min-h-dvh">
      <main className="mx-auto flex w-full max-w-3xl flex-col px-5 pb-16 pt-8 sm:px-8 sm:pt-12">
        <Wizard />
      </main>
    </div>
  );
}
