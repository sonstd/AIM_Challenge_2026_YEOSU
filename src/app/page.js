import Stage from "@/components/Stage";
import Wizard from "@/components/Wizard";

export default function Home() {
  // 화면 전체가 하나의 무대다. 안쪽 배치는 Stage 가 잡는다.
  // test.
  return (
    <main>
      <Stage>
        <Wizard />
      </Stage>
    </main>
  );
}
