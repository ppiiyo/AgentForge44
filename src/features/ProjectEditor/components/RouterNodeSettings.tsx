import React from 'react';
import { RouterCondition, FlowNode } from '../../../types';
import { Plus, Trash, GitBranch, AlertCircle } from 'lucide-react';

interface RouterNodeSettingsProps {
  node: FlowNode;
  nodes: FlowNode[];
  onUpdateField: (nodeId: string, fieldKey: string, value: any) => void;
  currentLang?: 'en' | 'ru' | 'zh';
}

const TRANSLATIONS = {
  en: {
    type: 'Condition Type',
    value: 'Checking Value / Pattern',
    target: 'Target Destination',
    defaultRoute: 'Default Route',
    addCond: 'Add Routing Condition',
    validationEmpty: 'Condition value or target node cannot be empty.',
    path: 'Pathway',
    desc: 'Evaluate previous state and route to targets.'
  },
  ru: {
    type: 'Тип условия',
    value: 'Значение / Шаблон проверки',
    target: 'Целевой узел назначения',
    defaultRoute: 'Маршрут по умолчанию',
    addCond: 'Добавить условие маршрута',
    validationEmpty: 'Значение условия или целевой узел не могут быть пустыми.',
    path: 'Путь',
    desc: 'Оценивает предыдущий вывод и направляет на целевые узлы.'
  },
  zh: {
    type: '条件类型',
    value: '检查值/匹配模式',
    target: '目标接收节点',
    defaultRoute: '默认 fallback 路由',
    addCond: '添加路由分支条件',
    validationEmpty: '条件内容或目标接收节点不能为空。',
    path: '路径分流',
    desc: '根据前序节点的输出数据，动态分流分发到不同的后续任务中。'
  }
};

export const RouterNodeSettings: React.FC<RouterNodeSettingsProps> = ({
  node,
  nodes,
  onUpdateField,
  currentLang = 'en'
}) => {
  if (node.type !== 'router') return null;

  const conditions = node.fields.conditions || [];
  const defaultTargetNodeId = node.fields.defaultTargetNodeId || '';

  const handleAddCondition = () => {
    const newCond: RouterCondition = {
      id: `cond-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: 'contains',
      value: '',
      targetNodeId: '',
      label: `Condition ${conditions.length + 1}`
    };
    onUpdateField(node.id, 'conditions', [...conditions, newCond]);
  };

  const handleUpdateCondition = (condId: string, key: keyof RouterCondition, value: any) => {
    const updated = conditions.map((c: RouterCondition) => 
      c.id === condId ? { ...c, [key]: value } : c
    );
    onUpdateField(node.id, 'conditions', updated);
  };

  const handleDeleteCondition = (condId: string) => {
    const updated = conditions.filter((c: RouterCondition) => c.id !== condId);
    onUpdateField(node.id, 'conditions', updated);
  };

  const text = TRANSLATIONS[currentLang] || TRANSLATIONS.en;

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] text-slate-400 font-semibold mb-2 flex items-center gap-1">
          <GitBranch size={11} className="text-sky-450" />
          {text.desc}
        </p>
      </div>

      <div className="space-y-3">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
          {currentLang === 'ru' ? 'Активные условия маршрутизации' : 'Active Routing Conditions'}
        </label>

        {conditions.length === 0 ? (
          <p className="text-[11px] text-slate-500 italic bg-slate-950 p-3 rounded-xl border border-slate-900 text-center">
            {currentLang === 'ru' ? 'Условия не настроены. Весь трафик пойдет по умолчанию.' : 'No conditions configured. All flows route to default.'}
          </p>
        ) : (
          <div className="space-y-3.5 max-h-72 overflow-y-auto pr-1">
            {conditions.map((cond: RouterCondition, idx: number) => {
              const borderCol = idx === 0 ? 'border-emerald-500/30 bg-emerald-950/5' : idx === 1 ? 'border-purple-500/30 bg-purple-950/5' : 'border-sky-500/30 bg-sky-950/5';
              const textCol = idx === 0 ? 'text-emerald-400' : idx === 1 ? 'text-purple-400' : 'text-sky-400';
              const labelBgStr = idx === 0 ? 'bg-emerald-500/10' : idx === 1 ? 'bg-purple-500/10' : 'bg-sky-500/10';

              const isEmptyError = !cond.value.trim() || !cond.targetNodeId;

              return (
                <div key={cond.id} className={`p-3 rounded-xl border ${borderCol} relative space-y-2.5`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded ${labelBgStr} ${textCol}`}>
                      {text.path} {String.fromCharCode(65 + idx)}
                    </span>
                    <button
                      onClick={() => handleDeleteCondition(cond.id)}
                      className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash size={12} />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase">{text.type}</label>
                    <select
                      value={cond.type}
                      onChange={(e) => handleUpdateCondition(cond.id, 'type', e.target.value)}
                      className="w-full bg-slate-950 border border-slate-900 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none"
                    >
                      <option value="contains">CONTAINS (Простое совпадение)</option>
                      <option value="regex">REGEX (Регулярное выражение)</option>
                      <option value="json_key">JSON_KEY_EXISTS (Dot-notation путь)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase">{text.value}</label>
                    <input
                      type="text"
                      placeholder="e.g. error, ^[0-9]+$, status.success"
                      value={cond.value}
                      onChange={(e) => handleUpdateCondition(cond.id, 'value', e.target.value)}
                      className={`w-full bg-slate-950 border ${!cond.value.trim() ? 'border-rose-900/40 focus:border-rose-500' : 'border-slate-900 focus:border-sky-500/50'} rounded-lg px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none font-mono`}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[9px] font-mono text-slate-500 uppercase">{text.target}</label>
                    <select
                      value={cond.targetNodeId}
                      onChange={(e) => handleUpdateCondition(cond.id, 'targetNodeId', e.target.value)}
                      className={`w-full bg-slate-950 border ${!cond.targetNodeId ? 'border-rose-900/40 focus:border-rose-500' : 'border-slate-900' } rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none`}
                    >
                      <option value="">-- {currentLang === 'ru' ? 'Выберите узел' : 'Select Target'} --</option>
                      {nodes.filter(n => n.id !== node.id).map(n => (
                        <option key={n.id} value={n.id}>↳ {n.title} ({n.type})</option>
                      ))}
                    </select>
                  </div>

                  {isEmptyError && (
                    <div className="text-[9px] text-rose-400 flex items-center gap-1 font-semibold pt-1">
                      <AlertCircle size={10} />
                      <span>{text.validationEmpty}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <button
          onClick={handleAddCondition}
          className="w-full text-xs font-bold py-2 px-3 border border-dashed border-slate-800 hover:border-sky-500/30 text-slate-450 hover:text-sky-300 bg-slate-950/20 hover:bg-sky-950/50 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Plus size={13} />
          <span>{text.addCond}</span>
        </button>
      </div>

      <div className="border-t border-slate-900 pt-3.5 space-y-1.5">
        <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">{text.defaultRoute}</label>
        <select
          value={defaultTargetNodeId}
          onChange={(e) => onUpdateField(node.id, 'defaultTargetNodeId', e.target.value)}
          className="w-full bg-slate-950 border border-slate-900 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none border-amber-500/20 text-slate-200"
        >
          <option value="">-- {currentLang === 'ru' ? 'Без перехода' : 'Terminal / None'} --</option>
          {nodes.filter(n => n.id !== node.id).map(n => (
            <option key={n.id} value={n.id}>↳ {n.title} ({n.type})</option>
          ))}
        </select>
      </div>
    </div>
  );
};
