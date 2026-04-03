import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from "react";
import {
  AlertTriangle,
  XCircle,
  CheckCircle,
  Info,
  X,
  Wifi,
  WifiOff,
  Download,
  ShieldAlert,
  RefreshCw,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/i18n/context";
import type { WalletType } from "@/lib/wallet";

export type ToastType = "error" | "warning" | "success" | "info";

export type WalletErrorCode =
  | "NOT_INSTALLED"
  | "USER_REJECTED"
  | "WRONG_NETWORK"
  | "CONNECTION_FAILED"
  | "INVALID_ADDRESS"
  | "NO_ACCOUNTS"
  | "TIMEOUT"
  | "ALREADY_CONNECTING"
  | "PROVIDER_ERROR"
  | "DISCONNECTED_UNEXPECTED"
  | "ACCOUNT_CHANGED"
  | "SESSION_EXPIRED"
  | "UNSUPPORTED_BROWSER"
  | "POPUP_BLOCKED";

export interface ToastItem {
  id: string;
  type: ToastType;
  code: WalletErrorCode | "CONNECTED" | "DISCONNECTED" | "CUSTOM";
  walletName?: string;
  customMessage?: string;
  autoDismiss?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showWalletError: (code: WalletErrorCode, walletName?: string) => void;
  showSuccess: (code: "CONNECTED" | "DISCONNECTED", walletName?: string) => void;
  showInfo: (message: string) => void;
  dismissToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType>({
  toasts: [],
  showWalletError: () => {},
  showSuccess: () => {},
  showInfo: () => {},
  dismissToast: () => {},
  clearAll: () => {},
});

let toastCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback((toast: Omit<ToastItem, "id">) => {
    const id = `toast-${++toastCounter}-${Date.now()}`;
    setToasts((prev) => {
      const filtered = prev.filter((t) => !(t.code === toast.code && t.walletName === toast.walletName));
      return [...filtered, { ...toast, id }].slice(-5);
    });
    return id;
  }, []);

  const showWalletError = useCallback((code: WalletErrorCode, walletName?: string) => {
    const typeMap: Record<WalletErrorCode, ToastType> = {
      NOT_INSTALLED: "warning",
      USER_REJECTED: "warning",
      WRONG_NETWORK: "error",
      CONNECTION_FAILED: "error",
      INVALID_ADDRESS: "error",
      NO_ACCOUNTS: "warning",
      TIMEOUT: "error",
      ALREADY_CONNECTING: "info",
      PROVIDER_ERROR: "error",
      DISCONNECTED_UNEXPECTED: "warning",
      ACCOUNT_CHANGED: "info",
      SESSION_EXPIRED: "warning",
      UNSUPPORTED_BROWSER: "error",
      POPUP_BLOCKED: "warning",
    };
    const dismissMap: Record<WalletErrorCode, number> = {
      NOT_INSTALLED: 8000,
      USER_REJECTED: 5000,
      WRONG_NETWORK: 8000,
      CONNECTION_FAILED: 6000,
      INVALID_ADDRESS: 6000,
      NO_ACCOUNTS: 6000,
      TIMEOUT: 6000,
      ALREADY_CONNECTING: 4000,
      PROVIDER_ERROR: 6000,
      DISCONNECTED_UNEXPECTED: 5000,
      ACCOUNT_CHANGED: 4000,
      SESSION_EXPIRED: 6000,
      UNSUPPORTED_BROWSER: 10000,
      POPUP_BLOCKED: 6000,
    };
    addToast({ type: typeMap[code], code, walletName, autoDismiss: dismissMap[code] });
  }, [addToast]);

  const showSuccess = useCallback((code: "CONNECTED" | "DISCONNECTED", walletName?: string) => {
    addToast({ type: "success", code, walletName, autoDismiss: 4000 });
  }, [addToast]);

  const showInfo = useCallback((message: string) => {
    addToast({ type: "info", code: "CUSTOM", customMessage: message, autoDismiss: 4000 });
  }, [addToast]);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, showWalletError, showSuccess, showInfo, dismissToast, clearAll }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}

const WALLET_LABELS: Record<WalletType, string> = {
  phantom: "Phantom",
  solflare: "Solflare",
  metamask: "MetaMask",
  okx: "OKX Wallet",
  trust: "Trust Wallet",
};

