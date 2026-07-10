import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { 
  ShieldAlert, Key, RefreshCw, CheckCircle2, AlertTriangle, 
  Sparkles, Eye, EyeOff, ShieldCheck, ArrowRight, Lock 
} from 'lucide-react';
import { validateEnvironment, updateEnvironmentKeys, EnvironmentValidationResult } from '../utils/setup_environment';

interface EnvironmentSecurityModalProps {
  currentLang: 'en' | 'ru' | 'zh';
  onInitialized: () => void;
}

export const EnvironmentSecurityModal: React.FC<EnvironmentSecurityModalProps> = ({
  currentLang,
  onInitialized
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [status, setStatus] = useState<EnvironmentValidationResult | null>(null);

  // Input states for manual configuration
  const [isManual, setIsManual] = useState(false);
  const [jwtInput, setJwtInput] = useState('');
  const [encryptionInput, setEncryptionInput] = useState('');
  const [showJwt, setShowJwt] = useState(false);
  const [showEncryption, setShowEncryption] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const checkSecurity = async () => {
    setLoading(true);
    try {
      const result = await validateEnvironment();
      setStatus(result);
      if (!result.overallSecure) {
        setIsOpen(true);
      } else {
        onInitialized();
      }
    } catch (err) {
      console.error('Environment check failed:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkSecurity();
  }, []);

  const handleAutoGenerate = async () => {
    setUpdating(true);
    setErrorMessage('');
    try {
      const success = await updateEnvironmentKeys('generate_secure', 'generate_secure');
      if (success) {
        // Re-verify status
        const nextResult = await validateEnvironment();
        setStatus(nextResult);
        if (nextResult.overallSecure) {
          setIsOpen(false);
          onInitialized();
        } else {
          setErrorMessage(currentLang === 'ru' ? 'Ошибка генерации ключей. Попробуйте вручную.' : 'Failed to generate secure keys. Please try manual entry.');
        }
      } else {
        setErrorMessage(currentLang === 'ru' ? 'Ошибка сервера при генерации ключей.' : 'Server returned error during secure keys generation.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error occurred');
    } finally {
      setUpdating(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (jwtInput.length < 32) {
      setErrorMessage(currentLang === 'ru' ? 'JWT_SECRET должен быть длиной не менее 32 символов!' : 'JWT_SECRET must be at least 32 characters long!');
      return;
    }
    if (encryptionInput.length < 32) {
      setErrorMessage(currentLang === 'ru' ? 'ENCRYPTION_MASTER_KEY должен быть длиной не менее 32 символов!' : 'ENCRYPTION_MASTER_KEY must be at least 32 characters long!');
      return;
    }

    setUpdating(true);
    try {
      const success = await updateEnvironmentKeys(jwtInput, encryptionInput);
      if (success) {
        const nextResult = await validateEnvironment();
        setStatus(nextResult);
        if (nextResult.overallSecure) {
          setIsOpen(false);
          onInitialized();
        } else {
          setErrorMessage(currentLang === 'ru' ? 'Сохраненные ключи по-прежнему не соответствуют требованиям безопасности.' : 'Saved credentials still do not satisfy core security policies.');
        }
      } else {
        setErrorMessage(currentLang === 'ru' ? 'Не удалось сохранить ключи на сервере.' : 'Failed to persist custom keys on backend.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error saving keys');
    } finally {
      setUpdating(false);
    }
  };

  const translations = {
    en: {
      title: "Mandatory Environment Shield",
      subtitle: "Secure credentials (JWT_SECRET, ENCRYPTION_MASTER_KEY) are missing or set to insecure fallback values.",
      description: "To prevent cryptographic token leaks and enable secure database persistence, a 32+ character high-entropy key is required for both variables in production-ready environments.",
      jwtLabel: "JWT Token Signing Secret",
      encryptionLabel: "Symmetric Encryption Master Key",
      statusSecure: "SECURE",
      statusInsecure: "INSECURE / FALLBACK",
      statusMissing: "MISSING",
      generateBtn: "Auto-Generate 256-bit Cryptographic Keys",
      generateDesc: "Generates high-entropy secure hashes via the Node crypto engine and persists them in .env.",
      manualBtn: "Manually Configure Keys",
      manualLabel: "Manual Settings Override",
      saveKeys: "Commit & Secure Environment",
      backBtn: "Cancel and Back",
      lengthHint: "Minimum 32 characters required for full cryptographic security."
    },
    ru: {
      title: "Щит Безопасности Среды",
      subtitle: "Обязательные ключи (JWT_SECRET, ENCRYPTION_MASTER_KEY) отсутствуют или используют небезопасные дефолтные значения.",
      description: "Для защиты токенов авторизации и шифрования API ключей в базе данных требуются два надежных ключа длиной не менее 32 символов.",
      jwtLabel: "Секрет подписи токенов JWT",
      encryptionLabel: "Мастер-ключ симметричного шифрования",
      statusSecure: "БЕЗОПАСНО",
      statusInsecure: "НЕБЕЗОПАСНЫЙ FALLBACK",
      statusMissing: "ОТСУТСТВУЕТ",
      generateBtn: "Сгенерировать 256-битные крипто-ключи",
      generateDesc: "Инициализирует надежные хеши через криптографический движок Node и запишет их в .env.",
      manualBtn: "Ввести ключи вручную",
      manualLabel: "Ручная настройка параметров",
      saveKeys: "Сохранить и Защитить Среду",
      backBtn: "Назад",
      lengthHint: "Требуется минимум 32 символа для обеспечения надежного шифрования."
    },
    zh: {
      title: "强制环境变量安全防护",
      subtitle: "核心加密密钥 (JWT_SECRET, ENCRYPTION_MASTER_KEY) 缺失或处于不安全的默认回退状态。",
      description: "为了防止凭证泄露并确保数据库安全持久化，生产就绪环境必须为这两个变量配置不低于 32 位的强加密哈希密钥。",
      jwtLabel: "JWT 令牌签名密钥",
      encryptionLabel: "对称加密主密钥",
      statusSecure: "安全",
      statusInsecure: "不安全 / 默认回退",
      statusMissing: "缺失",
      generateBtn: "自动生成 256 位高熵加密哈希",
      generateDesc: "通过 Node.js 加密引擎创建随机强密钥并持久化保存至 .env 文件中。",
      manualBtn: "手动指定密钥值",
      manualLabel: "手动指定加密配置",
      saveKeys: "保存并激活安全防护",
      backBtn: "取消并返回",
      lengthHint: "必须输入至少 32 个字符以保证密级标准要求。"
    }
  }[currentLang] || {
    title: "Mandatory Environment Shield",
    subtitle: "Secure credentials (JWT_SECRET, ENCRYPTION_MASTER_KEY) are missing or set to insecure fallback values.",
    description: "To prevent cryptographic token leaks and enable secure database persistence, a 32+ character high-entropy key is required for both variables in production-ready environments.",
    jwtLabel: "JWT Token Signing Secret",
    encryptionLabel: "Symmetric Encryption Master Key",
    statusSecure: "SECURE",
    statusInsecure: "INSECURE / FALLBACK",
    statusMissing: "MISSING",
    generateBtn: "Auto-Generate 256-bit Cryptographic Keys",
    generateDesc: "Generates high-entropy secure hashes via the Node crypto engine and persists them in .env.",
    manualBtn: "Manually Configure Keys",
    manualLabel: "Manual Settings Override",
    saveKeys: "Commit & Secure Environment",
    backBtn: "Cancel and Back",
    lengthHint: "Minimum 32 characters required for full cryptographic security."
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-hidden" id="environment-security-modal-overlay">
      {/* Dark blur backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="fixed inset-0 bg-slate-950/90 backdrop-blur-2xl pointer-events-auto"
      />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-xl bg-slate-900/95 border border-rose-500/20 rounded-3xl p-6 md:p-8 relative z-10 shadow-2xl flex flex-col max-h-[90vh] overflow-y-auto"
      >
        {/* Glow highlights */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-rose-500/5 blur-[120px] rounded-full pointer-events-none" />

        {/* Header Title with warning icon */}
        <div className="flex items-center gap-3.5 border-b border-slate-800 pb-5 mb-5 shrink-0">
          <div className="bg-rose-500/10 p-2.5 rounded-2xl border border-rose-500/20 text-rose-400">
            <ShieldAlert size={22} className="animate-pulse" />
          </div>
          <div>
            <h2 className="text-base font-black uppercase tracking-wide text-rose-400">
              {translations.title}
            </h2>
            <span className="text-[10px] text-slate-400 block font-mono">
              kostromai44 security enforcement shield
            </span>
          </div>
        </div>

        {/* Status details / Form description */}
        <div className="space-y-4">
          <p className="text-xs text-rose-350 bg-rose-950/20 border border-rose-500/10 p-4 rounded-2xl leading-relaxed">
            <strong>{translations.subtitle}</strong>
            <span className="block mt-1.5 text-slate-400 text-[11px] leading-relaxed">
              {translations.description}
            </span>
          </p>

          {/* Current credentials status checklist */}
          {status && !isManual && (
            <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-2xl space-y-3.5">
              <span className="text-[9px] text-slate-500 font-extrabold uppercase tracking-wider block">
                Current Audit Check Status
              </span>

              {/* JWT Audit Status */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Key size={13} className={status.jwtInsecure ? 'text-rose-400' : 'text-emerald-400'} />
                  <span className="font-bold">{translations.jwtLabel}</span>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-black ${
                  status.jwtMissing 
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                    : status.jwtInsecure 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {status.jwtMissing ? translations.statusMissing : status.jwtInsecure ? translations.statusInsecure : translations.statusSecure}
                </span>
              </div>

              {/* Encryption Key Audit Status */}
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 text-slate-300">
                  <Lock size={13} className={status.encryptionInsecure ? 'text-rose-400' : 'text-emerald-400'} />
                  <span className="font-bold">{translations.encryptionLabel}</span>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded font-mono font-black ${
                  status.encryptionMissing 
                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' 
                    : status.encryptionInsecure 
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                    : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                }`}>
                  {status.encryptionMissing ? translations.statusMissing : status.encryptionInsecure ? translations.statusInsecure : translations.statusSecure}
                </span>
              </div>
            </div>
          )}

          {/* Setup triggers / manual form */}
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-bold leading-normal">
              {errorMessage}
            </div>
          )}

          {!isManual ? (
            <div className="space-y-3.5 pt-2">
              {/* Option A: Auto-generate */}
              <button
                type="button"
                onClick={handleAutoGenerate}
                disabled={updating}
                className="w-full p-4 bg-emerald-500 text-slate-950 hover:bg-emerald-400 rounded-2xl font-black text-xs transition-all flex items-start gap-4 text-left shadow-lg hover:shadow-emerald-500/15 cursor-pointer disabled:opacity-50"
              >
                <div className="bg-slate-950/10 p-2 rounded-xl border border-slate-950/10 shrink-0">
                  <Sparkles size={16} />
                </div>
                <div className="space-y-1">
                  <span className="block font-black text-sm uppercase tracking-wide">{translations.generateBtn}</span>
                  <span className="block text-[10px] opacity-75 font-normal leading-relaxed">{translations.generateDesc}</span>
                </div>
              </button>

              {/* Option B: Manual setup toggle */}
              <button
                type="button"
                onClick={() => setIsManual(true)}
                disabled={updating}
                className="w-full p-4 bg-slate-950/50 hover:bg-slate-950/80 text-slate-300 hover:text-white border border-slate-850 hover:border-slate-700 rounded-2xl font-bold text-xs transition-all flex items-start gap-4 text-left cursor-pointer"
              >
                <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 shrink-0">
                  <Key size={16} />
                </div>
                <div className="space-y-1">
                  <span className="block font-black text-sm uppercase tracking-wide text-slate-200">{translations.manualBtn}</span>
                  <span className="block text-[10px] text-slate-500 font-normal leading-relaxed">
                    {currentLang === 'ru' ? 'Введите ваши личные криптографические ключи.' : 'Provide your own high-entropy keys manually.'}
                  </span>
                </div>
              </button>
            </div>
          ) : (
            <form onSubmit={handleManualSubmit} className="space-y-4 pt-2">
              <div className="border-b border-slate-850 pb-1 flex justify-between items-center">
                <span className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                  <Sparkles size={14} className="text-emerald-400" />
                  {translations.manualLabel}
                </span>
                <button
                  type="button"
                  onClick={() => setIsManual(false)}
                  className="text-[10px] text-emerald-400 hover:underline font-bold"
                >
                  {translations.backBtn}
                </button>
              </div>

              {/* JWT Key Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex justify-between items-center">
                  <span>{translations.jwtLabel}</span>
                  <span className="text-[10px] font-mono text-slate-500">{jwtInput.length}/32+ chars</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showJwt ? "text" : "password"}
                    value={jwtInput}
                    onChange={(e) => setJwtInput(e.target.value)}
                    placeholder="Enter 32+ character key signature secret"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none p-3 rounded-xl text-sm text-slate-100 font-mono transition-all pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowJwt(!showJwt)}
                    className="absolute right-3 text-slate-500 hover:text-slate-350 cursor-pointer"
                  >
                    {showJwt ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Encryption Key Input */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-300 flex justify-between items-center">
                  <span>{translations.encryptionLabel}</span>
                  <span className="text-[10px] font-mono text-slate-500">{encryptionInput.length}/32+ chars</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showEncryption ? "text" : "password"}
                    value={encryptionInput}
                    onChange={(e) => setEncryptionInput(e.target.value)}
                    placeholder="Enter 32+ character encryption master key"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500 focus:outline-none p-3 rounded-xl text-sm text-slate-100 font-mono transition-all pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowEncryption(!showEncryption)}
                    className="absolute right-3 text-slate-500 hover:text-slate-350 cursor-pointer"
                  >
                    {showEncryption ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <span className="text-[10px] text-slate-500 leading-normal block italic">
                {translations.lengthHint}
              </span>

              {/* Form submit button */}
              <button
                type="submit"
                disabled={updating || jwtInput.length < 32 || encryptionInput.length < 32}
                className="w-full py-3.5 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 uppercase tracking-wide transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-emerald-500/10 cursor-pointer disabled:opacity-50"
              >
                {updating ? <RefreshCw size={13} className="animate-spin" /> : <ShieldCheck size={13} />}
                {translations.saveKeys}
              </button>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
};
