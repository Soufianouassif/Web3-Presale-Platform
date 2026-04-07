import { useLocation } from "wouter";

export default function NotFound() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#0a0a0a] bg-grid">
      <div className="text-center px-6">
        <div className="text-8xl mb-6 animate-bounce">🐸</div>
        <div className="sticker mb-6 inline-block text-2xl" style={{ transform: "rotate(-3deg)" }}>404</div>
        <h1 className="text-5xl md:text-7xl font-display text-white comic-shadow tracking-wider mb-4">
          PAGE NOT FOUND
        </h1>
        <p className="text-white/50 font-bold text-lg mb-8 max-w-md mx-auto">
          Looks like this page ran away with the meme tokens 🚀
        </p>
        <button
          onClick={() => navigate("/")}
          className="btn-meme px-8 py-4 rounded-xl font-display text-2xl tracking-wider"
        >
          🏠 GO HOME
        </button>
      </div>
    </div>
  );
}
