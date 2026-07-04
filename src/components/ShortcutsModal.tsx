import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { X, HelpCircle, Keyboard, HelpCircle as HelpIcon } from 'lucide-react';

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLang: 'en' | 'ru' | 'zh';
}

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({
  isOpen,
  onClose,
  currentLang,
}) => {
  const t = {
    en: {
      title: "Keyboard Shortcuts",
      subtitle: "Power-user command cheat sheet & quick triggers",
      categoryGeneral: "General Commands",
      categoryCanvas: "Canvas Editing",
      categoryPan: "Selection & Navigation",
      closeBtn: "Close Help",
      escHint: "Esc to close",
      keys: {
        ctrlS: "Save local checkpoint state",
        ctrlEnter: "Execute active pipeline trace",
        ctrlK: "Open command palette finder",
        ctrlZ: "Undo last connection or action",
        ctrlY: "Redo last connection or action",
        ctrlD: "Duplicate highlighted node",
        delete: "Remove highlighted elements",
        escape: "Deselect node / close modals",
        space: "Pan canvas freely",
        shiftDrag: "Box select multiple cards",
        shiftClick: "Toggle select individual nodes"
      }
    },
    ru: {
      title: "Горячие Клавиши",
      subtitle: "Шпаргалка быстрых команд для продвинутых пользователей",
      categoryGeneral: "Основные Команды",
      categoryCanvas: "Редактирование Схемы",
      categoryPan: "Выделение и Навигация",
      closeBtn: "Закрыть",
      escHint: "Esc для закрытия",
      keys: {
        ctrlS: "Сохранить локальную копию проекта",
        ctrlEnter: "Запустить активный поток выполнения",
        ctrlK: "Открыть палитру команд и поиска",
        ctrlZ: "Отменить последнее действие",
        ctrlY: "Вернуть отмененное действие",
        ctrlD: "Дублировать выбранный узел",
        delete: "Удалить выбранные элементы",
        escape: "Снять выделение / закрыть окна",
        space: "Свободное перемещение по холсту",
        shiftDrag: "Выделение рамкой нескольких карт",
        shiftClick: "Мультивыбор отдельных узлов"
      }
    },
    zh: {
      title: "键盘快捷键",
      subtitle: "专为高级开发者设计的画布快捷指令与高频触发器",
      categoryGeneral: "全局基础指令",
      categoryCanvas: "画布编辑指令",
      categoryPan: "导航与框选操作",
      closeBtn: "关闭助手",
      escHint: "按 Esc 退出",
      keys: {
        ctrlS: "保存当前项目到本地快照",
        ctrlEnter: "立即执行并流式运转当前管道",
        ctrlK: "唤出全能命令面板 / 跳转节点",
        ctrlZ: "撤销上一步连接或位移",
        ctrlY: "重做撤销的连接或位移",
        ctrlD: "一键复制当前高亮节点",
        delete: "删除当前选中的节点和边线",
        escape: "清除选择状态 / 关闭悬浮窗",
        space: "按住空格键并拖拽以平移画布",
        shiftDrag: "按住 Shift 框选多组节点卡片",
        shiftClick: "按住 Shift 单选多组独立节点"
      }
    }
  }[currentLang];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-950/85 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl z-10 flex flex-col max-h-[90vh]"
          >
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-slate-850 bg-slate-950/40 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-1.5 bg-purple-500/10 rounded-xl border border-purple-500/20">
                  <Keyboard className="text-purple-400" size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-100 uppercase tracking-widest">{t.title}</h3>
                  <p className="text-[10px] text-slate-500 font-bold">{t.subtitle}</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="text-slate-500 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-850 cursor-pointer transition-all"
              >
                <X size={15} />
              </button>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1 divide-y divide-slate-850/50">
              
              {/* Category: General */}
              <div className="space-y-3 first:pt-0">
                <h4 className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-widest">{t.categoryGeneral}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { shortcut: "Ctrl + S", label: t.keys.ctrlS },
                    { shortcut: "Ctrl + Enter", label: t.keys.ctrlEnter },
                    { shortcut: "Ctrl + K", label: t.keys.ctrlK },
                  ].map((sc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/30 border border-slate-850/50 rounded-xl">
                      <span className="text-[11px] text-slate-300 font-medium">{sc.label}</span>
                      <kbd className="px-2 py-0.5 rounded-lg border border-slate-800 bg-slate-900 text-[9.5px] font-mono text-slate-400 font-black shrink-0 ml-2">
                        {sc.shortcut}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category: Canvas */}
              <div className="space-y-3 pt-4">
                <h4 className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-widest">{t.categoryCanvas}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { shortcut: "Ctrl + Z", label: t.keys.ctrlZ },
                    { shortcut: "Ctrl + Y", label: t.keys.ctrlY },
                    { shortcut: "Ctrl + D", label: t.keys.ctrlD },
                    { shortcut: "Del / Backspace", label: t.keys.delete },
                    { shortcut: "Escape", label: t.keys.escape },
                  ].map((sc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/30 border border-slate-850/50 rounded-xl">
                      <span className="text-[11px] text-slate-300 font-medium">{sc.label}</span>
                      <kbd className="px-2 py-0.5 rounded-lg border border-slate-800 bg-slate-900 text-[9.5px] font-mono text-purple-400 font-black shrink-0 ml-2">
                        {sc.shortcut}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category: Navigation & Selection */}
              <div className="space-y-3 pt-4">
                <h4 className="text-[9.5px] font-extrabold text-slate-500 uppercase tracking-widest">{t.categoryPan}</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {[
                    { shortcut: "Space + Drag", label: t.keys.space },
                    { shortcut: "Shift + Drag", label: t.keys.shiftDrag },
                    { shortcut: "Shift + Click", label: t.keys.shiftClick },
                  ].map((sc, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-slate-950/30 border border-slate-850/50 rounded-xl">
                      <span className="text-[11px] text-slate-300 font-medium">{sc.label}</span>
                      <kbd className="px-2 py-0.5 rounded-lg border border-slate-800 bg-slate-900 text-[9.5px] font-mono text-sky-400 font-black shrink-0 ml-2">
                        {sc.shortcut}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-850 bg-slate-950 flex items-center justify-between">
              <span className="text-[9px] text-slate-550 font-semibold font-mono uppercase tracking-wider">{t.escHint}</span>
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer text-[11px] font-bold px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 rounded-xl transition-all"
              >
                {t.closeBtn}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
