import Wizard from "@/components/Wizard";

export default function Home() {
  return (
    // my-auto 로 세로 가운데 정렬한다. justify-center 와 달리 내용이 화면보다
    // 길어져도 위쪽이 잘리지 않는다.
    <main className="mx-auto flex min-h-dvh w-full max-w-5xl flex-col px-5 py-8 sm:px-8">
      <div className="my-auto w-full">
        <Wizard />
      </div>
    </main>
  );
}
