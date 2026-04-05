import { useRef, useEffect, useState } from "react";
import { Twitter, ExternalLink } from "lucide-react";
import { useLanguage } from "@/i18n/context";
import imgLogo from "@assets/hero-character_1775153683720.png";

interface TwitterFeedProps {
  username: string;
}

const memeImages = [
  "/meme-posts/meme1.png",
  "/meme-posts/meme2.png",
  "/meme-posts/meme3.png",
  "/meme-posts/meme4.png",
  "/meme-posts/meme5.png",
  "/meme-posts/meme6.png",
  "/meme-posts/meme7.png",
  "/meme-posts/meme8.png",
  "/meme-posts/meme9.png",
  "/meme-posts/meme10.png",
];

export default function TwitterFeed({ username }: TwitterFeedProps) {
  const { t, dir } = useLanguage();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isPaused, setIsPaused] = useState(false);

  const posts = [
    { text: t.social.post1, time: t.social.post1Time, likes: t.social.post1Likes, img: memeImages[0] },
    { text: t.social.post2, time: t.social.post2Time, likes: t.social.post2Likes, img: memeImages[1] },
    { text: t.social.post3, time: t.social.post3Time, likes: t.social.post3Likes, img: memeImages[2] },
    { text: t.social.post4, time: t.social.post4Time, likes: t.social.post4Likes, img: memeImages[3] },
    { text: t.social.post5, time: t.social.post5Time, likes: t.social.post5Likes, img: memeImages[4] },
    { text: t.social.post6, time: t.social.post6Time, likes: t.social.post6Likes, img: memeImages[5] },
    { text: t.social.post7, time: t.social.post7Time, likes: t.social.post7Likes, img: memeImages[6] },
    { text: t.social.post8, time: t.social.post8Time, likes: t.social.post8Likes, img: memeImages[7] },
    { text: t.social.post9, time: t.social.post9Time, likes: t.social.post9Likes, img: memeImages[8] },
    { text: t.social.post10, time: t.social.post10Time, likes: t.social.post10Likes, img: memeImages[9] },
  ];

  const allPosts = [...posts, ...posts];

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let animationId: number;
    let scrollSpeed = 1;

    const animate = () => {
      if (!isPaused && el) {
        el.scrollLeft += dir === "rtl" ? -scrollSpeed : scrollSpeed;

        const halfWidth = el.scrollWidth / 2;
        if (dir === "rtl") {
          if (Math.abs(el.scrollLeft) >= halfWidth) {
            el.scrollLeft = 0;
          }
        } else {
          if (el.scrollLeft >= halfWidth) {
            el.scrollLeft = 0;
          }
        }
      }
      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationId);
  }, [isPaused, dir]);

  return (
    <div>
      <div
        ref={scrollRef}
        className="flex gap-5 overflow-x-hidden py-2"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
        onTouchStart={() => setIsPaused(true)}
        onTouchEnd={() => setIsPaused(false)}
      >
        {allPosts.map((post, i) => (
          <a
            key={i}
            href={`https://x.com/${username}`}
            target="_blank"
            rel="noopener noreferrer"
            className="meme-card bg-white rounded-2xl p-5 flex-shrink-0 w-[320px] block hover:scale-[1.03] transition-transform"
          >
            <div className="flex items-center gap-3 mb-3">
              <img src={imgLogo} alt="PW" className="w-10 h-10 rounded-full border-2 border-[#1a1a2e]" />
              <div>
                <div className="font-display text-[#1a1a2e] text-sm tracking-wider">PEPEWIFE 🐸</div>
                <div className="text-xs text-[#1a1a2e]/40 font-bold">@{username}</div>
              </div>
              <Twitter className="ms-auto text-[#1DA1F2] h-5 w-5" />
            </div>
            <div className="rounded-xl overflow-hidden mb-3 border-2 border-[#1a1a2e]/10">
              <img
                src={post.img}
                alt={`PEPEWIFE meme post ${i + 1}`}
                className="w-full h-[200px] object-cover"
                loading="lazy"
              />
            </div>
            <p className="text-sm mb-3 leading-relaxed text-[#1a1a2e]/70 font-bold line-clamp-3">{post.text}</p>
            <div className="flex items-center justify-between text-xs font-display text-[#1a1a2e]/40 tracking-wide">
              <span>{post.time}</span>
              <span>{post.likes}</span>
            </div>
          </a>
        ))}
      </div>
      <div className="flex justify-center mt-8">
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
