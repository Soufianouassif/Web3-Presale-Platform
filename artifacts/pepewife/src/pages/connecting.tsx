import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { CheckCircle, Shield, Zap } from "lucide-react";
import { useLanguage } from "@/i18n/context";
import { useWallet } from "@/contexts/wallet-context";
import imgLogo from "@assets/hero-character_1775153683720.png";
import { tracker } from "@/lib/admin-api";

export default function ConnectingPage() {
  const [, navigate] = useLocation();
  const { t } = useLanguage();
  const { status, shortAddress, network } = useWallet();
  const [currentStep, setCurrentStep] = useState(0);
  const [progress, setProgress] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const steps = [
    { text: t.connecting.step1, emoji: "🔌", color: "#AB47BC" },
    { text: t.connecting.step2, emoji: "🔍", color: "#42A5F5" },
    { text: t.connecting.step3, emoji: "🛡️", color: "#FFD54F" },
    { text: t.connecting.step4, emoji: "📊", color: "#FF4D9D" },
    { text: t.connecting.step5, emoji: "🚀", color: "#4CAF50" },
  ];

  useEffect(() => {
    tracker.visit("/connecting");
  }, []);

  useEffect(() => {
    if (status !== "connected") {
      navigate("/connect");
      return;
    }
  }, [status, navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 0.8;
      });
    }, 40);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (progress < 100) {
      const stepIndex = Math.min(Math.floor(progress / 20), steps.length - 1);
      setCurrentStep(stepIndex);
    }
    if (progress >= 100 && !showSuccess) {
      setShowSuccess(true);
      setTimeout(() => {
        setFadeOut(true);
        const returnPath = sessionStorage.getItem("postConnectPath") || "/dashboard";
        sessionStorage.removeItem("postConnectPath");
        setTimeout(() => navigate(returnPath), 600);
      }, 1200);
    }
  }, [progress, showSuccess, navigate, steps.length]);

  const displayAddress = shortAddress || "7xKp...4mNr";
  const encryptedText = t.connecting.encrypted;

  return (
    <div className={`fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#1a1a2e] transition-opacity duration-500 ${fadeOut ? "opacity-0" : "opacity-100"}`}>
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a2e] via-[#2d1b4e] to-[#1a1a2e]" />
      <div className="absolute inset-0 pattern-dots opacity-5 pointer-events-none" />

      <div aria-hidden="true" className="absolute top-[8%] left-[10%] text-4xl opacity-10 animate-bounce" style={{ animationDuration: "3s" }}>⚡</div>
      <div aria-hidden="true" className="absolute top-[12%] right-[15%] text-3xl opacity-10 animate-bounce" style={{ animationDuration: "3.5s", animationDelay: "0.5s" }}>🔗</div>
      <div aria-hidden="true" className="absolute bottom-[15%] left-[12%] text-4xl opacity-10 animate-bounce" style={{ animationDuration: "4s", animationDelay: "1s" }}>🛡️</div>
      <div aria-hidden="true" className="absolute bottom-[10%] right-[8%] text-3xl opacity-10 animate-bounce" style={{ animationDuration: "2.8s", animationDelay: "0.3s" }}>✨</div>

      <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-md w-full">
        <div className="relative mb-8">
          {!showSuccess ? (
            <div className="w-24 h-24 sm:w-28 sm:h-28 relative">
              <div className="absolute inset-0 rounded-full border-4 border-[#4CAF50]/20" />
              <div
                className="absolute inset-0 rounded-full border-4 border-transparent border-t-[#4CAF50] border-r-[#FF4D9D]"
                style={{ animation: "spin 1s linear infinite" }}
              />
              <div className="absolute inset-2 rounded-full bg-[#1a1a2e] border-2 border-white/10 flex items-center justify-center overflow-hidden">
                <img src={imgLogo} alt="PEPEWIFE" className="w-full h-full object-cover rounded-full" />
              </div>
            </div>
          ) : (
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#4CAF50] flex items-center justify-center border-4 border-[#2E7D32] shadow-[0_0_30px_rgba(76,175,80,0.4)]" style={{ animation: "pulse 1s ease-in-out" }}>
              <CheckCircle className="w-12 h-12 text-white" />
            </div>
          )}
        </div>

        {!showSuccess ? (
          <>
            <h2 className="text-3xl sm:text-4xl font-display text-white tracking-wider comic-shadow mb-2">
              {t.connecting.title}
            </h2>
            <div className="sticker bg-[#AB47BC] text-white text-xs px-3 py-1 mb-6" style={{ transform: "rotate(-1deg)" }}>
              {t.connecting.securingBag}
            </div>
          </>
        ) : (
          <>
            <h2 className="text-3xl sm:text-4xl font-display text-[#4CAF50] tracking-wider comic-shadow mb-2">
              {t.connecting.connected}
            </h2>
            <div className="sticker bg-[#4CAF50] text-white text-xs px-3 py-1 mb-6" style={{ transform: "rotate(-1deg)" }}>
              {t.connecting.wagmi}
            </div>
          </>
        )}

        <div className="w-full meme-card bg-white/5 backdrop-blur rounded-2xl p-5 mb-6 border-white/10">
          <div className="space-y-3 mb-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 border-2 transition-all duration-300 ${
                  i < currentStep
                    ? "bg-[#4CAF50] border-[#4CAF50] scale-100"
                    : i === currentStep
                    ? "border-white/50 scale-110"
                    : "border-white/10 scale-90 opacity-40"
                }`}>
                  {i < currentStep ? (
                    <CheckCircle className="w-4 h-4 text-white" />
                  ) : i === currentStep ? (
                    <span className="text-sm" style={{ animation: "pulse 1s infinite" }}>{step.emoji}</span>
                  ) : (
                    <span className="text-xs opacity-50">{step.emoji}</span>
                  )}
                </div>
                <span className={`text-sm font-display tracking-wider transition-all duration-300 ${
                  i < currentStep
                    ? "text-[#4CAF50]"
                    : i === currentStep
                    ? "text-white"
                    : "text-white/30"
                }`}>
                  {step.text}
                </span>
                {i < currentStep && (
                  <span className="text-xs text-[#4CAF50] ms-auto">✓</span>
                )}
              </div>
            ))}
          </div>

          <div className="h-3 rounded-full bg-white/10 overflow-hidden border border-white/10">
            <div
              className="h-full rounded-full transition-all duration-100 ease-out"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, #AB47BC 0%, #FF4D9D 33%, #4CAF50 66%, #FFD54F 100%)`,
              }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-[10px] font-display text-white/30 tracking-wider">
              {progress < 100 ? steps[currentStep].text : t.connecting.complete}
            </span>
            <span className="text-[10px] font-display text-[#FF4D9D] tracking-wider">{Math.min(Math.round(progress), 100)}%</span>
          </div>
        </div>

        {showSuccess && (
          <div className="meme-card bg-[#4CAF50]/10 rounded-2xl p-4 w-full mb-4 border-[#4CAF50]/30" style={{ animation: "fadeInUp 0.5s ease-out" }}>
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-[#4CAF50] shrink-0" />
              <div className="text-start">
                <div className="text-xs font-display text-[#4CAF50] tracking-wider">{t.connecting.walletConnected}</div>
                <div className="text-sm font-mono text-white/60">{displayAddress}</div>
              </div>
              <Zap className="w-5 h-5 text-[#FFD54F] shrink-0 ms-auto" />
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 text-white/20 text-xs font-bold">
          <Shield className="w-3 h-3" />
          <span>{encryptedText}</span>
        </div>
      </div>
    </div>
  );
}
