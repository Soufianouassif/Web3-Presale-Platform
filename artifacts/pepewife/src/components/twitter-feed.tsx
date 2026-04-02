import { useState, useEffect } from "react";
import { Twitter, ExternalLink } from "lucide-react";
import { useLanguage } from "@/i18n/context";

interface Tweet {
  text: string;
  time: string;
  name: string;
  handle: string;
  avatar: string;
  likes: string;
  url: string;
}

interface TwitterFeedProps {
  username: string;
}

export default function TwitterFeed({ username }: TwitterFeedProps) {
  const [tweets, setTweets] = useState<Tweet[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasTweets, setHasTweets] = useState(false);
  const { t } = useLanguage();

  useEffect(() => {
    let cancelled = false;

    const fetchTweets = async () => {
      try {
        const res = await fetch(`/api/twitter/timeline/${username}`);
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        if (!cancelled) {
          if (data.tweets && data.tweets.length > 0) {
            setTweets(data.tweets);
            setHasTweets(true);
          }
        }
      } catch {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchTweets();
    return () => { cancelled = true; };
  }, [username]);

  const fallbackPosts = [
    { text: t.social.post1, time: t.social.post1Time, likes: t.social.post1Likes },
    { text: t.social.post2, time: t.social.post2Time, likes: t.social.post2Likes },
    { text: t.social.post3, time: t.social.post3Time, likes: t.social.post3Likes },
  ];

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <div className="w-12 h-12 rounded-full bg-[#1DA1F2]/10 flex items-center justify-center animate-pulse">
          <Twitter className="h-6 w-6 text-[#1DA1F2]" />
        </div>
        <p className="text-sm font-bold text-[#1a1a2e]/40 font-display tracking-wide">
          Loading tweets...
        </p>
      </div>
    );
  }

  const displayPosts = hasTweets
    ? tweets.map((tw) => ({
        text: tw.text,
        time: tw.time,
        likes: tw.likes ? `❤️ ${tw.likes}` : "",
        avatar: tw.avatar,
        name: tw.name,
        handle: tw.handle,
        url: tw.url,
      }))
    : fallbackPosts.map((p) => ({
        text: p.text,
        time: p.time,
        likes: p.likes,
        avatar: "",
        name: "PEPEWIFE 🐸",
        handle: `@${username}`,
        url: `https://x.com/${username}`,
      }));

  return (
    <div>
      <div className="grid md:grid-cols-3 gap-5">
        {displayPosts.map((post, i) => (
          <a
            key={i}
            href={post.url}
            target="_blank"
            rel="noopener noreferrer"
            className="meme-card bg-white rounded-2xl p-5 block hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-3 mb-3">
              {post.avatar ? (
                <img src={post.avatar} alt="" className="w-10 h-10 rounded-full border-2 border-[#1a1a2e]" />
              ) : (
                <img src="/logo.png" alt="PW" className="w-10 h-10 rounded-full border-2 border-[#1a1a2e]" />
              )}
              <div>
                <div className="font-display text-[#1a1a2e] text-sm tracking-wider">{post.name}</div>
                <div className="text-xs text-[#1a1a2e]/40 font-bold">{post.handle}</div>
              </div>
              <Twitter className="ms-auto text-[#1DA1F2] h-5 w-5" />
            </div>
            <p className="text-sm mb-4 leading-relaxed text-[#1a1a2e]/70 font-bold">{post.text}</p>
            <div className="flex items-center justify-between text-xs font-display text-[#1a1a2e]/40 tracking-wide">
              <span>{post.time}</span>
              <span>{post.likes}</span>
            </div>
          </a>
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
          Follow @{username}
          <ExternalLink className="h-3 w-3" />
        </a>
      </div>
    </div>
  );
}
