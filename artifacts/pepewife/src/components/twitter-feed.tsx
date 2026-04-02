import { useState } from "react";
import { Twitter, ExternalLink } from "lucide-react";
import { useLanguage } from "@/i18n/context";

interface TwitterFeedProps {
  username: string;
}

export default function TwitterFeed({ username }: TwitterFeedProps) {
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [iframeError, setIframeError] = useState(false);
  const { t } = useLanguage();

  const timelineUrl = `https://syndication.twitter.com/srv/timeline-profile/screen-name/${username}?dnt=true&embedId=twitter-widget-0&features=eyJ0ZndfdGltZWxpbmVfbGlzdCI6eyJidWNrZXQiOltdLCJ2ZXJzaW9uIjpudWxsfSwidGZ3X2ZvbGxvd2VyX2NvdW50X3N1bnNldCI6eyJidWNrZXQiOnRydWUsInZlcnNpb24iOm51bGx9LCJ0ZndfdHdlZXRfZWRpdF9iYWNrZW5kIjp7ImJ1Y2tldCI6Im9uIiwidmVyc2lvbiI6bnVsbH0sInRmd19yZWZzcmNfc2Vzc2lvbiI6eyJidWNrZXQiOiJvbiIsInZlcnNpb24iOm51bGx9fQ%3D%3D&frame=false&hideBorder=true&hideFooter=true&hideHeader=true&hideScrollBar=false&lang=en&maxHeight=600px&origin=https%3A%2F%2Fpublish.twitter.com&showHeader=false&showReplies=false&transparent=true&theme=light`;

  const fallbackPosts = [
    { text: t.social.post1, time: t.social.post1Time, likes: t.social.post1Likes },
    { text: t.social.post2, time: t.social.post2Time, likes: t.social.post2Likes },
    { text: t.social.post3, time: t.social.post3Time, likes: t.social.post3Likes },
  ];

  if (iframeError) {
    return (
      <div>
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
        <div className="flex justify-center mt-6">
          <a
            href={`https://x.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1DA1F2] text-white font-display tracking-wide text-sm hover:bg-[#1a91da] transition-colors"
          >
            <Twitter className="h-4 w-4" />
            View on X
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {!iframeLoaded && (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <div className="w-12 h-12 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center animate-pulse">
            <Twitter className="h-6 w-6 text-[#1DA1F2]" />
          </div>
          <p className="text-sm font-bold text-[#1a1a2e]/40 font-display tracking-wide">
            Loading tweets...
          </p>
        </div>
      )}
      <div className={`rounded-2xl overflow-hidden bg-white transition-opacity duration-500 ${iframeLoaded ? "opacity-100" : "opacity-0 h-0"}`}>
        <iframe
          src={timelineUrl}
          style={{ width: "100%", height: "600px", border: "none" }}
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
          onLoad={() => setIframeLoaded(true)}
          onError={() => setIframeError(true)}
          title={`@${username} Twitter Timeline`}
        />
      </div>
      {iframeLoaded && (
        <div className="flex justify-center mt-6">
          <a
            href={`https://x.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#1DA1F2] text-white font-display tracking-wide text-sm hover:bg-[#1a91da] transition-colors"
          >
            <Twitter className="h-4 w-4" />
            View on X
            <ExternalLink className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}
