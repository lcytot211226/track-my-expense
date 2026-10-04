import { Pacifico } from "next/font/google";

const logoFont = Pacifico({ weight: "400", subsets: ["latin"] });

/**
 * Subanote 品牌字:Pacifico 手寫體 + 品牌色(manifest 的 #799ef6)漸層,底下一道弧形筆刷線。
 * viewBox 寬度是依 Pacifico 24px 下「Subanote」的實際字寬抓的,改字或字級要一起調。
 */
export default function Logo({ className = "h-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 106 36" role="img" aria-label="Subanote" className={`w-auto ${className}`}>
      <defs>
        <linearGradient id="subanote-logo-gradient" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#799ef6" />
          <stop offset="1" stopColor="#4f6bed" />
        </linearGradient>
      </defs>
      <text
        x="3"
        y="24"
        fontSize="24"
        fill="url(#subanote-logo-gradient)"
        style={{ fontFamily: logoFont.style.fontFamily }}
      >
        Subanote
      </text>
      <path
        d="M8 31C38 27.5 72 27.5 102 29.5"
        fill="none"
        stroke="url(#subanote-logo-gradient)"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
