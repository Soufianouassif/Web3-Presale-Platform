import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Send, MessageCircle, ChevronDown } from "lucide-react";

declare global {
  interface Window {
    Tawk_API?: {
      maximize: () => void;
      minimize: () => void;
      hideWidget: () => void;
      showWidget: () => void;
      toggle: () => void;
      onLoad?: () => void;
    };
  }
}

function openTawkSupport() {
  try {
    if (window.Tawk_API) {
      window.Tawk_API.showWidget();
      window.Tawk_API.maximize();
    } else {
      window.open("https://t.me/pepewifecoin", "_blank");
    }
  } catch {
    window.open("https://t.me/pepewifecoin", "_blank");
  }
}

type Lang = "en" | "ar" | "fr";
type TopicKey =
  | "what" | "presale" | "price" | "buy" | "tokenomics"
  | "roadmap" | "safe" | "staking" | "airdrop" | "referral"
  | "wallet" | "tap" | "whitepaper" | "social" | "human";

interface Suggestion {
  key: TopicKey;
  label: Record<Lang, string>;
  query: string;
}

interface Message {
  id: number;
  from: "bot" | "user";
  text: string;
  actions?: { label: string; href?: string; onClick?: () => void }[];
  suggestions?: TopicKey[];
}

const TELEGRAM_URL = "https://t.me/pepewifecoin";
const TWITTER_URL  = "https://x.com/pepewifecoin";

const SUGGESTIONS: Record<TopicKey, Suggestion> = {
  what:       { key: "what",       label: { en: "🐸 What is $PWIFE?", ar: "🐸 ما هو $PWIFE؟", fr: "🐸 C'est quoi $PWIFE?" }, query: "what is pwife" },
  presale:    { key: "presale",    label: { en: "🛒 Presale Stages", ar: "🛒 مراحل البيع", fr: "🛒 Étapes prévente" }, query: "presale" },
  price:      { key: "price",      label: { en: "💰 Price & ROI", ar: "💰 السعر والعائد", fr: "💰 Prix & ROI" }, query: "price" },
  buy:        { key: "buy",        label: { en: "🛍️ How to Buy", ar: "🛍️ كيف أشتري؟", fr: "🛍️ Comment acheter?" }, query: "how to buy" },
  tokenomics: { key: "tokenomics", label: { en: "📊 Tokenomics", ar: "📊 التوكنوميكس", fr: "📊 Tokenomics" }, query: "tokenomics" },
  roadmap:    { key: "roadmap",    label: { en: "🗺️ Roadmap", ar: "🗺️ الروادماب", fr: "🗺️ Roadmap" }, query: "roadmap" },
  safe:       { key: "safe",       label: { en: "🔒 Is it Safe?", ar: "🔒 هل هو آمن؟", fr: "🔒 Est-il sûr?" }, query: "safe" },
  staking:    { key: "staking",    label: { en: "⚡ Staking", ar: "⚡ الستاكينج", fr: "⚡ Staking" }, query: "staking" },
  airdrop:    { key: "airdrop",    label: { en: "🪂 Airdrop", ar: "🪂 الإيردروب", fr: "🪂 Airdrop" }, query: "airdrop" },
  referral:   { key: "referral",   label: { en: "🤝 Referral", ar: "🤝 الإحالة", fr: "🤝 Parrainage" }, query: "referral" },
  wallet:     { key: "wallet",     label: { en: "👛 Wallets", ar: "👛 المحافظ", fr: "👛 Wallets" }, query: "wallet" },
  tap:        { key: "tap",        label: { en: "📱 Tap-to-Earn", ar: "📱 Tap-to-Earn", fr: "📱 Tap-to-Earn" }, query: "tap to earn" },
  whitepaper: { key: "whitepaper", label: { en: "📄 Whitepaper", ar: "📄 الوايت بيبر", fr: "📄 Whitepaper" }, query: "whitepaper" },
  social:     { key: "social",     label: { en: "🌐 Community", ar: "🌐 المجتمع", fr: "🌐 Communauté" }, query: "telegram" },
  human:      { key: "human",      label: { en: "👤 Live Support", ar: "👤 دعم مباشر", fr: "👤 Support live" }, query: "human" },
};

const WELCOME_SUGGESTIONS: TopicKey[] = ["presale", "price", "buy", "safe", "tokenomics"];

