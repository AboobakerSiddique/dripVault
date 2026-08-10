import Image from "next/image";

export default function Header() {
  return (
    <div
      className="flex items-center justify-center py-5 md:py-8 border-b"
      style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)" }}
    >
      <Image
        src="/logo.png"
        alt="dripVault"
        width={528}
        height={284}
        priority
        className="h-16 md:h-24 w-auto"
        style={{ filter: "drop-shadow(0 0 16px rgba(117,198,255,0.28))" }}
      />
    </div>
  );
}
