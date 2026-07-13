import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import posthog from 'posthog-js';
import { useAgentApp } from './useAgentApp';
import { validateApiKeys } from '../utils/validateApiKeys';
import { PREBUILT_TEMPLATES } from '../types';

export function useProjectLifecycle() {
  const { t, i18n: i18nInstance } = useTranslation();
  const app = useAgentApp();

  const [apiKeysMissing, setApiKeysMissing] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isFirstLaunchOpen, setIsFirstLaunchOpen] = useState(false);

  // Check if first launch on mount
  useEffect(() => {
    if (typeof localStorage !== 'undefined') {
      const isInitialized = localStorage.getItem("kostromai44_initialized");
      if (isInitialized !== 'true') {
        setIsFirstLaunchOpen(true);
      }
    }
  }, []);

  // Keyboard shortcut listener for help menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement?.tagName;
      const isInput = activeEl === 'INPUT' || activeEl === 'TEXTAREA';
      if (!isInput && (e.key === '?' || (e.ctrlKey && e.key === '/'))) {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Sync API Keys status with active views or wizard triggers
  useEffect(() => {
    const checkKeys = async () => {
      const res = await validateApiKeys();
      setApiKeysMissing(res.geminiMissing);
    };
    checkKeys();
  }, [app.currentView, isFirstLaunchOpen]);

  // Handle language changes with telemetry logging
  const handleLanguageChange = (lang: 'en' | 'ru' | 'zh') => {
    app.setCurrentLang(lang);
    i18nInstance.changeLanguage(lang);
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem("kostromai44_lang", lang);
    }
    posthog.capture('language_switched', { locale: lang });
  };

  // Complete launch wizard setup, apply config and load default/selected template
  const handleWizardComplete = async (config: {
    lang: 'en' | 'ru' | 'zh';
    geminiKey: string;
    userName: string;
    userColor: string;
    selectedTemplateId: string;
    generateWorkspaceFiles?: boolean;
  }) => {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem("kostromai44_initialized", "true");
      localStorage.setItem("kostromai44_lang", config.lang);
      
      if (config.geminiKey) {
        localStorage.setItem("kostromai44_gemini_api_key", config.geminiKey);
      }
      
      localStorage.setItem("kostromai44_user_name", config.userName);
      localStorage.setItem("kostromai44_user_color", config.userColor);
    }

    // Apply config to state
    app.setCurrentLang(config.lang);
    i18nInstance.changeLanguage(config.lang);
    
    if (app.updateUserName) {
      app.updateUserName(config.userName);
    }
    if ((app as any).updateUserColor) {
      (app as any).updateUserColor(config.userColor);
    }

    // Load initial workflow template
    if (config.selectedTemplateId === 'blank-canvas') {
      app.setNodes([]);
      app.setConnections([]);
    } else {
      const matched = PREBUILT_TEMPLATES.find(t => t.id === config.selectedTemplateId);
      if (matched) {
        app.setNodes(matched.nodes);
        app.setConnections(matched.connections);
      }
    }

    // Pre-generate and save files on backend if toggled
    if (config.generateWorkspaceFiles) {
      try {
        await fetch('/api/config/setup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            geminiKey: config.geminiKey || 'sandbox_free_test_gemini',
            openaiKey: 'sandbox_free_test_openai',
            anthropicKey: 'sandbox_free_test_anthropic',
            jwtSecret: 'sandbox_jwt_secret_token_signature_key_32_chars',
            encryptionKey: 'sandbox_encryption_master_key_for_api_keys_32_chars'
          }),
        });
      } catch (err) {
        console.error('Error auto-generating workspace credentials:', err);
      }
    }

    // Recheck API keys status
    const recheck = async () => {
      const res = await validateApiKeys();
      setApiKeysMissing(res.geminiMissing);
    };
    await recheck();

    setIsFirstLaunchOpen(false);
  };

  // Translations Proxy
  const translations: any = {
    en: new Proxy({}, { get: (_, prop) => t(prop as string) }),
    ru: new Proxy({}, { get: (_, prop) => t(prop as string) }),
    zh: new Proxy({}, { get: (_, prop) => t(prop as string) })
  };

  return {
    app,
    apiKeysMissing,
    setApiKeysMissing,
    isShortcutsOpen,
    setIsShortcutsOpen,
    isFirstLaunchOpen,
    setIsFirstLaunchOpen,
    handleWizardComplete,
    handleLanguageChange,
    translations,
    t,
    i18nInstance,
  };
}
