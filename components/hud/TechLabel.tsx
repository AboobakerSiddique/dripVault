import { ReactNode } from "react";

export default function TechLabel({
  children,
  icon,
  className = "",
}: {
  children: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <p className={`tech-label flex items-center gap-1.5 ${className}`}>
      {icon}
      {children}
    </p>
  );
}