const UI = {
  en: {
    title: "PWIFE Assistant 🐸",
    online: "Online • Ask me anything",
    placeholder: "Type your question...",
    welcome: "Hey fren! 👋 I'm the PEPEWIFE assistant.\n\nAsk me anything about $PWIFE, or pick a topic below 👇",
    noMatch: "Hmm, I'm not sure about that one 🤔\nHere's what I can help you with:",
    supportBtn: "💬 Live Support",
    twitterBtn: "🐦 Twitter / X",
    humanPrompt: "Want to talk to a real person? Our team is ready to help you right now! 🙌",
    humanBtn: "💬 Start Live Chat",
  },
  ar: {
    title: "مساعد $PWIFE 🐸",
    online: "متصل • اسألني أي شيء",
    placeholder: "اكتب سؤالك...",
    welcome: "مرحباً! 👋 أنا مساعد PEPEWIFE.\n\nاسألني عن أي شيء أو اختر موضوعاً 👇",
    noMatch: "عذراً، لم أفهم سؤالك 🤔\nإليك ما يمكنني مساعدتك به:",
    supportBtn: "💬 دعم مباشر",
    twitterBtn: "🐦 تويتر / X",
    humanPrompt: "تريد التحدث مع شخص حقيقي؟ فريقنا جاهز الآن للمساعدة! 🙌",
    humanBtn: "💬 بدء محادثة مباشرة",
  },
  fr: {
    title: "Assistant $PWIFE 🐸",
    online: "En ligne • Posez-moi tout",
    placeholder: "Tapez votre question...",
    welcome: "Salut! 👋 Je suis l'assistant PEPEWIFE.\n\nDemandez-moi n'importe quoi ou choisissez un sujet 👇",
    noMatch: "Hmm, je ne suis pas sûr de ça 🤔\nVoici ce dont je peux vous aider:",
    supportBtn: "💬 Support live",
    twitterBtn: "🐦 Twitter / X",
    humanPrompt: "Vous voulez parler à une vraie personne? Notre équipe est prête maintenant! 🙌",
    humanBtn: "💬 Démarrer le chat live",
  },
};

type QA = {
  key: TopicKey;
  patterns: string[];
  answer: (l: Lang) => string;
  actions?: (l: Lang) => Message["actions"];
  suggestions: TopicKey[];
};

