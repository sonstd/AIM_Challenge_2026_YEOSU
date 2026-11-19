"use client";

/**
 * 조건 선택지에 붙는 선 아이콘.
 *
 * 글자만 네 개 늘어놓으면 읽어야 할 게 많아 지루하다. 그림이 먼저 눈에 들어오고
 * 글자는 확인용이 되도록 둔다. 이름은 src/config/questions.js 의 `icons` 와 같다.
 */
const PATHS = {
  // 동반자
  alone: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M5.5 20a6.5 6.5 0 0 1 13 0" />
    </>
  ),
  friends: (
    <>
      <circle cx="9" cy="8.5" r="3" />
      <circle cx="17" cy="9.5" r="2.4" />
      <path d="M3.5 19.5a5.5 5.5 0 0 1 11 0" />
      <path d="M15 19.5a4.6 4.6 0 0 1 5.5-4.5" />
    </>
  ),
  couple: (
    <>
      <circle cx="8" cy="11" r="3" />
      <circle cx="16" cy="11" r="3" />
      <path d="M12 7.6c.9-1.6 3.4-1.4 3.4.5 0 1.5-2.2 2.9-3.4 3.9-1.2-1-3.4-2.4-3.4-3.9 0-1.9 2.5-2.1 3.4-.5z" />
      <path d="M3.5 20.5a4.6 4.6 0 0 1 9 0M11.5 20.5a4.6 4.6 0 0 1 9 0" />
    </>
  ),
  family: (
    <>
      <circle cx="7.5" cy="8.5" r="2.7" />
      <circle cx="16.5" cy="8.5" r="2.7" />
      <circle cx="12" cy="14.5" r="2.1" />
      <path d="M3 18a4.6 4.6 0 0 1 7-3.4M14 14.6a4.6 4.6 0 0 1 7 3.4M8.4 21a3.7 3.7 0 0 1 7.2 0" />
    </>
  ),
  // 기간
  "half-day": (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 3v2M12 19v2M4.5 12h-2M21.5 12h-2M6.7 6.7 5.3 5.3M18.7 18.7l-1.4-1.4" />
      <path d="M12 8v4l2.5 1.5" />
    </>
  ),
  "one-day": (
    <>
      <circle cx="12" cy="12" r="4.2" />
      <path d="M12 2.5v2.4M12 19.1v2.4M4.4 12H2M22 12h-2.4M6.3 6.3 4.6 4.6M19.4 19.4l-1.7-1.7M17.7 6.3l1.7-1.7M4.6 19.4l1.7-1.7" />
    </>
  ),
  "one-night": (
    <>
      <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8.2 8.2 0 1 0 10 10z" />
      <path d="M16.5 4.5l.7 1.6 1.6.7-1.6.7-.7 1.6-.7-1.6-1.6-.7 1.6-.7z" />
    </>
  ),
  "many-nights": (
    <>
      <path d="M16.8 13.2A6.6 6.6 0 0 1 8.5 4.9a6.8 6.8 0 1 0 8.3 8.3z" />
      <path d="M19.5 15.5l.6 1.4 1.4.6-1.4.6-.6 1.4-.6-1.4-1.4-.6 1.4-.6z" />
      <path d="M14.5 3l.5 1.1 1.1.5-1.1.5-.5 1.1-.5-1.1-1.1-.5 1.1-.5z" />
    </>
  ),
};

export default function OptionIcon({ name, className = "" }) {
  const paths = PATHS[name];
  if (!paths) return null;

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths}
    </svg>
  );
}