export function mapErrorToCode(errorMessage: string): WalletErrorCode {
  if (errorMessage.includes("NOT_INSTALLED")) return "NOT_INSTALLED";
  if (errorMessage === "USER_REJECTED") return "USER_REJECTED";
  if (errorMessage === "WRONG_NETWORK") return "WRONG_NETWORK";
  if (errorMessage === "INVALID_ADDRESS") return "INVALID_ADDRESS";
  if (errorMessage === "NO_ACCOUNTS") return "NO_ACCOUNTS";
  if (errorMessage === "TIMEOUT") return "TIMEOUT";
  if (errorMessage === "ALREADY_CONNECTING") return "ALREADY_CONNECTING";
  if (errorMessage === "POPUP_BLOCKED") return "POPUP_BLOCKED";
  if (errorMessage === "UNSUPPORTED_BROWSER") return "UNSUPPORTED_BROWSER";
  if (errorMessage === "SESSION_EXPIRED") return "SESSION_EXPIRED";
  if (errorMessage === "DISCONNECTED_UNEXPECTED") return "DISCONNECTED_UNEXPECTED";
  if (errorMessage === "ACCOUNT_CHANGED") return "ACCOUNT_CHANGED";
  return "CONNECTION_FAILED";
}

export function getWalletLabel(walletType: WalletType): string {
  return WALLET_LABELS[walletType] || walletType;
}

interface ToastConfig {
  icon: LucideIcon;
  bg: string;
  border: string;
  iconColor: string;
  progressColor: string;
  shadow: string;
}

const toastConfigs: Record<ToastType, ToastConfig> = {
  error: {
    icon: XCircle,
    bg: "bg-red-50",
    border: "border-red-300",
    iconColor: "text-red-500",
    progressColor: "bg-red-400",
    shadow: "shadow-[0_4px_20px_rgba(239,68,68,0.15)]",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-amber-50",
    border: "border-amber-300",
    iconColor: "text-amber-500",
    progressColor: "bg-amber-400",
    shadow: "shadow-[0_4px_20px_rgba(245,158,11,0.15)]",
  },
  success: {
    icon: CheckCircle,
    bg: "bg-emerald-50",
    border: "border-emerald-300",
    iconColor: "text-emerald-500",
    progressColor: "bg-emerald-400",
    shadow: "shadow-[0_4px_20px_rgba(16,185,129,0.15)]",
  },
  info: {
    icon: Info,
    bg: "bg-blue-50",
    border: "border-blue-300",
    iconColor: "text-blue-500",
    progressColor: "bg-blue-400",
    shadow: "shadow-[0_4px_20px_rgba(59,130,246,0.15)]",
  },
};

function getErrorIcon(code: WalletErrorCode): LucideIcon {
  switch (code) {
    case "NOT_INSTALLED": return Download;
    case "WRONG_NETWORK": return WifiOff;
    case "DISCONNECTED_UNEXPECTED": return WifiOff;
    case "UNSUPPORTED_BROWSER": return ShieldAlert;
    case "SESSION_EXPIRED": return RefreshCw;
    case "ACCOUNT_CHANGED": return RefreshCw;
    case "TIMEOUT": return Wifi;
    default: return toastConfigs.error.icon;
  }
}

function useToastMessage(toast: ToastItem) {
  const { t } = useLanguage();
  const errors = t.walletErrors;
  const walletName = toast.walletName || "";

  if (toast.code === "CUSTOM" && toast.customMessage) {
    return { title: "", message: toast.customMessage, action: "" };
  }

  if (toast.code === "CONNECTED") {
    return {
      title: errors.connectedTitle,
      message: errors.connectedMsg.replace("{wallet}", walletName),
      action: "",
    };
  }

  if (toast.code === "DISCONNECTED") {
    return {
      title: errors.disconnectedTitle,
      message: errors.disconnectedMsg,
      action: "",
    };
  }

  const codeKey = toast.code as WalletErrorCode;
  const titles: Record<WalletErrorCode, string> = {
    NOT_INSTALLED: errors.notInstalledTitle,
    USER_REJECTED: errors.rejectedTitle,
    WRONG_NETWORK: errors.wrongNetworkTitle,
    CONNECTION_FAILED: errors.failedTitle,
    INVALID_ADDRESS: errors.invalidAddressTitle,
    NO_ACCOUNTS: errors.noAccountsTitle,
    TIMEOUT: errors.timeoutTitle,
    ALREADY_CONNECTING: errors.alreadyConnectingTitle,
    PROVIDER_ERROR: errors.providerErrorTitle,
    DISCONNECTED_UNEXPECTED: errors.disconnectedUnexpectedTitle,
    ACCOUNT_CHANGED: errors.accountChangedTitle,
    SESSION_EXPIRED: errors.sessionExpiredTitle,
    UNSUPPORTED_BROWSER: errors.unsupportedBrowserTitle,
    POPUP_BLOCKED: errors.popupBlockedTitle,
  };

  const messages: Record<WalletErrorCode, string> = {
    NOT_INSTALLED: errors.notInstalledMsg.replace("{wallet}", walletName),
    USER_REJECTED: errors.rejectedMsg,
    WRONG_NETWORK: errors.wrongNetworkMsg,
    CONNECTION_FAILED: errors.failedMsg,
    INVALID_ADDRESS: errors.invalidAddressMsg,
    NO_ACCOUNTS: errors.noAccountsMsg,
    TIMEOUT: errors.timeoutMsg,
    ALREADY_CONNECTING: errors.alreadyConnectingMsg,
    PROVIDER_ERROR: errors.providerErrorMsg,
    DISCONNECTED_UNEXPECTED: errors.disconnectedUnexpectedMsg,
    ACCOUNT_CHANGED: errors.accountChangedMsg,
    SESSION_EXPIRED: errors.sessionExpiredMsg,
    UNSUPPORTED_BROWSER: errors.unsupportedBrowserMsg,
    POPUP_BLOCKED: errors.popupBlockedMsg,
  };

  const actions: Record<WalletErrorCode, string> = {
    NOT_INSTALLED: errors.actionInstall,
    USER_REJECTED: errors.actionRetry,
    WRONG_NETWORK: errors.actionSwitch,
    CONNECTION_FAILED: errors.actionRetry,
    INVALID_ADDRESS: errors.actionRetry,
    NO_ACCOUNTS: errors.actionUnlock,
    TIMEOUT: errors.actionRetry,
    ALREADY_CONNECTING: errors.actionWait,
    PROVIDER_ERROR: errors.actionRefresh,
    DISCONNECTED_UNEXPECTED: errors.actionReconnect,
    ACCOUNT_CHANGED: errors.actionRefresh,
    SESSION_EXPIRED: errors.actionReconnect,
    UNSUPPORTED_BROWSER: errors.actionUseChrome,
    POPUP_BLOCKED: errors.actionAllowPopup,
  };

  return {
    title: titles[codeKey] || errors.failedTitle,
    message: messages[codeKey] || errors.failedMsg,
    action: actions[codeKey] || errors.actionRetry,
  };
}

