import Image from "next/image";

interface GambitLogoProps {
  className?: string;
}

export function GambitLogo({ className }: GambitLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <Image
        src="/GambitLogo128x128.png"
        alt="Gambit Logo"
        width={32}
        height={32}
        className="w-8 h-8"
      />
      <span className="text-xl font-semibold text-gray-900">Gambit</span>
    </div>
  );
}

