"use client";

/**
 * 출연자가 던지는 질문 말풍선.
 *
 * 사람은 왼쪽 무대(GuideStage)에 서 있으므로 여기서는 **말풍선만** 그린다.
 * 꼬리를 왼쪽 아래로 두어 옆에 선 사람이 하는 말로 읽히게 한다.
 *
 * 질문 문장은 고딕 본문 서체로 둔다(손글씨체 금지, 16px 이상).
 */
export default function GuideAsk({ question, character }) {
  return (
    <div
      className="relative rounded-3xl rounded-bl-lg border-2 px-5 py-4"
      style={{
        borderColor: "var(--border)",
        background: "var(--surface)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <h2 className="break-keep text-xl font-bold leading-snug sm:text-2xl">
        {question}
      </h2>
      {character && (
        <p className="mt-1.5 text-xs font-bold" style={{ color: "var(--accent)" }}>
          {character.name}
        </p>
      )}
    </div>
  );
}
