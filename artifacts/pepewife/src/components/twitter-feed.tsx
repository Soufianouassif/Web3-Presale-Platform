import { useEffect, useRef, useState } from "react";
import { Twitter } from "lucide-react";
import { useLanguage } from "@/i18n/context";

interface TwitterFeedProps {
  username: string;
  tweetCount?: number;
}

export default function TwitterFeed({ username, tweetCount = 5 }: TwitterFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const { dir } = useLanguage();

  useEffect(() => {
    setLoaded(false);

    if (containerRef.current) {
      containerRef.current.innerHTML = "";
    }

    const anchor = document.createElement("a");
    anchor.className = "twitter-timeline";
    anchor.setAttribute("data-theme", "light");
    anchor.setAttribute("data-tweet-limit", String(tweetCount));
    anchor.setAttribute("data-chrome", "noheader nofooter noborders transparent");
    anchor.setAttribute("data-dnt", "true");
    anchor.setAttribute("href", `https://twitter.com/${username}`);
    anchor.textContent = `Tweets by @${username}`;

    if (containerRef.current) {
      containerRef.current.appendChild(anchor);
    }

    const existingScript = document.querySelector('script[src="https://platform.twitter.com/widgets.js"]');
    if (existingScript) {
      existingScript.remove();
    }

    const script = document.createElement("script");
    script.src = "https://platform.twitter.com/widgets.js";
    script.async = true;
    script.charset = "utf-8";
    script.onload = () => {
      setTimeout(() => setLoaded(true), 1500);
    };
    document.body.appendChild(script);

    const fallbackTimer = setTimeout(() => setLoaded(true), 5000);

    return () => {
      clearTimeout(fallbackTimer);
    };
  }, [username, tweetCount]);

  return (
    <div className="relative">
      {!loaded && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center animate-pulse">
            <Twitter className="h-6 w-6 text-[#1DA1F2]" />
          </div>
          <p className="text-sm font-bold text-[#1a1a2e]/40 font-display tracking-wide">
            Loading tweets...
          </p>
        </div>
      )}
      <div
        ref={containerRef}
        className={`transition-opacity duration-500 ${loaded ? "opacity-100" : "opacity-0 absolute inset-0"}`}
        style={{ maxHeight: "600px", overflowY: "auto" }}
      />
    </div>
  );
}
