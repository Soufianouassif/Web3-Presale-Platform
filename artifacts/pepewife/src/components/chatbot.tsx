import React, { useState, useRef, useEffect } from "react";
import { X, Send, MessageCircle, ChevronDown } from "lucide-react";

declare global {
  interface Window {
    Tawk_API?: {
      maximize: () => void;
      minimize: () => void;
      hideWidget: () => void;
      showWidget: () => void;
      onLoad?: () => void;
    };
  }
}

function openTawkSupport() {
  if (window.Tawk_API?.maximize) {
    window.Tawk_API.maximize();
  } else {
    window.open("https://t.me/pepewifecoin", "_blank");
  }
}

type Lang = "en" | "ar" | "fr";

interface Message {
  id: number;
  from: "bot" | "user";
  text: string;
  actions?: { label: string; href?: string; onClick?: () => void }[];
}

const TELEGRAM_URL = "https://t.me/pepewifecoin";
const TWITTER_URL  = "https://x.com/pepewifecoin";

const UI = {
  en: {
    title: "PWIFE Assistant 🐸",
    subtitle: "Ask me anything about $PWIFE",
    placeholder: "Type your question...",
    typing: "Thinking...",
    welcome: "Hey fren! 👋 I'm the PEPEWIFE assistant. Ask me anything about $PWIFE — presale, tokenomics, roadmap, how to buy, and more! 🚀",
    noMatch: "Hmm, I'm not sure about that one 🤔 Try asking about the presale, price, tokenomics, or roadmap. Or connect with our team directly:",
    supportBtn: "💬 Telegram Support",
    twitterBtn: "🐦 Twitter / X",
    humanPrompt: "Want to talk to a real person? Our team is active on Telegram 24/7!",
    humanBtn: "💬 Chat with Team on Telegram",
  },
  ar: {
    title: "مساعد $PWIFE 🐸",
    subtitle: "اسألني أي شيء عن $PWIFE",
    placeholder: "اكتب سؤالك...",
    typing: "جاري التفكير...",
    welcome: "مرحباً! 👋 أنا مساعد PEPEWIFE. اسألني عن البيع المسبق، السعر، التوكنوميكس، الروادماب، كيفية الشراء وأكثر! 🚀",
    noMatch: "عذراً، لم أفهم سؤالك 🤔 جرب السؤال عن البيع المسبق، السعر، التوكنوميكس أو الروادماب. أو تواصل مع فريقنا مباشرة:",
    supportBtn: "💬 دعم تيليغرام",
    twitterBtn: "🐦 تويتر / X",
    humanPrompt: "تريد التحدث مع شخص حقيقي؟ فريقنا متاح على تيليغرام 24/7!",
    humanBtn: "💬 تحدث مع الفريق على تيليغرام",
  },
  fr: {
    title: "Assistant $PWIFE 🐸",
    subtitle: "Posez-moi tout sur $PWIFE",
    placeholder: "Tapez votre question...",
    typing: "Je réfléchis...",
    welcome: "Salut! 👋 Je suis l'assistant PEPEWIFE. Demandez-moi tout sur $PWIFE — prévente, prix, tokenomics, roadmap, comment acheter et plus! 🚀",
    noMatch: "Hmm, je ne suis pas sûr de ça 🤔 Essayez de demander sur la prévente, le prix, les tokenomics ou la roadmap. Ou contactez notre équipe:",
    supportBtn: "💬 Support Telegram",
    twitterBtn: "🐦 Twitter / X",
    humanPrompt: "Vous voulez parler à une vraie personne? Notre équipe est active sur Telegram 24h/24!",
    humanBtn: "💬 Discuter avec l'équipe sur Telegram",
  },
};

type QA = { patterns: string[]; answer: (l: Lang) => string; actions?: (l: Lang) => Message["actions"] };

