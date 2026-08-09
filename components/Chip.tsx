"use client";

export default function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button onClick={onClick} data-active={active} className="chip px-3 py-1.5 text-sm mr-2 mb-2">
      {label}
    </button>
  );
}
