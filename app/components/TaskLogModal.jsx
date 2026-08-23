'use client';

import { X, Calendar, CheckCircle2 } from 'lucide-react';

export default function TaskLogModal({ isOpen, onClose, task }) {
  if (!isOpen || !task) return null;

  const logs = task.logs || {};
  const loggedDates = Object.keys(logs).sort().reverse(); // 新しい順

  // 総実施日数
  const totalDays = loggedDates.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-sm rounded-2xl p-5 shadow-xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
          <div>
            <h2 className="font-semibold text-gray-900 text-base">{task.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              期間: {task.startDate} ～ {task.endDate}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats */}
        <div className="bg-blue-50 p-3 rounded-xl mb-3 flex items-center justify-between text-blue-900">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-blue-600" />
            <span className="text-xs font-medium">合計実施日数</span>
          </div>
          <span className="text-lg font-bold text-blue-600">{totalDays} 日</span>
        </div>

        {/* Log List */}
        <div className="flex-1 overflow-y-auto pr-1">
          <h3 className="text-xs font-medium text-gray-500 mb-2 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" /> 実施記録履歴 ({loggedDates.length}件)
          </h3>
          {loggedDates.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center">実施記録がまだありません</p>
          ) : (
            <div className="space-y-1.5">
              {loggedDates.map((dateStr) => (
                <div
                  key={dateStr}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-xs"
                >
                  <span className="font-mono text-gray-700">{dateStr}</span>
                  <span className="text-blue-600 font-medium px-2 py-0.5 bg-blue-100 rounded-full text-[10px]">
                    実施済み
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-gray-100 mt-3 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