const QA_DB: QA[] = [
  {
    patterns: ["what is pepewife","what is pwife","what is $pwife","ما هو","ما هي","c'est quoi","qu'est-ce","pepewife","pwife"],
    answer: l => ({
      en: "🐸 **PEPEWIFE ($PWIFE)** is a community-driven meme token on the Solana blockchain. It combines culture, fun, and real Web3 utility — including a Tap-to-Earn app, staking, and a structured presale with 4 stages. 100 Trillion total supply, liquidity locked, mint authority revoked!",
      ar: "🐸 **PEPEWIFE ($PWIFE)** هو توكن ميم مجتمعي على شبكة Solana. يجمع بين المتعة والثقافة وأدوات Web3 الحقيقية — تطبيق Tap-to-Earn، ستاكينج، وبيع مسبق من 4 مراحل. إجمالي العرض 100 تريليون، السيولة مقفلة، صلاحية إصدار التوكنز ملغاة!",
      fr: "🐸 **PEPEWIFE ($PWIFE)** est un token mème communautaire sur la blockchain Solana. Il combine culture, fun et utilité Web3 réelle — Tap-to-Earn, staking, et une prévente structurée en 4 étapes. 100 000 milliards de tokens au total, liquidité verrouillée, autorité de frappe révoquée!",
    }[l]),
  },
  {
    patterns: ["presale","pre sale","pre-sale","بيع مسبق","prévente","prevente","stage","مرحلة","étape"],
    answer: l => ({
      en: "🛒 **Presale Info:**\n• Stage 1: $0.00000001 per $PWIFE\n• Stage 2: $0.00000002\n• Stage 3: $0.00000003\n• Stage 4: $0.00000004\n• Listing Price: $0.061327\n\nThe presale runs in 4 stages — price increases each stage. Early buyers get the best deal! 💎",
      ar: "🛒 **معلومات البيع المسبق:**\n• المرحلة 1: 0.00000001$ للتوكن\n• المرحلة 2: 0.00000002$\n• المرحلة 3: 0.00000003$\n• المرحلة 4: 0.00000004$\n• سعر الإدراج: 0.061327$\n\nالبيع المسبق في 4 مراحل — السعر يرتفع كل مرحلة. المشترون الأوائل يحصلون على أفضل سعر! 💎",
      fr: "🛒 **Info Prévente:**\n• Étape 1: 0,00000001$ par $PWIFE\n• Étape 2: 0,00000002$\n• Étape 3: 0,00000003$\n• Étape 4: 0,00000004$\n• Prix de listing: 0,061327$\n\nLa prévente se déroule en 4 étapes — le prix augmente à chaque étape. Les premiers acheteurs obtiennent le meilleur prix! 💎",
    }[l]),
  },
  {
    patterns: ["price","prix","سعر","كم سعر","how much","combien","listing","إدراج","ادراج"],
    answer: l => ({
      en: "💰 **$PWIFE Price:**\n• Current Presale (Stage 1): $0.00000001\n• Listing Target: $0.061327\n\nThat's a potential **6,132,700x** from Stage 1 price to listing! 🚀 Early ape = max gains.",
      ar: "💰 **سعر $PWIFE:**\n• البيع المسبق الحالي (المرحلة 1): 0.00000001$\n• هدف الإدراج: 0.061327$\n\nهذا يعني ربحاً محتملاً يصل إلى **6,132,700 مرة** من سعر المرحلة الأولى! 🚀 الدخول المبكر = أقصى أرباح.",
      fr: "💰 **Prix $PWIFE:**\n• Prévente actuelle (Étape 1): 0,00000001$\n• Objectif de listing: 0,061327$\n\nC'est un potentiel de **6 132 700x** du prix de l'étape 1 au listing! 🚀 Entrer tôt = gains max.",
    }[l]),
  },
  {
    patterns: ["how to buy","how buy","كيف اشتري","كيف الشراء","comment acheter","acheter","buy","شراء","اشتري"],
    answer: l => ({
      en: "🛍️ **How to Buy $PWIFE:**\n1. Install Phantom or Solflare wallet\n2. Add SOL or USDT to your wallet\n3. Visit pwifecoin.fun\n4. Connect your wallet\n5. Enter amount → Click **APE IN** 🐸\n6. Confirm transaction\n\nThat's it! Tokens are claimable after presale ends.",
      ar: "🛍️ **كيفية شراء $PWIFE:**\n1. ثبّت محفظة Phantom أو Solflare\n2. أضف SOL أو USDT لمحفظتك\n3. زر موقع pwifecoin.fun\n4. اربط محفظتك\n5. أدخل المبلغ ← اضغط **APE IN** 🐸\n6. اقبل المعاملة\n\nهذا كل شيء! يمكن استلام التوكنز بعد انتهاء البيع المسبق.",
      fr: "🛍️ **Comment Acheter $PWIFE:**\n1. Installez Phantom ou Solflare\n2. Ajoutez SOL ou USDT à votre wallet\n3. Visitez pwifecoin.fun\n4. Connectez votre wallet\n5. Entrez le montant → Cliquez **APE IN** 🐸\n6. Confirmez la transaction\n\nC'est tout! Les tokens sont réclamables après la fin de la prévente.",
    }[l]),
  },
  {
    patterns: ["tokenomics","توكنوميكس","supply","عرض","distribution","توزيع","total supply","إجمالي"],
    answer: l => ({
      en: "📊 **$PWIFE Tokenomics:**\n• Total Supply: **100 Trillion** $PWIFE\n• Presale: 40% (40T)\n• Liquidity: 25% (25T)\n• Ecosystem & Treasury: 10% (10T)\n• Airdrop & Rewards: 15% (15T)\n• Team (vested 12 months): 10% (10T)\n\nMint authority revoked ✅ | Liquidity locked 12 months ✅",
      ar: "📊 **توكنوميكس $PWIFE:**\n• إجمالي العرض: **100 تريليون** $PWIFE\n• البيع المسبق: 40% (40 تريليون)\n• السيولة: 25% (25 تريليون)\n• النظام البيئي: 10% (10 تريليون)\n• الإيردروب والمكافآت: 15% (15 تريليون)\n• الفريق (مقيد 12 شهراً): 10% (10 تريليون)\n\nصلاحية الإصدار ملغاة ✅ | السيولة مقفلة 12 شهراً ✅",
      fr: "📊 **Tokenomics $PWIFE:**\n• Offre totale: **100 Billions** $PWIFE\n• Prévente: 40% (40B)\n• Liquidité: 25% (25B)\n• Écosystème: 10% (10B)\n• Airdrop & Récompenses: 15% (15B)\n• Équipe (bloqué 12 mois): 10% (10B)\n\nAutorité de frappe révoquée ✅ | Liquidité verrouillée 12 mois ✅",
    }[l]),
  },
  {
    patterns: ["roadmap","خارطة","خطة","plan","road map","روادماب","phase","فيز","مرحلة"],
    answer: l => ({
      en: "🗺️ **$PWIFE Roadmap:**\n\n🔹 **Phase 1 – Foundation (Q2 2026)**\nWebsite, community, whitepaper, presale launch\n\n🔹 **Phase 2 – Growth (Q2-Q3 2026)**\nMarketing, airdrop campaigns, staking launch, Tap-to-Earn beta\n\n🔹 **Phase 3 – Launch (Q3 2026)**\nToken deployment on Solana, DEX liquidity, trading begins\n\n🔹 **Phase 4 – Expansion (Q4 2026)**\nCEX listings, influencer collabs, global growth\n\n🔹 **Phase 5 – Vision (2027+)**\nExpanded Tap-to-Earn, enhanced staking, ecosystem tools",
      ar: "🗺️ **روادماب $PWIFE:**\n\n🔹 **المرحلة 1 – الأساس (Q2 2026)**\nالموقع، المجتمع، الوايت بيبر، إطلاق البيع المسبق\n\n🔹 **المرحلة 2 – النمو (Q2-Q3 2026)**\nتسويق، حملات إيردروب، إطلاق الستاكينج، بيتا Tap-to-Earn\n\n🔹 **المرحلة 3 – الإطلاق (Q3 2026)**\nنشر التوكن على Solana، سيولة DEX، بدء التداول\n\n🔹 **المرحلة 4 – التوسع (Q4 2026)**\nإدراج CEX، تعاون المؤثرين، نمو عالمي\n\n🔹 **المرحلة 5 – الرؤية (2027+)**\nتوسيع Tap-to-Earn، تحسين الستاكينج، أدوات النظام البيئي",
      fr: "🗺️ **Roadmap $PWIFE:**\n\n🔹 **Phase 1 – Fondation (Q2 2026)**\nSite, communauté, whitepaper, lancement prévente\n\n🔹 **Phase 2 – Croissance (Q2-Q3 2026)**\nMarketing, campagnes airdrop, lancement staking, beta Tap-to-Earn\n\n🔹 **Phase 3 – Lancement (Q3 2026)**\nDéploiement token sur Solana, liquidité DEX, début du trading\n\n🔹 **Phase 4 – Expansion (Q4 2026)**\nListings CEX, collaborations influenceurs, croissance mondiale\n\n🔹 **Phase 5 – Vision (2027+)**\nTap-to-Earn étendu, staking amélioré, outils écosystème",
    }[l]),
  },
  {
    patterns: ["safe","secure","rug","scam","legit","أمان","أمان","مأمون","شرعي","موثوق","sécurisé","sûr","fiable","liquidity lock","mint","revoked"],
    answer: l => ({
      en: "🔒 **Is $PWIFE Safe?**\n\n✅ Liquidity locked for 12 months — no rug pull possible\n✅ Mint authority permanently revoked — no new tokens can be created\n✅ Freeze authority disabled — your tokens can't be frozen\n✅ Team tokens vested over 12 months — no dump risk\n✅ Smart contract on Solana — transparent and verifiable\n\nTransparency proofs published after token launch!",
      ar: "🔒 **هل $PWIFE آمن؟**\n\n✅ السيولة مقفلة 12 شهراً — لا يمكن السحب\n✅ صلاحية الإصدار ملغاة نهائياً — لا يمكن إنشاء توكنات جديدة\n✅ صلاحية التجميد معطلة — لا يمكن تجميد توكناتك\n✅ توكنات الفريق مقيدة 12 شهراً — لا خطر بيع مبكر\n✅ العقد الذكي على Solana — شفاف وقابل للتحقق\n\nإثباتات الشفافية تُنشر بعد إطلاق التوكن!",
      fr: "🔒 **$PWIFE est-il sûr?**\n\n✅ Liquidité verrouillée 12 mois — pas de rug pull possible\n✅ Autorité de frappe révoquée — impossible de créer de nouveaux tokens\n✅ Autorité de gel désactivée — vos tokens ne peuvent pas être gelés\n✅ Tokens équipe bloqués 12 mois — pas de risque de dump\n✅ Contrat intelligent sur Solana — transparent et vérifiable\n\nPreuves de transparence publiées après le lancement!",
    }[l]),
  },
  {
    patterns: ["staking","ستاكينج","stake","rewards","مكافآت","récompenses","apy","yield"],
    answer: l => ({
      en: "⚡ **$PWIFE Staking:**\nA staking system is planned to launch in Phase 2 (Q2-Q3 2026). It will be designed to:\n• Reward long-term holders\n• Reduce sell pressure\n• Enable structured reward programs\n\nStay tuned for APY announcements! 🔔",
      ar: "⚡ **ستاكينج $PWIFE:**\nنظام الستاكينج مخطط للإطلاق في المرحلة 2 (Q2-Q3 2026). سيتم تصميمه لـ:\n• مكافأة الحاملين على المدى الطويل\n• تقليل ضغط البيع\n• تفعيل برامج مكافآت منظمة\n\nترقب الإعلانات عن نسبة APY! 🔔",
      fr: "⚡ **Staking $PWIFE:**\nUn système de staking est prévu pour la Phase 2 (Q2-Q3 2026). Il sera conçu pour:\n• Récompenser les détenteurs long terme\n• Réduire la pression de vente\n• Activer des programmes de récompenses structurés\n\nRestez à l'écoute pour les annonces APY! 🔔",
    }[l]),
  },
  {
    patterns: ["airdrop","إيردروب","drop","free tokens","توكنات مجانية","tokens gratuits","claim","كليم","استلام"],
    answer: l => ({
      en: "🪂 **$PWIFE Airdrop:**\n15 Trillion $PWIFE allocated for airdrops & rewards!\n\n**How to qualify:**\n1. Follow @pepewifecoin on Twitter\n2. Join our Telegram\n3. Buy tokens in presale\n4. Refer friends\n\nComplete tasks in your Dashboard → Airdrop tab after connecting your wallet!",
      ar: "🪂 **إيردروب $PWIFE:**\n15 تريليون $PWIFE مخصص للإيردروب والمكافآت!\n\n**كيف تتأهل:**\n1. اتبع @pepewifecoin على تويتر\n2. انضم لتيليغرام\n3. اشتر في البيع المسبق\n4. أحل أصدقاء\n\nأكمل المهام في الداشبورد ← تبويب الإيردروب بعد ربط محفظتك!",
      fr: "🪂 **Airdrop $PWIFE:**\n15 Billions $PWIFE alloués aux airdrops et récompenses!\n\n**Comment se qualifier:**\n1. Suivez @pepewifecoin sur Twitter\n2. Rejoignez notre Telegram\n3. Achetez lors de la prévente\n4. Parrainez des amis\n\nComplétez les tâches dans votre Dashboard → onglet Airdrop après connexion de votre wallet!",
    }[l]),
  },
  {
    patterns: ["referral","refer","إحالة","أحل","parrainage","parrainer","bonus","code","كود"],
    answer: l => ({
      en: "🤝 **Referral Program:**\nEarn bonus $PWIFE for every friend you bring!\n\n• Connect your wallet\n• Go to Dashboard → Referrals tab\n• Get your unique referral link\n• Share it — earn rewards when friends buy!\n\nMore referrals = more tokens! 💰",
      ar: "🤝 **برنامج الإحالة:**\naحصل على $PWIFE مجاناً لكل صديق تجلبه!\n\n• اربط محفظتك\n• اذهب للداشبورد ← تبويب الإحالات\n• احصل على رابط إحالتك الفريد\n• شاركه — اكسب مكافآت عند شراء أصدقائك!\n\nكلما أحلت أكثر ← توكنات أكثر! 💰",
      fr: "🤝 **Programme de Parrainage:**\nGagnez des $PWIFE bonus pour chaque ami amené!\n\n• Connectez votre wallet\n• Allez au Dashboard → onglet Référencement\n• Obtenez votre lien unique\n• Partagez-le — gagnez des récompenses quand vos amis achètent!\n\nPlus de parrainages = plus de tokens! 💰",
    }[l]),
  },
  {
    patterns: ["wallet","محفظة","phantom","solflare","connect","ربط","connexion","solana"],
    answer: l => ({
      en: "👛 **Supported Wallets:**\n✅ Phantom (recommended)\n✅ Solflare\n✅ Backpack\n✅ OKX Wallet\n\n**To connect:**\n1. Install Phantom from phantom.app\n2. Create/import wallet\n3. Add SOL for gas fees\n4. Click 'Connect Wallet' on the site",
      ar: "👛 **المحافظ المدعومة:**\n✅ Phantom (موصى به)\n✅ Solflare\n✅ Backpack\n✅ OKX Wallet\n\n**للربط:**\n1. ثبّت Phantom من phantom.app\n2. أنشئ/استورد محفظة\n3. أضف SOL لرسوم الغاز\n4. اضغط 'Connect Wallet' في الموقع",
      fr: "👛 **Wallets Supportés:**\n✅ Phantom (recommandé)\n✅ Solflare\n✅ Backpack\n✅ OKX Wallet\n\n**Pour connecter:**\n1. Installez Phantom depuis phantom.app\n2. Créez/importez un wallet\n3. Ajoutez SOL pour les frais de gas\n4. Cliquez 'Connect Wallet' sur le site",
    }[l]),
  },
  {
    patterns: ["tap to earn","tap-to-earn","tapping","اضغط","تطبيق","application","app","earn"],
    answer: l => ({
      en: "📱 **Tap-to-Earn App:**\nPEPEWIFE is building a Tap-to-Earn application where users can actively participate and earn $PWIFE rewards!\n\n• Beta version launches in Phase 2 (Q2-Q3 2026)\n• Earn by tapping and completing tasks\n• Rewards based on clearly defined rules\n\nStay connected for early access! 🎮",
      ar: "📱 **تطبيق Tap-to-Earn:**\nPEPEWIFE تبني تطبيقاً للربح بالنقر حيث يمكن للمستخدمين المشاركة وكسب مكافآت $PWIFE!\n\n• النسخة التجريبية تُطلق في المرحلة 2 (Q2-Q3 2026)\n• اكسب بالنقر وإتمام المهام\n• مكافآت بناءً على قواعد واضحة\n\nابقَ متصلاً للوصول المبكر! 🎮",
      fr: "📱 **Application Tap-to-Earn:**\nPEPEWIFE développe une application Tap-to-Earn où les utilisateurs peuvent participer et gagner des récompenses $PWIFE!\n\n• Version bêta lancée en Phase 2 (Q2-Q3 2026)\n• Gagnez en tapotant et en complétant des tâches\n• Récompenses basées sur des règles claires\n\nRestez connecté pour l'accès anticipé! 🎮",
    }[l]),
  },
  {
    patterns: ["whitepaper","white paper","وايت بيبر","وثيقة","documentation","docs"],
    answer: l => ({
      en: "📄 **Whitepaper:**\nRead the full PEPEWIFE whitepaper to learn everything about the project — vision, tokenomics, roadmap, security, and utility.",
      ar: "📄 **الوايت بيبر:**\naقرأ وايت بيبر PEPEWIFE الكامل لتعرف كل شيء عن المشروع — الرؤية، التوكنوميكس، الروادماب، الأمان والأدوات.",
      fr: "📄 **Whitepaper:**\nLisez le whitepaper complet de PEPEWIFE pour tout savoir sur le projet — vision, tokenomics, roadmap, sécurité et utilité.",
    }[l]),
    actions: l => [{ label: l === "ar" ? "📄 اقرأ الوايت بيبر" : l === "fr" ? "📄 Lire le Whitepaper" : "📄 Read Whitepaper", href: "/whitepaper" }],
  },
  {
    patterns: ["social","telegram","twitter","community","مجتمع","communauté","تيليغرام","تويتر","discord"],
    answer: l => ({
      en: "🌐 **Join the PWIFE Community:**\nWe're building a strong global community of degens and believers!",
      ar: "🌐 **انضم لمجتمع $PWIFE:**\nنبني مجتمعاً عالمياً قوياً من المؤمنين بالمشروع!",
      fr: "🌐 **Rejoignez la Communauté $PWIFE:**\nNous construisons une forte communauté mondiale de croyants!",
    }[l]),
    actions: () => [
      { label: "✈️ Telegram", href: TELEGRAM_URL },
      { label: "🐦 Twitter / X", href: TWITTER_URL },
    ],
  },
  {
    patterns: ["human","real person","support","help","مساعدة","دعم","personne réelle","aide","staff","team","فريق"],
    answer: l => UI[l].humanPrompt,
    actions: l => [{ label: UI[l].humanBtn, onClick: openTawkSupport }],
  },
];

