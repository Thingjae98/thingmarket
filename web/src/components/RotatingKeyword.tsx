"use client";

import { useEffect, useState } from "react";

const KEYWORDS = ["금반지", "금목걸이", "금팔찌", "금귀걸이", "골드바", "금시계", "24K 골드", "18K 골드"];

// 가장 긴 단어를 ghost로 그려서 폭을 고정 → 주변 텍스트가 흔들리지 않음
const LONGEST = KEYWORDS.reduce((a, b) => (b.length > a.length ? b : a), "");

export default function RotatingKeyword() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % KEYWORDS.length), 2200);
    return () => clearInterval(t);
  }, []);

  return (
    <span className="inline-grid align-baseline" aria-live="polite">
      {/* ghost: 폭 확보용 */}
      <span className="col-start-1 row-start-1 invisible" aria-hidden>
        {LONGEST}
      </span>
      {/* 실제 표시 */}
      <span
        key={idx}
        className="col-start-1 row-start-1 font-extrabold"
        style={{
          color: "var(--accent)",
          animation: "kwSlideIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        {KEYWORDS[idx]}
      </span>

    </span>
  );
}
