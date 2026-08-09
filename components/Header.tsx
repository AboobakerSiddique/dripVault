import Image from "next/image";

export default function Header() {
  return (
    <div
      className="flex items-center px-5 py-3 border-b"
      style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)" }}
    >
      <Image src="/logo.png" alt="dripVault" width={132} height={71} priority style={{ height: 28, width: "auto" }} />
    </div>
  );
}