function detectLang(text: string): Lang {
  const ar = /[\u0600-\u06FF]/;
  const fr = /\b(bonjour|comment|qu[' ]est|je|le |la |les |un |une |des |est|sont|avoir|faire|merci|oui|non|acheter|prévente|roadmap|pourquoi|quel|quoi|avec|pour|sur)\b/i;
  if (ar.test(text)) return "ar";
  if (fr.test(text)) return "fr";
  return "en";
}

function findAnswer(input: string, lang: Lang): { answer: string; actions?: Message["actions"] } | null {
  const q = input.toLowerCase();
  for (const qa of QA_DB) {
    if (qa.patterns.some(p => q.includes(p.toLowerCase()))) {
      return {
        answer: qa.answer(lang),
        actions: qa.actions?.(lang),
      };
    }
  }
  return null;
}

let msgId = 0;
const newMsg = (from: Message["from"], text: string, actions?: Message["actions"]): Message => ({
  id: ++msgId, from, text, actions,
});

export default function Chatbot() {
  const [open, setOpen]       = useState(false);
  const [minimized, setMin]   = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput]     = useState("");
  const [typing, setTyping]   = useState(false);
  const [lang, setLang]       = useState<Lang>("en");
  const [unread, setUnread]   = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([newMsg("bot", UI[lang].welcome)]);
    }
  }, [open]);

  useEffect(() => {
    if (open && !minimized) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
      setUnread(0);
    }
  }, [messages, open, minimized]);

  const send = () => {
    const text = input.trim();
    if (!text) return;
    const detectedLang = detectLang(text);
    if (detectedLang !== lang) setLang(detectedLang);
    const userMsg = newMsg("user", text);
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setTyping(true);
    setTimeout(() => {
      const result = findAnswer(text, detectedLang);
      const botMsg = result
        ? newMsg("bot", result.answer, result.actions)
        : newMsg("bot", UI[detectedLang].noMatch, [
            { label: UI[detectedLang].supportBtn, onClick: openTawkSupport },
            { label: UI[detectedLang].twitterBtn, href: TWITTER_URL },
          ]);
      setMessages(prev => [...prev, botMsg]);
      setTyping(false);
      if (minimized) setUnread(n => n + 1);
    }, 700 + Math.random() * 400);
  };

  const isRTL = lang === "ar";

  return (
    <>
      {/* Floating button */}
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

      {/* Chat window */}
      {open && (
        <div
          className="fixed bottom-6 right-6 z-50 flex flex-col rounded-2xl border-4 border-[#1a1a2e] shadow-[6px_6px_0px_#1a1a2e] overflow-hidden"
          style={{ width: "min(360px, calc(100vw - 24px))", maxHeight: "min(520px, calc(100vh - 80px))" }}
          dir={isRTL ? "rtl" : "ltr"}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b-4 border-[#1a1a2e]" style={{ background: "linear-gradient(90deg, #FF4D9D, #FFD54F)" }}>
            <div className="flex items-center gap-2">
              <img src="/logo.webp" alt="PWIFE" className="w-8 h-8 rounded-full border-2 border-[#1a1a2e]" />
              <div>
                <div className="font-display text-sm text-[#1a1a2e] tracking-wide leading-none">{UI[lang].title}</div>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4CAF50] animate-pulse" />
                  <span className="text-[10px] font-bold text-[#1a1a2e]/60">{UI[lang].subtitle}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setMin(v => !v)} className="w-7 h-7 rounded-lg border-2 border-[#1a1a2e] bg-white/30 hover:bg-white/50 flex items-center justify-center transition-colors">
                <ChevronDown className={`h-4 w-4 text-[#1a1a2e] transition-transform ${minimized ? "rotate-180" : ""}`} />
              </button>
              <button onClick={() => { setOpen(false); setMessages([]); msgId = 0; }} className="w-7 h-7 rounded-lg border-2 border-[#1a1a2e] bg-white/30 hover:bg-white/50 flex items-center justify-center transition-colors">
                <X className="h-4 w-4 text-[#1a1a2e]" />
              </button>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-3 space-y-3" style={{ background: "#FFFDE7", minHeight: 0 }}>
                {messages.map(msg => (
                  <div key={msg.id} className={`flex flex-col ${msg.from === "user" ? (isRTL ? "items-start" : "items-end") : (isRTL ? "items-end" : "items-start")}`}>
                    <div
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm font-bold leading-relaxed border-2 border-[#1a1a2e] whitespace-pre-line ${
                        msg.from === "user"
                          ? "bg-[#FF4D9D] text-white shadow-[2px_2px_0px_#1a1a2e]"
                          : "bg-white text-[#1a1a2e] shadow-[2px_2px_0px_#1a1a2e]"
                      }`}
                    >
                      {msg.text}
                    </div>
                    {msg.actions && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5 max-w-[85%]">
                        {msg.actions.map((a, i) => (
                          a.href ? (
                            <a key={i} href={a.href} target="_blank" rel="noreferrer"
                              className="btn-meme text-xs font-display tracking-wide px-3 py-1.5 rounded-xl border-2 border-[#1a1a2e] bg-[#4CAF50] text-white shadow-[2px_2px_0px_#1a1a2e] hover:bg-[#2E7D32] transition-colors whitespace-nowrap">
                              {a.label}
                            </a>
                          ) : (
                            <button key={i} onClick={a.onClick}
                              className="btn-meme text-xs font-display tracking-wide px-3 py-1.5 rounded-xl border-2 border-[#1a1a2e] bg-[#4CAF50] text-white shadow-[2px_2px_0px_#1a1a2e] hover:bg-[#2E7D32] transition-colors whitespace-nowrap">
                              {a.label}
                            </button>
                          )
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {typing && (
                  <div className={`flex ${isRTL ? "justify-end" : "justify-start"}`}>
                    <div className="bg-white border-2 border-[#1a1a2e] rounded-2xl px-4 py-2.5 shadow-[2px_2px_0px_#1a1a2e] flex items-center gap-1.5">
                      {[0, 150, 300].map(d => (
                        <span key={d} className="w-2 h-2 rounded-full bg-[#FF4D9D] animate-bounce" style={{ animationDelay: `${d}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {/* Quick suggestions */}
              <div className="px-3 py-2 border-t-2 border-[#1a1a2e]/10 overflow-x-auto" style={{ background: "#FFF9C4" }}>
                <div className="flex gap-1.5 w-max">
                  {[
                    { en: "💰 Price", ar: "💰 السعر", fr: "💰 Prix", q: "price" },
                    { en: "🛒 How to buy", ar: "🛒 كيف أشتري", fr: "🛒 Acheter", q: "how to buy" },
                    { en: "🔒 Safe?", ar: "🔒 آمن؟", fr: "🔒 Sûr?", q: "safe" },
                    { en: "🗺️ Roadmap", ar: "🗺️ روادماب", fr: "🗺️ Roadmap", q: "roadmap" },
                    { en: "👤 Human", ar: "👤 دعم حقيقي", fr: "👤 Humain", q: "human support" },
                  ].map(s => (
                    <button key={s.q} onClick={() => { setInput(s.q); setTimeout(() => inputRef.current?.focus(), 0); }}
                      className="shrink-0 text-[11px] font-display tracking-wide px-2.5 py-1 rounded-lg border-2 border-[#1a1a2e]/20 bg-white hover:border-[#FF4D9D] text-[#1a1a2e] transition-colors whitespace-nowrap">
                      {s[lang]}
                    </button>
                  ))}
                </div>
              </div>

              {/* Input */}
              <div className="flex items-center gap-2 px-3 py-3 border-t-4 border-[#1a1a2e]" style={{ background: "#FFFDE7" }}>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && send()}
                  placeholder={UI[lang].placeholder}
                  className="flex-1 h-10 rounded-xl border-2 border-[#1a1a2e] bg-white px-3 text-sm text-[#1a1a2e] font-bold placeholder:text-[#1a1a2e]/30 focus:outline-none focus:border-[#FF4D9D] transition-colors"
                  dir={isRTL ? "rtl" : "ltr"}
                />
                <button
                  onClick={send}
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
