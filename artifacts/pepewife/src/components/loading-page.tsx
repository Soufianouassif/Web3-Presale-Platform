import { useState, useEffect } from "react";

const loadingTexts = [
  "Loading the memes... 🐸",
  "Warming up the rocket... 🚀",
  "Calling PEPEWIFE... 👰",
  "Summoning the degens... 💎",
  "WAGMI loading... 🤝",
];

export default function LoadingPage({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [textIndex, setTextIndex] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setFadeOut(true);
          setTimeout(onComplete, 600);
          return 100;
        }
        return prev + 2;
      });
    }, 40);
    return () => clearInterval(interval);
  }, [onComplete]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTextIndex((prev) => (prev + 1) % loadingTexts.length);
    }, 800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-gradient-to-br from-[#E8F5E9] via-[#FCE4EC] to-[#FFFDE7] transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}
    >
      <div className="absolute inset-0 pattern-dots opacity-20 pointer-events-none" />

      <div aria-hidden="true" className="absolute top-[10%] left-[8%] text-5xl opacity-15 animate-bounce" style={{ animationDuration: "2.5s" }}>🐸</div>
      <div aria-hidden="true" className="absolute top-[15%] right-[12%] text-4xl opacity-15 animate-bounce" style={{ animationDuration: "3s", animationDelay: "0.5s" }}>💎</div>
      <div aria-hidden="true" className="absolute bottom-[20%] left-[15%] text-4xl opacity-15 animate-bounce" style={{ animationDuration: "3.5s", animationDelay: "1s" }}>🚀</div>
      <div aria-hidden="true" className="absolute bottom-[15%] right-[10%] text-5xl opacity-15 animate-bounce" style={{ animationDuration: "2.8s", animationDelay: "0.3s" }}>👑</div>
      <div aria-hidden="true" className="absolute top-[45%] left-[5%] text-3xl opacity-10 animate-bounce" style={{ animationDuration: "4s", animationDelay: "1.5s" }}>🌙</div>
      <div aria-hidden="true" className="absolute top-[40%] right-[6%] text-3xl opacity-10 animate-bounce" style={{ animationDuration: "3.2s", animationDelay: "0.8s" }}>⭐</div>

      <div className="relative z-10 flex flex-col items-center text-center px-6">
        <div className="relative mb-6">
          <div
            className="w-28 h-28 sm:w-36 sm:h-36 rounded-full border-4 border-[#1a1a2e] shadow-[5px_5px_0px_#1a1a2e] overflow-hidden bg-white"
            style={{ animation: "pulse 2s ease-in-out infinite" }}
          >
            <img src="/logo.png" alt="PEPEWIFE" className="w-full h-full object-cover" />
          </div>
          <div
            className="absolute -top-2 -right-2 sticker bg-[#4CAF50] text-white text-xs px-2 py-1"
            style={{ transform: "rotate(12deg)", animation: "wiggle 1s ease-in-out infinite" }}
          >
            LFG! 🔥
          </div>
        </div>

        <h1 className="text-4xl sm:text-5xl font-display text-[#1a1a2e] tracking-wider comic-shadow mb-2">
          PEPEWIFE
        </h1>
        <div className="sticker bg-[#FF4D9D] text-white text-sm px-4 py-1 mb-6" style={{ transform: "rotate(-1deg)" }}>
          $PWIFE
        </div>

        <div className="w-64 sm:w-80 mb-4">
          <div className="h-5 rounded-full border-3 border-[#1a1a2e] bg-white overflow-hidden shadow-[3px_3px_0px_#1a1a2e]">
            <div
              className="h-full rounded-full transition-all duration-100 ease-out relative"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #4CAF50 0%, #FF4D9D 50%, #FFD54F 100%)",
              }}
            >
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(255,255,255,0.3) 6px, rgba(255,255,255,0.3) 12px)",
                  animation: "slideStripes 0.5s linear infinite",
                }}
              />
            </div>
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs font-display text-[#1a1a2e]/50 tracking-wider">LOADING...</span>
            <span className="text-xs font-display text-[#FF4D9D] tracking-wider">{progress}%</span>
          </div>
        </div>

        <p className="text-sm font-display text-[#1a1a2e]/60 tracking-wider h-6 transition-all duration-300">
          {loadingTexts[textIndex]}
        </p>

        <div className="mt-8 flex items-center gap-3">
          {[
            { emoji: "🐸", delay: "0s" },
            { emoji: "👰", delay: "0.15s" },
            { emoji: "💰", delay: "0.3s" },
            { emoji: "🚀", delay: "0.45s" },
            { emoji: "🌙", delay: "0.6s" },
          ].map((item, i) => (
            <span
              key={i}
              className="text-2xl"
              style={{
                animation: "bounce 1s ease-in-out infinite",
                animationDelay: item.delay,
              }}
            >
              {item.emoji}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
