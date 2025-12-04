interface GambitLogoProps {
  className?: string;
}

export function GambitLogo({ className }: GambitLogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className || ""}`}>
      <div className="w-8 h-8 bg-gray-900 rounded flex items-center justify-center">
        <span className="text-white font-bold text-lg">G</span>
      </div>
      <span className="text-xl font-semibold text-gray-900">Gambit</span>
    </div>
  );
}

