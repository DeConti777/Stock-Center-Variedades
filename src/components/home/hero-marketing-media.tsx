import Image from "next/image";
import type { ReactNode } from "react";
import { HeroDirectVideo } from "@/components/home/hero-direct-video";
import {
  parseHeroMarketingVideoUrl,
  type HeroMarketingParsed,
} from "@/lib/hero-marketing-media";

function EmbedCover({ children }: { children: ReactNode }) {
  return (
    <div className="absolute inset-0 overflow-hidden">{children}</div>
  );
}

function YoutubeFrame({ id }: { id: string }) {
  const q = new URLSearchParams({
    rel: "0",
    autoplay: "1",
    mute: "1",
    loop: "1",
    playlist: id,
    playsinline: "1",
  });
  const src = `https://www.youtube.com/embed/${encodeURIComponent(id)}?${q}`;
  return (
    <EmbedCover>
      <iframe
        title="Video marketing Stock Center"
        src={src}
        className="pointer-events-auto absolute inset-0 h-full w-full border-0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        allowFullScreen
      />
    </EmbedCover>
  );
}

function VimeoFrame({ id }: { id: string }) {
  const q = new URLSearchParams({
    autoplay: "1",
    muted: "1",
    loop: "1",
    autopause: "0",
  });
  const src = `https://player.vimeo.com/video/${encodeURIComponent(id)}?${q}`;
  return (
    <EmbedCover>
      <iframe
        title="Video marketing Stock Center"
        src={src}
        className="pointer-events-auto absolute inset-0 h-full w-full border-0"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
      />
    </EmbedCover>
  );
}

function InstagramFrame({ embedPath }: { embedPath: string }) {
  const q = new URLSearchParams({ cr: "1", v: "14", autoplay: "1" });
  const src = `https://www.instagram.com${embedPath}/embed/?${q}`;
  return (
    <EmbedCover>
      <iframe
        title="Instagram Reel"
        src={src}
        className="pointer-events-auto absolute inset-0 h-full w-full border-0"
        allow="encrypted-media; fullscreen; autoplay; clipboard-write"
        allowFullScreen
      />
    </EmbedCover>
  );
}

function LogoFallback() {
  return (
    <Image
      src="/stock-center-logo.png"
      alt="Logo Stock Center"
      fill
      sizes="(min-width: 1024px) 36rem, 100vw"
      className="object-cover object-center"
      priority
    />
  );
}

function renderParsed(parsed: HeroMarketingParsed) {
  switch (parsed.kind) {
    case "instagram":
      return <InstagramFrame embedPath={parsed.embedPath} />;
    case "youtube":
      return <YoutubeFrame id={parsed.id} />;
    case "vimeo":
      return <VimeoFrame id={parsed.id} />;
    case "direct":
      return <HeroDirectVideo url={parsed.url} />;
    default:
      return <LogoFallback />;
  }
}

export function HeroMarketingMedia({ videoUrl }: { videoUrl?: string }) {
  const parsed = parseHeroMarketingVideoUrl(videoUrl);
  return <div className="absolute inset-0">{renderParsed(parsed)}</div>;
}
