interface ZiraLogoProps {
  size?: number;
  className?: string;
}

export function ZiraLogo({ size = 40, className = "" }: ZiraLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 56 56"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background circle */}
      <circle cx="28" cy="28" r="27" fill="currentColor" fillOpacity="0.12" />

      {/* Main stalk */}
      <line
        x1="28" y1="46" x2="28" y2="10"
        stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"
      />

      {/* Curve at base */}
      <path
        d="M28 46 Q22 43 20 38"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none"
      />

      {/* Top grain (center) */}
      <ellipse cx="28" cy="11.5" rx="4.2" ry="5.8"
        fill="currentColor"
      />

      {/* Left grain top */}
      <ellipse cx="21.5" cy="17" rx="3.4" ry="5"
        fill="currentColor" fillOpacity="0.85"
        transform="rotate(-28 21.5 17)"
      />
      {/* Right grain top */}
      <ellipse cx="34.5" cy="17" rx="3.4" ry="5"
        fill="currentColor" fillOpacity="0.85"
        transform="rotate(28 34.5 17)"
      />

      {/* Left grain mid */}
      <ellipse cx="20" cy="25" rx="3" ry="4.4"
        fill="currentColor" fillOpacity="0.7"
        transform="rotate(-32 20 25)"
      />
      {/* Right grain mid */}
      <ellipse cx="36" cy="25" rx="3" ry="4.4"
        fill="currentColor" fillOpacity="0.7"
        transform="rotate(32 36 25)"
      />

      {/* Left grain lower */}
      <ellipse cx="20.5" cy="33" rx="2.6" ry="3.8"
        fill="currentColor" fillOpacity="0.55"
        transform="rotate(-35 20.5 33)"
      />
      {/* Right grain lower */}
      <ellipse cx="35.5" cy="33" rx="2.6" ry="3.8"
        fill="currentColor" fillOpacity="0.55"
        transform="rotate(35 35.5 33)"
      />

      {/* Whiskers top */}
      <line x1="28" y1="7.5" x2="24" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
      <line x1="28" y1="7.5" x2="32" y2="4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
      <line x1="28" y1="7.5" x2="28" y2="3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" opacity="0.6"/>
    </svg>
  );
}

export function ZiraBrand({
  size = 40,
  showTagline = true,
  lang = "ar",
}: {
  size?: number;
  showTagline?: boolean;
  lang?: "ar" | "en";
}) {
  const nameSize = Math.round(size * 0.45);
  const tagSize = Math.round(size * 0.25);

  return (
    <div className="flex items-center gap-3">
      <div className="text-primary shrink-0">
        <ZiraLogo size={size} />
      </div>
      <div>
        <div
          className="font-black text-primary leading-none tracking-tight"
          style={{ fontSize: nameSize }}
        >
          {lang === "ar" ? "زراعة.كوم" : "Zira3a.com"}
        </div>
        {showTagline && (
          <div
            className="text-muted-foreground/70 font-medium leading-none mt-1"
            style={{ fontSize: tagSize }}
          >
            {lang === "ar" ? "عالم الزراعة" : "World of Agriculture"}
          </div>
        )}
      </div>
    </div>
  );
}
