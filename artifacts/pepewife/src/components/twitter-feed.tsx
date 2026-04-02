import { useEffect, useRef, useState } from "react";
import { Twitter } from "lucide-react";
import { useLanguage } from "@/i18n/context";

interface TwitterFeedProps {
  username: string;
  tweetCount?: number;
}

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (el?: HTMLElement) => Promise<void>;
        createTimeline: (
          source: { sourceType: string; screenName: string },
          el: HTMLElement,
          options?: Record<string, unknown>
        ) => Promise<HTMLElement | undefined>;
      };
    };
  }
}

export default function TwitterFeed({ username, tweetCount = 5 }: TwitterFeedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<"loading" | "loaded" | "failed">("loading");
  const { t } = useLanguage();

  useEffect(() => {
    setStatus("loading");
    let cancelled = false;

    const loadWidget = () => {
      if (cancelled || !containerRef.current) return;

      if (window.twttr?.widgets) {
        containerRef.current.innerHTML = "";
        window.twttr.widgets
          .createTimeline(
            { sourceType: "profile", screenName: username },
            containerRef.current,
            {
              tweetLimit: tweetCount,
              chrome: "noheader nofooter noborders transparent",
              dnt: true,
              theme: "light",
            }
          )
          .then((el) => {
            if (!cancelled) {
              setStatus(el ? "loaded" : "failed");
            }
          })
          .catch(() => {
            if (!cancelled) setStatus("failed");
          });
      }
    };

    const existingScript = document.querySelector(
      'script[src="https://platform.twitter.com/widgets.js"]'
    );

    if (existingScript && window.twttr?.widgets) {
      loadWidget();
    } else {
      if (existingScript) existingScript.remove();

      const script = document.createElement("script");
      script.src = "https://platform.twitter.com/widgets.js";
      script.async = true;
      script.charset = "utf-8";
      script.onload = () => {
        setTimeout(loadWidget, 500);
      };
      script.onerror = () => {
        if (!cancelled) setStatus("failed");
      };
      document.body.appendChild(script);
    }

    const timeout = setTimeout(() => {
      if (!cancelled && status === "loading") {
        setStatus("failed");
      }
    }, 8000);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [username, tweetCount]);

  const fallbackPosts = [
    { text: t.social.post1, time: t.social.post1Time, likes: t.social.post1Likes },
    { text: t.social.post2, time: t.social.post2Time, likes: t.social.post2Likes },
    { text: t.social.post3, time: t.social.post3Time, likes: t.social.post3Likes },
  ];

  return (
    <div>
      {status === "loading" && (
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
        className={`transition-opacity duration-500 ${status === "loaded" ? "opacity-100" : "hidden"}`}
        style={{ maxHeight: "600px", overflowY: "auto" }}
      />

      {status === "failed" && (
        <div className="grid md:grid-cols-3 gap-5">
          {fallbackPosts.map((post, i) => (
            <div key={i} className="meme-card bg-white rounded-2xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <img src="/logo.png" alt="PW" className="w-10 h-10 rounded-full border-2 border-[#1a1a2e]" />
                <div>
                  <div className="font-display text-[#1a1a2e] text-sm tracking-wider">PEPEWIFE 🐸</div>
                  <div className="text-xs text-[#1a1a2e]/40 font-bold">@{username}</div>
                </div>
                <Twitter className="ms-auto text-[#1DA1F2] h-5 w-5" />
              </div>
              <p className="text-sm mb-4 leading-relaxed text-[#1a1a2e]/70 font-bold">{post.text}</p>
              <div className="flex items-center justify-between text-xs font-display text-[#1a1a2e]/40 tracking-wide">
                <span>{post.time}</span>
                <span>{post.likes}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