function ToastContainer({ toasts, onDismiss }: { toasts: ToastItem[]; onDismiss: (id: string) => void }) {
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";

  return (
    <div
      className={`fixed top-4 z-[9999] flex flex-col gap-3 pointer-events-none max-w-[420px] w-[calc(100vw-32px)] ${isRTL ? "left-4" : "right-4"}`}
      role="region"
      aria-label="Notifications"
      dir={dir}
    >
      {toasts.map((toast) => (
        <SingleToast key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function SingleToast({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [progress, setProgress] = useState(100);
  const [isPaused, setIsPaused] = useState(false);
  const { dir } = useLanguage();
  const isRTL = dir === "rtl";
  const { title, message, action } = useToastMessage(toast);

  const config = toastConfigs[toast.type];
  const IconComponent = toast.type === "error" || toast.type === "warning"
    ? getErrorIcon(toast.code as WalletErrorCode)
    : config.icon;

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [onDismiss, toast.id]);

  useEffect(() => {
    requestAnimationFrame(() => setIsVisible(true));
  }, []);

  useEffect(() => {
    if (!toast.autoDismiss || isPaused) return;

    const interval = 50;
    const decrement = (interval / toast.autoDismiss) * 100;
    const timer = setInterval(() => {
      setProgress((prev) => {
        const next = prev - decrement;
        if (next <= 0) {
          clearInterval(timer);
          handleDismiss();
          return 0;
        }
        return next;
      });
    }, interval);

    return () => clearInterval(timer);
  }, [toast.autoDismiss, isPaused, handleDismiss]);

  const slideDirection = isRTL ? "-translate-x-full" : "translate-x-full";
  const slideIn = isRTL ? "translate-x-0" : "translate-x-0";

  return (
    <div
      role="alert"
      aria-live="assertive"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`pointer-events-auto rounded-2xl border-2 ${config.bg} ${config.border} ${config.shadow} overflow-hidden transition-all duration-300 ease-out ${
        isExiting
          ? `opacity-0 ${slideDirection} scale-95`
          : isVisible
          ? `opacity-100 ${slideIn} scale-100`
          : `opacity-0 ${slideDirection} scale-95`
      }`}
    >
      <div className="p-4 flex items-start gap-3">
        <div className={`shrink-0 mt-0.5 ${config.iconColor}`}>
          <IconComponent className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          {title && (
            <div className="font-display text-sm text-[#1a1a2e] tracking-wider mb-0.5">{title}</div>
          )}
          <p className="text-xs text-[#1a1a2e]/70 font-bold leading-relaxed">{message}</p>
          {action && (
            <p className="text-[10px] text-[#1a1a2e]/40 font-display tracking-wider mt-1.5">
              💡 {action}
            </p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="shrink-0 text-[#1a1a2e]/30 hover:text-[#1a1a2e]/60 transition-colors p-0.5 rounded-lg hover:bg-[#1a1a2e]/5"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {toast.autoDismiss && (
        <div className="h-1 bg-[#1a1a2e]/5">
          <div
            className={`h-full ${config.progressColor} transition-all duration-100 ease-linear rounded-full`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}
