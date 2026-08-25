"use client";

/**
 * 위저드 각 단계에서 쓰는 선택 버튼 그리드.
 *
 * multi 모드에서는 selected 배열의 순서가 곧 사용자의 선택 순서이므로,
 * 배지에 순번을 그대로 노출해 "첫 번째 선택에 가중치가 붙는다"는 점을 보이게 한다.
 */
export default function OptionGrid({
  options,
  selected,
  onSelect,
  multi = false,
  columns = 2,
  disabledWhenUnselected = false,
}) {
  const selectedList = multi ? selected : selected === null ? [] : [selected];

  return (
    <div
      className={`grid gap-2.5 ${columns === 2 ? "grid-cols-2" : "grid-cols-1"}`}
    >
      {options.map((option) => {
        const index = selectedList.indexOf(option);
        const isSelected = index !== -1;
        const isDisabled = disabledWhenUnselected && !isSelected;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onSelect(option)}
            disabled={isDisabled}
            aria-pressed={isSelected}
            className="chunky relative flex min-h-15 items-center justify-center rounded-2xl border-2 px-3 py-3 text-sm font-bold disabled:cursor-not-allowed disabled:opacity-45 sm:text-base"
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
            {multi && isSelected && (
              <span
                className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  background: "var(--accent-contrast)",
                  color: "var(--accent)",
                }}
              >
                {index + 1}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
