import { ExternalLink, Megaphone } from "lucide-react";
import { useLang } from "@/context/LangContext";

interface Ad {
  id: number;
  title: string;
  body: string;
  imageUrl?: string | null;
  linkUrl: string;
  sponsorName: string;
}

interface AdCardProps {
  ad: Ad;
}

export function AdCard({ ad }: AdCardProps) {
  const { lang } = useLang();
  const isAr = lang === "ar";

  return (
    <div className="border-b border-border/50 px-4 py-4 hover:bg-muted/20 transition-colors">
      <div className="flex items-center gap-1.5 mb-2">
        <Megaphone className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-muted-foreground font-medium">
          {isAr ? "إعلان مدفوع" : "Sponsored"}
        </span>
        <span className="text-muted-foreground/50 text-xs">·</span>
        <span className="text-xs text-muted-foreground">{ad.sponsorName}</span>
      </div>

      <a
        href={ad.linkUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="block group"
      >
        {ad.imageUrl && (
          <div className="mb-3 rounded-xl overflow-hidden border border-border/30">
            <img
              src={ad.imageUrl}
              alt={ad.title}
              className="w-full h-36 object-cover group-hover:scale-[1.02] transition-transform duration-300"
            />
          </div>
        )}

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="font-bold text-[15px] leading-snug group-hover:text-primary transition-colors">
              {ad.title}
            </p>
            <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
              {ad.body}
            </p>
          </div>
          <ExternalLink className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5 group-hover:text-primary transition-colors" />
        </div>

        <div className="mt-2 inline-flex items-center gap-1 text-xs text-primary font-medium">
          {isAr ? "اعرف أكثر" : "Learn more"}
          <ExternalLink className="w-3 h-3" />
        </div>
      </a>
    </div>
  );
}