const QA_DB: QA[] = [
  {
    key: "what",
    patterns: ["what is pepewife","what is pwife","what is $pwife","ما هو","ما هي","c'est quoi","qu'est-ce","pepewife","pwife"],
    answer: l => ({
      en: "🐸 **PEPEWIFE ($PWIFE)** is a community-driven meme token on Solana — combining fun culture with real Web3 utility:\n\n• Tap-to-Earn App\n• Staking rewards\n• 4-stage structured presale\n• 100 Trillion total supply\n• Liquidity locked, mint revoked ✅",
      ar: "🐸 **PEPEWIFE ($PWIFE)** هو توكن ميم مجتمعي على Solana — يجمع بين الثقافة والمتعة وأدوات Web3 الحقيقية:\n\n• تطبيق Tap-to-Earn\n• مكافآت الستاكينج\n• بيع مسبق من 4 مراحل\n• إجمالي العرض 100 تريليون\n• السيولة مقفلة، صلاحية الإصدار ملغاة ✅",
      fr: "🐸 **PEPEWIFE ($PWIFE)** est un token mème communautaire sur Solana — combinant culture fun et utilité Web3 réelle:\n\n• Application Tap-to-Earn\n• Récompenses staking\n• Prévente structurée en 4 étapes\n• 100 000 milliards de tokens\n• Liquidité verrouillée, frappe révoquée ✅",
    }[l]),
    suggestions: ["presale", "price", "buy", "tokenomics", "safe"],
  },
  {
    key: "presale",
    patterns: ["presale","pre sale","pre-sale","بيع مسبق","prévente","prevente","stage","étape"],
    answer: l => ({
      en: "🛒 **Presale — 4 Stages:**\n\n• Stage 1 → $0.00000001\n• Stage 2 → $0.00000002\n• Stage 3 → $0.00000003\n• Stage 4 → $0.00000004\n\n🎯 Listing Price: **$0.061327**\n\nPrice increases every stage — early buyers get the best deal! 💎",
      ar: "🛒 **البيع المسبق — 4 مراحل:**\n\n• المرحلة 1 ← 0.00000001$\n• المرحلة 2 ← 0.00000002$\n• المرحلة 3 ← 0.00000003$\n• المرحلة 4 ← 0.00000004$\n\n🎯 سعر الإدراج: **0.061327$**\n\nالسعر يرتفع كل مرحلة — الدخول المبكر = أفضل سعر! 💎",
      fr: "🛒 **Prévente — 4 Étapes:**\n\n• Étape 1 → 0,00000001$\n• Étape 2 → 0,00000002$\n• Étape 3 → 0,00000003$\n• Étape 4 → 0,00000004$\n\n🎯 Prix de listing: **0,061327$**\n\nLe prix monte à chaque étape — entrer tôt = meilleur prix! 💎",
    }[l]),
    suggestions: ["price", "buy", "safe", "tokenomics"],
  },
  {
    key: "price",
    patterns: ["price","prix","سعر","كم سعر","how much","combien","listing","إدراج","ادراج"],
    answer: l => ({
      en: "💰 **$PWIFE Price:**\n\n• Presale Stage 1: $0.00000001\n• Listing Target: $0.061327\n\nPotential ROI from Stage 1:\n🔥 5x → $0.00000005\n🔥 100x → $0.000001\n🚀 Listing → **6,132,700x**\n\nEarly ape = maximum gains!",
      ar: "💰 **سعر $PWIFE:**\n\n• البيع المسبق المرحلة 1: 0.00000001$\n• هدف الإدراج: 0.061327$\n\nعائد محتمل من المرحلة الأولى:\n🔥 5x ← 0.00000005$\n🔥 100x ← 0.000001$\n🚀 الإدراج ← **6,132,700 مرة**\n\nالدخول المبكر = أقصى أرباح!",
      fr: "💰 **Prix $PWIFE:**\n\n• Prévente Étape 1: 0,00000001$\n• Objectif listing: 0,061327$\n\nROI potentiel depuis l'étape 1:\n🔥 5x → 0,00000005$\n🔥 100x → 0,000001$\n🚀 Listing → **6 132 700x**\n\nEntrer tôt = gains maximum!",
    }[l]),
    suggestions: ["buy", "presale", "safe", "airdrop"],
  },
  {
    key: "buy",
    patterns: ["how to buy","how buy","كيف اشتري","كيف الشراء","comment acheter","acheter","buy","شراء","اشتري"],
    answer: l => ({
      en: "🛍️ **How to Buy $PWIFE:**\n\n1️⃣ Install **Phantom** or Solflare wallet\n2️⃣ Add **SOL** or USDT\n3️⃣ Visit **pwifecoin.fun**\n4️⃣ Connect your wallet\n5️⃣ Enter amount → **APE IN** 🐸\n6️⃣ Confirm transaction\n\nTokens are claimable after presale ends! 🎉",
      ar: "🛍️ **كيفية شراء $PWIFE:**\n\n1️⃣ ثبّت محفظة **Phantom** أو Solflare\n2️⃣ أضف **SOL** أو USDT\n3️⃣ زر موقع **pwifecoin.fun**\n4️⃣ اربط محفظتك\n5️⃣ أدخل المبلغ ← **APE IN** 🐸\n6️⃣ اقبل المعاملة\n\nيمكن استلام التوكنز بعد انتهاء البيع المسبق! 🎉",
      fr: "🛍️ **Comment Acheter $PWIFE:**\n\n1️⃣ Installez **Phantom** ou Solflare\n2️⃣ Ajoutez **SOL** ou USDT\n3️⃣ Visitez **pwifecoin.fun**\n4️⃣ Connectez votre wallet\n5️⃣ Entrez montant → **APE IN** 🐸\n6️⃣ Confirmez la transaction\n\nTokens réclamables après la fin de la prévente! 🎉",
    }[l]),
    suggestions: ["wallet", "presale", "price", "safe"],
  },
  {
    key: "tokenomics",
    patterns: ["tokenomics","توكنوميكس","supply","عرض","distribution","توزيع","total supply","إجمالي"],
    answer: l => ({
      en: "📊 **$PWIFE Tokenomics:**\n\nTotal: **100 Trillion** tokens\n\n• 🛒 Presale: 40% (40T)\n• 💧 Liquidity: 25% (25T)\n• 🪂 Airdrop & Rewards: 15% (15T)\n• 🌱 Ecosystem: 10% (10T)\n• 👥 Team (vested 12m): 10% (10T)\n\n✅ Mint revoked | ✅ Liquidity locked 12 months",
      ar: "📊 **توكنوميكس $PWIFE:**\n\nالإجمالي: **100 تريليون** توكن\n\n• 🛒 البيع المسبق: 40% (40T)\n• 💧 السيولة: 25% (25T)\n• 🪂 الإيردروب والمكافآت: 15% (15T)\n• 🌱 النظام البيئي: 10% (10T)\n• 👥 الفريق (مقيد 12 شهراً): 10% (10T)\n\n✅ صلاحية الإصدار ملغاة | ✅ السيولة مقفلة 12 شهراً",
      fr: "📊 **Tokenomics $PWIFE:**\n\nTotal: **100 Billions** de tokens\n\n• 🛒 Prévente: 40% (40B)\n• 💧 Liquidité: 25% (25B)\n• 🪂 Airdrop & Récompenses: 15% (15B)\n• 🌱 Écosystème: 10% (10B)\n• 👥 Équipe (bloqué 12m): 10% (10B)\n\n✅ Frappe révoquée | ✅ Liquidité verrouillée 12 mois",
    }[l]),
    suggestions: ["safe", "presale", "airdrop", "staking"],
  },
  {
    key: "roadmap",
    patterns: ["roadmap","خارطة","خطة","plan","road map","روادماب","phase","فيز","مرحلة"],
    answer: l => ({
      en: "🗺️ **$PWIFE Roadmap:**\n\n🔹 **Phase 1** (Q2 2026)\nWebsite · Community · Whitepaper · Presale\n\n🔹 **Phase 2** (Q2-Q3 2026)\nMarketing · Airdrop · Staking · Tap-to-Earn beta\n\n🔹 **Phase 3** (Q3 2026)\nSolana token launch · DEX liquidity · Trading\n\n🔹 **Phase 4** (Q4 2026)\nCEX listings · Influencer collabs · Global push\n\n🔹 **Phase 5** (2027+)\nExpanded ecosystem · Full Tap-to-Earn · DAO",
      ar: "🗺️ **روادماب $PWIFE:**\n\n🔹 **المرحلة 1** (Q2 2026)\nالموقع · المجتمع · الوايت بيبر · البيع المسبق\n\n🔹 **المرحلة 2** (Q2-Q3 2026)\nتسويق · إيردروب · ستاكينج · بيتا Tap-to-Earn\n\n🔹 **المرحلة 3** (Q3 2026)\nإطلاق التوكن على Solana · سيولة DEX · التداول\n\n🔹 **المرحلة 4** (Q4 2026)\nإدراج CEX · مؤثرون · انتشار عالمي\n\n🔹 **المرحلة 5** (2027+)\nنظام بيئي موسع · Tap-to-Earn كامل · DAO",
      fr: "🗺️ **Roadmap $PWIFE:**\n\n🔹 **Phase 1** (Q2 2026)\nSite · Communauté · Whitepaper · Prévente\n\n🔹 **Phase 2** (Q2-Q3 2026)\nMarketing · Airdrop · Staking · Tap-to-Earn bêta\n\n🔹 **Phase 3** (Q3 2026)\nLancement token Solana · Liquidité DEX · Trading\n\n🔹 **Phase 4** (Q4 2026)\nListings CEX · Influenceurs · Expansion mondiale\n\n🔹 **Phase 5** (2027+)\nÉcosystème étendu · Tap-to-Earn complet · DAO",
    }[l]),
    suggestions: ["presale", "staking", "tap", "social"],
  },
  {
    key: "safe",
    patterns: ["safe","secure","rug","scam","legit","أمان","مأمون","شرعي","موثوق","sécurisé","sûr","fiable","liquidity lock","mint","revoked"],
    answer: l => ({
      en: "🔒 **Is $PWIFE Safe? Yes! Here's why:**\n\n✅ Liquidity locked 12 months — no rug pull\n✅ Mint authority revoked — no new tokens ever\n✅ Freeze authority disabled — tokens can't be frozen\n✅ Team tokens vested 12 months — no early dump\n✅ Solana smart contract — fully on-chain & verifiable\n\nTransparency proofs published at launch!",
      ar: "🔒 **هل $PWIFE آمن؟ نعم! إليك السبب:**\n\n✅ السيولة مقفلة 12 شهراً — لا يمكن السحب\n✅ صلاحية الإصدار ملغاة — لا توكنات جديدة أبداً\n✅ صلاحية التجميد معطلة — لا يمكن تجميد توكناتك\n✅ توكنات الفريق مقيدة 12 شهراً — لا بيع مبكر\n✅ عقد ذكي على Solana — شفاف وقابل للتحقق\n\nإثباتات الشفافية تُنشر عند الإطلاق!",
      fr: "🔒 **$PWIFE est-il sûr? Oui! Voici pourquoi:**\n\n✅ Liquidité verrouillée 12 mois — pas de rug pull\n✅ Autorité de frappe révoquée — jamais de nouveaux tokens\n✅ Autorité de gel désactivée — tokens non gelables\n✅ Tokens équipe bloqués 12 mois — pas de dump précoce\n✅ Contrat Solana — transparent et vérifiable\n\nPreuves de transparence publiées au lancement!",
    }[l]),
    suggestions: ["tokenomics", "whitepaper", "presale", "human"],
  },
  {
    key: "staking",
    patterns: ["staking","ستاكينج","stake","rewards","مكافآت","récompenses","apy","yield"],
    answer: l => ({
      en: "⚡ **$PWIFE Staking — Coming Phase 2!**\n\nThe staking system launches Q2-Q3 2026:\n\n• Reward long-term holders 💰\n• Reduce circulating supply\n• Structured APY program\n• Automatic reward distribution\n\nFollow us to be first for APY announcements! 🔔",
      ar: "⚡ **ستاكينج $PWIFE — قريباً المرحلة 2!**\n\nnظام الستاكينج يُطلق Q2-Q3 2026:\n\n• مكافأة الحاملين على المدى الطويل 💰\n• تقليل العرض المتداول\n• برنامج APY منظم\n• توزيع مكافآت تلقائي\n\nتابعنا لتكون أول من يعرف عن APY! 🔔",
      fr: "⚡ **Staking $PWIFE — Bientôt Phase 2!**\n\nLe système de staking lance Q2-Q3 2026:\n\n• Récompenser les détenteurs long terme 💰\n• Réduire l'offre en circulation\n• Programme APY structuré\n• Distribution automatique des récompenses\n\nSuivez-nous pour être premier pour les annonces APY! 🔔",
    }[l]),
    suggestions: ["airdrop", "tokenomics", "roadmap", "social"],
  },
  {
    key: "airdrop",
    patterns: ["airdrop","إيردروب","drop","free tokens","توكنات مجانية","tokens gratuits","claim","كليم","استلام"],
    answer: l => ({
      en: "🪂 **$PWIFE Airdrop — 15 Trillion allocated!**\n\n**How to qualify:**\n✅ Follow @pepewifecoin on Twitter\n✅ Join the Telegram community\n✅ Buy tokens during presale\n✅ Refer friends with your link\n\nThe more tasks = the bigger your multiplier!\n\nCheck Dashboard → Airdrop tab for your score 🎯",
      ar: "🪂 **إيردروب $PWIFE — 15 تريليون مخصص!**\n\n**كيف تتأهل:**\n✅ اتبع @pepewifecoin على تويتر\n✅ انضم لمجتمع تيليغرام\n✅ اشتر في البيع المسبق\n✅ أحل أصدقاء برابطك الخاص\n\nكلما أكملت مهام أكثر = مضاعف أكبر!\n\nراجع الداشبورد ← تبويب الإيردروب لنقاطك 🎯",
      fr: "🪂 **Airdrop $PWIFE — 15 Billions alloués!**\n\n**Comment se qualifier:**\n✅ Suivez @pepewifecoin sur Twitter\n✅ Rejoignez la communauté Telegram\n✅ Achetez lors de la prévente\n✅ Parrainez des amis avec votre lien\n\nPlus de tâches = multiplicateur plus grand!\n\nVérifiez Dashboard → onglet Airdrop pour votre score 🎯",
    }[l]),
    suggestions: ["referral", "staking", "tokenomics", "social"],
  },
  {
    key: "referral",
    patterns: ["referral","refer","إحالة","أحل","parrainage","parrainer","bonus","code","كود"],
    answer: l => ({
      en: "🤝 **Referral Program — Earn Free Tokens!**\n\n1. Connect your wallet\n2. Dashboard → Referrals tab\n3. Copy your unique link\n4. Share with friends\n5. Earn $PWIFE when they buy!\n\nNo limit on referrals — the more you refer, the more you earn! 💰",
      ar: "🤝 **برنامج الإحالة — اكسب توكنات مجاناً!**\n\n1. اربط محفظتك\n2. الداشبورد ← تبويب الإحالات\n3. انسخ رابطك الفريد\n4. شاركه مع أصدقائك\n5. اكسب $PWIFE عند شرائهم!\n\nلا حد للإحالات — كلما أحلت أكثر كسبت أكثر! 💰",
      fr: "🤝 **Programme de Parrainage — Gagnez des tokens!**\n\n1. Connectez votre wallet\n2. Dashboard → onglet Référencement\n3. Copiez votre lien unique\n4. Partagez avec vos amis\n5. Gagnez $PWIFE quand ils achètent!\n\nPas de limite — plus vous parrainez, plus vous gagnez! 💰",
    }[l]),
    suggestions: ["airdrop", "buy", "social", "human"],
  },
  {
    key: "wallet",
    patterns: ["wallet","محفظة","phantom","solflare","connect","ربط","connexion","solana"],
    answer: l => ({
      en: "👛 **Supported Wallets:**\n\n✅ Phantom ← recommended\n✅ Solflare\n✅ Backpack\n✅ OKX Wallet\n\n**Setup in 2 minutes:**\n1. Install Phantom from phantom.app\n2. Create or import wallet\n3. Add SOL for gas fees (~0.01 SOL)\n4. Click Connect Wallet on the site",
      ar: "👛 **المحافظ المدعومة:**\n\n✅ Phantom ← موصى به\n✅ Solflare\n✅ Backpack\n✅ OKX Wallet\n\n**إعداد في دقيقتين:**\n1. ثبّت Phantom من phantom.app\n2. أنشئ أو استورد محفظة\n3. أضف SOL لرسوم الغاز (~0.01 SOL)\n4. اضغط Connect Wallet في الموقع",
      fr: "👛 **Wallets Supportés:**\n\n✅ Phantom ← recommandé\n✅ Solflare\n✅ Backpack\n✅ OKX Wallet\n\n**Configuration en 2 minutes:**\n1. Installez Phantom depuis phantom.app\n2. Créez ou importez un wallet\n3. Ajoutez SOL pour les frais (~0,01 SOL)\n4. Cliquez Connect Wallet sur le site",
    }[l]),
    suggestions: ["buy", "presale", "safe", "human"],
  },
  {
    key: "tap",
    patterns: ["tap to earn","tap-to-earn","تطبيق","application","app","earn","tap"],
    answer: l => ({
      en: "📱 **Tap-to-Earn App — Coming Phase 2!**\n\nPEPEWIFE is building a mobile app where you earn $PWIFE by:\n\n• Tapping daily\n• Completing missions\n• Participating in events\n• Holding & staking tokens\n\nBeta launches Q2-Q3 2026 — join Telegram for early access! 🎮",
      ar: "📱 **تطبيق Tap-to-Earn — قريباً المرحلة 2!**\n\nPEPEWIFE تبني تطبيقاً موبايل حيث تكسب $PWIFE بـ:\n\n• النقر اليومي\n• إتمام المهام\n• المشاركة في الأحداث\n• الاحتفاظ والستاكينج\n\nالبيتا تُطلق Q2-Q3 2026 — انضم لتيليغرام للوصول المبكر! 🎮",
      fr: "📱 **Application Tap-to-Earn — Bientôt Phase 2!**\n\nPEPEWIFE développe une app mobile où vous gagnez $PWIFE en:\n\n• Tapotant quotidiennement\n• Complétant des missions\n• Participant aux événements\n• Détenant et stakant des tokens\n\nBêta lance Q2-Q3 2026 — rejoignez Telegram pour l'accès anticipé! 🎮",
    }[l]),
    suggestions: ["staking", "airdrop", "roadmap", "social"],
  },
  {
    key: "whitepaper",
    patterns: ["whitepaper","white paper","وايت بيبر","وثيقة","documentation","docs"],
    answer: l => ({
      en: "📄 **PEPEWIFE Whitepaper:**\nThe full whitepaper covers everything — vision, tokenomics, roadmap, security model, and utility. Read it to understand the full picture!",
      ar: "📄 **وايت بيبر PEPEWIFE:**\nالوايت بيبر الكامل يغطي كل شيء — الرؤية، التوكنوميكس، الروادماب، نموذج الأمان والأدوات. اقرأه لتفهم الصورة الكاملة!",
      fr: "📄 **Whitepaper PEPEWIFE:**\nLe whitepaper complet couvre tout — vision, tokenomics, roadmap, modèle de sécurité et utilité. Lisez-le pour comprendre la vue d'ensemble!",
    }[l]),
    actions: l => [{ label: l === "ar" ? "📄 اقرأ الوايت بيبر" : l === "fr" ? "📄 Lire le Whitepaper" : "📄 Read Whitepaper", href: "/whitepaper" }],
    suggestions: ["tokenomics", "roadmap", "safe", "human"],
  },
  {
    key: "social",
    patterns: ["social","telegram","twitter","community","مجتمع","communauté","تيليغرام","تويتر","discord"],
    answer: l => ({
      en: "🌐 **Join the $PWIFE Community!**\nThousands of frens worldwide — be part of the movement! 🐸",
      ar: "🌐 **انضم لمجتمع $PWIFE!**\nآلاف الأصدقاء حول العالم — كن جزءاً من الحركة! 🐸",
      fr: "🌐 **Rejoignez la Communauté $PWIFE!**\nDes milliers de frens dans le monde — faites partie du mouvement! 🐸",
    }[l]),
    actions: () => [
      { label: "✈️ Telegram", href: TELEGRAM_URL },
      { label: "🐦 Twitter / X", href: TWITTER_URL },
    ],
    suggestions: ["airdrop", "referral", "tap", "human"],
  },
  {
    key: "human",
    patterns: ["human","real person","support","help","مساعدة","دعم","personne réelle","aide","staff","team","فريق","live chat","live support"],
    answer: l => UI[l].humanPrompt,
    actions: l => [{ label: UI[l].humanBtn, onClick: openTawkSupport }],
    suggestions: ["presale", "price", "buy", "safe"],
  },
];

