"use client";

/**
 * 조건 문항의 선택지 그리드.
 *
 * 높이를 고정하지 않고 내용에 맞춰 잡는다. 짧은 단어("혼자")가 큰 빈 칸 가운데
 * 떠 있는 것처럼 보이지 않게 하기 위함이다.
 *
 * 열 수는 선택지 개수에서 자동으로 정한다. 3지선다를 1열로 깔면 짧은 문구 하나가
 * 화면 폭을 다 쓰는 긴 막대가 되어 빈 공간이 크게 남는다.
 */
function gridColumns(count) {
  if (count === 3) return "grid-cols-1 sm:grid-cols-3";
  return "grid-cols-2";
}

export default function OptionGrid({ options, selected, onSelect }) {
  return (
    <div className={`grid gap-2 ${gridColumns(options.length)}`}>
      {options.map((option) => {
        const isSelected = selected === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            aria-pressed={isSelected}
            className="chunky flex items-center justify-center rounded-2xl border-2 px-4 py-3 text-center text-sm font-bold leading-snug sm:text-base"
            style={{
              borderColor: isSelected ? "var(--accent)" : "var(--border)",
              background: isSelected ? "var(--accent)" : "var(--surface)",
              color: isSelected ? "var(--accent-contrast)" : "var(--text)",
              "--chunk": isSelected
                ? "var(--accent-strong)"
                : "var(--chunk-soft)",
            }}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
