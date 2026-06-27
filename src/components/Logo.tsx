import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  className?: string;
  textClassName?: string;
  imageSize?: number;
  hideText?: boolean;
}

export function Logo({ className, textClassName, imageSize = 32, hideText = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <Image
        src="/logo.png"
        alt="Calmant"
        width={imageSize}
        height={imageSize}
        className="rounded-md"
        priority
      />
      {!hideText && (
        <span className={cn("text-sm font-semibold tracking-tight", textClassName)}>
          Calmant
        </span>
      )}
    </div>
  );
}