function detectLang(text: string): Lang {
  const ar = /[\u0600-\u06FF]/;
  const fr = /\b(bonjour|comment|qu[' ]est|je|le |la |les |un |une |des |est|sont|avoir|faire|merci|oui|non|acheter|prévente|roadmap|pourquoi|quel|quoi|avec|pour|sur)\b/i;
  if (ar.test(text)) return "ar";
  if (fr.test(text)) return "fr";
  return "en";
}

function findAnswer(input: string, lang: Lang): { answer: string; actions?: Message["actions"]; suggestions: TopicKey[] } | null {
  const q = input.toLowerCase();
  for (const qa of QA_DB) {
    if (qa.patterns.some(p => q.includes(p.toLowerCase()))) {
      return {
        answer: qa.answer(lang),
        actions: qa.actions?.(lang),
        suggestions: qa.suggestions,
      };
    }
  }
  return null;
}

let msgId = 0;
const newMsg = (from: Message["from"], text: string, actions?: Message["actions"], suggestions?: TopicKey[]): Message => ({
  id: ++msgId, from, text, actions, suggestions,
});

export default function Chatbot() {
  const [open, setOpen]         = useState(false);
  const [minimized, setMin]     = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]       = useState("");
  const [typing, setTyping]     = useState(false);
  const [lang, setLang]         = useState<Lang>("en");
  const [unread, setUnread]     = useState(0);
  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([newMsg("bot", UI[lang].welcome, undefined, WELCOME_SUGGESTIONS)]);
    }
  }, [open]);

  useEffect(() => {
    if (open && !minimized) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnread(0);
    }
  }, [messages, open, minimized]);

  const sendText = useCallback((text: string, autoLang?: Lang) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const detectedLang = autoLang ?? detectLang(trimmed);
    if (detectedLang !== lang) setLang(detectedLang);

    const userMsg = newMsg("user", trimmed);
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);

    setTimeout(() => {
      const result = findAnswer(trimmed, detectedLang);
      const botMsg = result
        ? newMsg("bot", result.answer, result.actions, result.suggestions)
        : newMsg("bot", UI[detectedLang].noMatch, [
            { label: UI[detectedLang].supportBtn, onClick: openTawkSupport },
            { label: UI[detectedLang].twitterBtn, href: TWITTER_URL },
          ], WELCOME_SUGGESTIONS);
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
      if (minimized) setUnread(n => n + 1);
    }, 600 + Math.random() * 400);
  }, [lang, minimized]);

  const handleSend = () => {
    const detectedLang = detectLang(input);
    sendText(input, detectedLang);
  };

  const handleSuggestion = (key: TopicKey) => {
    const sug = SUGGESTIONS[key];
    sendText(sug.query, lang);
  };

  const isRTL = lang === "ar";

  return (
    <>
      {!open && (
        <button
          onClick={() => { setOpen(true); setUnread(0); }}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full border-4 border-[#1a1a2e] shadow-[4px_4px_0px_#1a1a2e] flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
          style={{ background: "linear-gradient(135deg, #FF4D9D, #FFD54F)" }}
          aria-label="Open chat"
        >
          <MessageCircle className="h-6 w-6 text-[#1a1a2e]" />
          {unread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-[#4CAF50] border-2 border-white text-[10px] font-bold text-white flex items-center justify-center">
              {unread}
            </span>
          )}
        </button>
      )}

      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border-4 border-[#1a1a2e] shadow-[6px_6px_0px_#1a1a2e] overflow-hidden"
          style={{ width: "min(370px, calc(100vw - 24px))", maxHeight: "min(560px, calc(100vh - 80px))" }}
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-4 border-[#1a1a2e] shrink-0" style={{ background: "linear-gradient(90deg, #FF4D9D, #FFD54F)" }}>
            <div className="flex items-center gap-2">
              <img src="/logo.webp" alt="PWIFE" className="w-8 h-8 rounded-full border-2 border-[#1a1a2e]" />
              <div>
                <div className="font-display text-sm font-bold text-[#1a1a2e] tracking-wide leading-none">{UI[lang].title}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#2E7D32] animate-pulse" />
                  <span className="text-[10px] font-bold text-[#1a1a2e]/70">{UI[lang].online}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setMin(v => !v)}
                className="w-7 h-7 rounded-lg border-2 border-[#1a1a2e] bg-white/30 hover:bg-white/50 flex items-center justify-center transition-colors"
              >
                <ChevronDown className={`h-4 w-4 text-[#1a1a2e] transition-transform ${minimized ? "rotate-180" : ""}`} />
              </button>
              <button
                onClick={() => { setOpen(false); setMessages([]); msgId = 0; setLang("en"); }}
                className="w-7 h-7 rounded-lg border-2 border-[#1a1a2e] bg-white/30 hover:bg-white/50 flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-[#1a1a2e]" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3 min-h-0" style={{ background: "#FFFDE7" }}>
                {messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col gap-1.5 ${msg.from === "user" ? (isRTL ? "items-start" : "items-end") : (isRTL ? "items-end" : "items-start")}`}>
                    {/* Bubble */}
                    <div
                      className={`max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed border-2 border-[#1a1a2e] whitespace-pre-line ${
                        msg.from === "user"
                          ? "bg-[#FF4D9D] text-white font-bold shadow-[2px_2px_0px_#1a1a2e]"
                          : "bg-white text-[#1a1a2e] font-semibold shadow-[2px_2px_0px_#1a1a2e]"
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Action buttons */}
                    {msg.actions && msg.actions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 max-w-[88%]">
                        {msg.actions.map((a, i) =>
                          a.href ? (
                            <a key={i} href={a.href} target="_blank" rel="noreferrer"
                              className="text-xs font-display tracking-wide px-3 py-1.5 rounded-xl border-2 border-[#1a1a2e] bg-[#4CAF50] text-white shadow-[2px_2px_0px_#1a1a2e] hover:bg-[#2E7D32] transition-colors whitespace-nowrap">
                              {a.label}
                            </a>
                          ) : (
                            <button key={i} onClick={a.onClick}
                              className="text-xs font-display tracking-wide px-3 py-1.5 rounded-xl border-2 border-[#1a1a2e] bg-[#4CAF50] text-white shadow-[2px_2px_0px_#1a1a2e] hover:bg-[#2E7D32] transition-colors whitespace-nowrap">
                              {a.label}
                            </button>
                          )
                        )}
                      </div>
                    )}

                    {/* Smart suggestions — only on bot messages */}
                    {msg.from === "bot" && msg.suggestions && msg.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 max-w-[95%]">
                        {msg.suggestions.map(key => (
                          <button
                            key={key}
                            onClick={() => handleSuggestion(key)}
                            disabled={typing}
                            className="text-[11px] font-bold px-2.5 py-1.5 rounded-xl border-2 border-[#1a1a2e]/25 bg-white hover:bg-[#FFF9C4] hover:border-[#FF4D9D] text-[#1a1a2e] transition-all whitespace-nowrap shadow-sm disabled:opacity-40"
                          >
                            {SUGGESTIONS[key].label[lang]}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {typing && (
                  <div className={`flex ${isRTL ? "justify-end" : "justify-start"}`}>
                    <div className="bg-white border-2 border-[#1a1a2e] rounded-2xl px-4 py-3 shadow-[2px_2px_0px_#1a1a2e] flex items-center gap-1.5">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-2 h-2 rounded-full bg-[#FF4D9D] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 px-3 py-3 border-t-4 border-[#1a1a2e] shrink-0" style={{ background: "#FFF9C4" }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !typing && handleSend()}
                  placeholder={UI[lang].placeholder}
                  className="flex-1 h-10 rounded-xl border-2 border-[#1a1a2e] bg-white px-3 text-sm text-[#1a1a2e] font-bold placeholder:text-[#1a1a2e]/30 focus:outline-none focus:border-[#FF4D9D] transition-colors"
                  dir={isRTL ? "rtl" : "ltr"}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || typing}
                  className="w-10 h-10 rounded-xl border-2 border-[#1a1a2e] flex items-center justify-center shadow-[2px_2px_0px_#1a1a2e] transition-all disabled:opacity-40 hover:scale-105 active:scale-95"
                  style={{ background: "linear-gradient(135deg, #FF4D9D, #FFD54F)" }}
                >
                  <Send className={`h-4 w-4 text-[#1a1a2e] ${isRTL ? "rotate-180" : ""}`} />
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
