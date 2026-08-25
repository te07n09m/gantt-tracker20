'use client';

import { useState, useEffect, useMemo, useRef, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Plus,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Circle,
  Trash2,
  Edit2,
  ArrowUp,
  ArrowDown,
  History,
  MoreVertical,
  Check,
} from 'lucide-react';
import TaskModal from '@/app/components/TaskModal';
import TaskLogModal from '@/app/components/TaskLogModal';

const formatDateStr = (date) => date.toISOString().split('T')[0];
const addDays = (date, days) => {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
};

export default function ProjectDetailPage({ params }) {
  const resolvedParams = use(params);
  const projectId = resolvedParams.id;

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [viewLogTask, setViewLogTask] = useState(null);
  const [openMenuTaskId, setOpenMenuTaskId] = useState(null);

  const [centerDate, setCenterDate] = useState(() => new Date());
  const scrollContainerRef = useRef(null);

  const daysList = useMemo(() => {
    const dates = [];
    for (let i = -30; i <= 30; i++) {
      dates.push(addDays(centerDate, i));
    }
    return dates;
  }, [centerDate]);

  const todayStr = useMemo(() => formatDateStr(centerDate), [centerDate]);

  // ページを開いたタイミング（またはプロジェクト読み込み時）で基準日を最新の「今日」に更新する
  useEffect(() => {
    setCenterDate(new Date());
  }, [projectId]);

  useEffect(() => {
    const projectsSaved = localStorage.getItem('gantt_tracker_projects');
    if (projectsSaved) {
      const pList = JSON.parse(projectsSaved);
      const target = pList.find((p) => p.id === projectId);
      if (target) setProject(target);
    }

    const tasksSaved = localStorage.getItem(`gantt_tracker_tasks_${projectId}`);
    if (tasksSaved) {
      try {
        setTasks(JSON.parse(tasksSaved));
      } catch (e) {
        console.error(e);
      }
    }
  }, [projectId]);

  // 今日への自動スクロール
  useEffect(() => {
    if (!project || !scrollContainerRef.current || daysList.length === 0) return;

    const todayIndex = daysList.findIndex((d) => formatDateStr(d) === todayStr);
    if (todayIndex === -1) return;

    const timer = setTimeout(() => {
      if (!scrollContainerRef.current) return;

      const cellWidth = 40;
      const leftColWidth = 72; // 操作列の幅
      const containerWidth = scrollContainerRef.current.clientWidth;
      const scrollPos = todayIndex * cellWidth - (containerWidth - leftColWidth) / 2 + cellWidth / 2;

      scrollContainerRef.current.scrollTo({
        left: Math.max(0, scrollPos),
        behavior: 'smooth',
      });
    }, 150);

    return () => clearTimeout(timer);
  }, [project, daysList, todayStr]);

  const saveTasks = (updated) => {
    setTasks(updated);
    localStorage.setItem(`gantt_tracker_tasks_${projectId}`, JSON.stringify(updated));
  };

  const handleSaveTask = (taskData) => {
    if (editingTask) {
      const updated = tasks.map((t) => (t.id === taskData.id ? { ...t, ...taskData } : t));
      saveTasks(updated);
    } else {
      saveTasks([...tasks, taskData]);
    }
    setEditingTask(null);
  };

  const handleDeleteTask = (id) => {
    if (!confirm('このタスク（およびサブタスク）を削除しますか？')) return;
    const idsToDelete = [id, ...tasks.filter((t) => t.parentId === id).map((t) => t.id)];
    const updated = tasks.filter((t) => !idsToDelete.includes(t.id));
    saveTasks(updated);
  };

  const toggleTaskCompleted = (id) => {
    const updated = tasks.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t));
    saveTasks(updated);
  };

  const toggleLog = (taskId, dateStr) => {
    const updated = tasks.map((t) => {
      if (t.id === taskId) {
        const currentLogs = { ...(t.logs || {}) };
        if (currentLogs[dateStr]) {
          delete currentLogs[dateStr];
        } else {
          currentLogs[dateStr] = true;
        }
        return { ...t, logs: currentLogs };
      }
      return t;
    });
    saveTasks(updated);
  };

  const moveTask = (id, direction) => {
    const targetTask = tasks.find((t) => t.id === id);
    if (!targetTask) return;

    const siblingTasks = tasks.filter((t) => t.parentId === targetTask.parentId);
    const index = siblingTasks.findIndex((t) => t.id === id);

    if (direction === 'up' && index > 0) {
      const swapWith = siblingTasks[index - 1];
      swapTaskPositions(targetTask.id, swapWith.id);
    } else if (direction === 'down' && index < siblingTasks.length - 1) {
      const swapWith = siblingTasks[index + 1];
      swapTaskPositions(targetTask.id, swapWith.id);
    }
  };

  const swapTaskPositions = (id1, id2) => {
    const index1 = tasks.findIndex((t) => t.id === id1);
    const index2 = tasks.findIndex((t) => t.id === id2);

    const updated = [...tasks];
    const temp = updated[index1];
    updated[index1] = updated[index2];
    updated[index2] = temp;

    saveTasks(updated);
  };

  const toggleExpand = (id) => {
    setExpandedTasks((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const rootTasks = useMemo(() => tasks.filter((t) => !t.parentId), [tasks]);
  const getSubtasks = (parentId) => tasks.filter((t) => t.parentId === parentId);

  const getBarColor = (task) => {
    if (task.completed) return 'bg-gray-400 border-gray-500';
    if (task.endDate < todayStr) return 'bg-red-500 border-red-600';
    return 'bg-blue-300 border-blue-400';
  };

  if (!project) {
    return (
      <div className="p-4 text-center text-gray-500">
        読み込み中...
        <div className="mt-2">
          <Link href="/" className="text-blue-600 text-sm">トップへ戻る</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 text-gray-800 flex flex-col overflow-hidden" onClick={() => setOpenMenuTaskId(null)}>
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between z-40 shadow-sm flex-shrink-0">
        <div className="flex items-center gap-2">
          <Link href="/" className="p-1 text-gray-500 hover:text-gray-800 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-semibold text-lg text-gray-900 truncate max-w-[180px]">
            {project.name}
          </h1>
        </div>
        <button
          onClick={() => {
            setEditingTask(null);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-1 bg-blue-600 text-white text-xs px-3 py-1.5 rounded-full font-medium hover:bg-blue-700 active:scale-95 transition-transform"
        >
          <Plus className="w-4 h-4" />
          タスク追加
        </button>
      </header>

      {/* 縦・横スクロールを1つのコンテナに集約 */}
      <div ref={scrollContainerRef} className="flex-1 overflow-auto relative bg-white">
        <div className="min-w-max">
          
          {/* 【固定ヘッダー行】 (sticky top-0 で縦スクロール時に完全固定) */}
          <div className="sticky top-0 z-30 flex bg-gray-50 border-b border-gray-200 h-14">
            {/* 左上「操作」セル (sticky left-0 と top-0 の交差地点で最前面 z-40) */}
            <div className="w-[72px] min-w-[72px] bg-gray-50 border-r border-gray-200 flex items-center justify-center font-medium text-[11px] text-gray-400 sticky left-0 z-40 shadow-[2px_0_5px_rgba(0,0,0,0.03)]">
              操作
            </div>
            
            {/* 右側：日付ヘッダー列 */}
            <div className="flex">
              {daysList.map((d) => {
                const dateStr = formatDateStr(d);
                const isToday = dateStr === todayStr;
                const dayNum = d.getDate();
                const dayOfWeek = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];

                return (
                  <div
                    key={dateStr}
                    className={`w-10 min-w-[40px] flex-shrink-0 flex flex-col items-center justify-center border-r border-gray-100 text-[10px] bg-gray-50 ${
                      isToday ? '!bg-blue-100 text-blue-700 font-bold' : 'text-gray-500'
                    }`}
                  >
                    <span>{dayOfWeek}</span>
                    <span className="text-xs">{dayNum}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 【タスク一覧ボディ】 */}
          <div className="divide-y divide-gray-100">
            {rootTasks.length === 0 && (
              <div className="p-4 text-xs text-gray-400 text-center">タスクがありません</div>
            )}
            {rootTasks.map((task, index) => (
              <TaskRow
                key={task.id}
                task={task}
                subtasks={getSubtasks(task.id)}
                isExpanded={!!expandedTasks[task.id]}
                daysList={daysList}
                todayStr={todayStr}
                getBarColor={getBarColor}
                onToggleExpand={() => toggleExpand(task.id)}
                onToggleCompleted={toggleTaskCompleted}
                onEdit={(t) => {
                  setEditingTask(t);
                  setIsModalOpen(true);
                }}
                onDelete={handleDeleteTask}
                onMove={moveTask}
                onViewLog={(t) => setViewLogTask(t)}
                onToggleLog={toggleLog}
                isFirst={index === 0}
                isLast={index === rootTasks.length - 1}
                openMenuTaskId={openMenuTaskId}
                setOpenMenuTaskId={setOpenMenuTaskId}
              />
            ))}
          </div>
        </div>
      </div>

      {/* フッター */}
      <footer className='min-h-14'></footer>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveTask}
        parentTasks={rootTasks}
        initialData={editingTask}
      />

      <TaskLogModal
        isOpen={!!viewLogTask}
        onClose={() => setViewLogTask(null)}
        task={viewLogTask}
      />
    </div>
  );
}

// 行コンポーネント（操作列 ＋ カレンダー・ガント列を一体化）
function TaskRow({
  task,
  subtasks,
  isExpanded,
  daysList,
  todayStr,
  getBarColor,
  onToggleExpand,
  onToggleCompleted,
  onEdit,
  onDelete,
  onMove,
  onViewLog,
  onToggleLog,
  isFirst,
  isLast,
  openMenuTaskId,
  setOpenMenuTaskId,
  isSub = false,
}) {
  const hasSub = subtasks && subtasks.length > 0;
  const isMenuOpen = openMenuTaskId === task.id;

  const handleMenuClick = (e) => {
    e.stopPropagation();
    setOpenMenuTaskId(isMenuOpen ? null : task.id);
  };

  return (
    <>
      <div className={`h-14 flex relative ${isSub ? 'bg-gray-50/30' : 'bg-white'} ${isMenuOpen ? 'z-30' : 'z-0'}`}>
        
        {/* 【左側：操作列】 (sticky left-0 で横スクロール時に固定) */}
        <div
          className={`w-[72px] min-w-[72px] px-1 flex items-center justify-between text-xs border-r border-gray-200 sticky left-0 z-20 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.03)] ${
            isSub ? 'pl-3 !bg-gray-50' : ''
          }`}
        >
          <div className="flex items-center gap-0.5 z-10">
            {!isSub && (
              <button
                onClick={onToggleExpand}
                className={`p-0.5 text-gray-400 hover:text-gray-600 flex-shrink-0 ${!hasSub && 'opacity-0 cursor-default'}`}
              >
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            )}

            <button
              onClick={() => onToggleCompleted(task.id)}
              className="text-gray-400 hover:text-blue-600 flex-shrink-0 p-0.5"
            >
              {task.completed ? (
                <CheckCircle2 className="w-4 h-4 text-gray-400 fill-gray-100" />
              ) : (
                <Circle className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* 画面上に固定されるタスク名 */}
          <div className="absolute left-[76px] top-1 z-10 pointer-events-none flex flex-col">
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 whitespace-nowrap truncate max-w-[200px] ${
                task.completed ? 'line-through text-gray-400' : 'text-gray-800'
              }`}
            >
              {isSub ? `↳ ${task.title}` : task.title}
            </span>
            <span
              className={`text-[9px] font-semibold px-2 py-0.5 whitespace-nowrap truncate max-w-[200px] ${
                task.completed ? 'line-through text-gray-400' : 'text-gray-800'
              }`}
            >
              {task.startDate} ～ {task.endDate}
            </span>
          </div>

          {/* 3点リーダー */}
          <div className="relative flex-shrink-0 z-20">
            <button
              onClick={handleMenuClick}
              className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
            >
              <MoreVertical className="w-3.5 h-3.5" />
            </button>

            {isMenuOpen && (
              <div
                className="absolute left-6 top-6 z-50 w-36 bg-white rounded-lg shadow-lg border border-gray-100 py-1 text-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1 font-semibold text-gray-800 border-b border-gray-100 truncate">
                  {task.title}
                </div>

                <button
                  onClick={() => {
                    onViewLog(task);
                    setOpenMenuTaskId(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-gray-700 hover:bg-gray-50"
                >
                  <History className="w-3.5 h-3.5 text-blue-600" />
                  過去の記録
                </button>
                <button
                  onClick={() => {
                    onEdit(task);
                    setOpenMenuTaskId(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-gray-700 hover:bg-gray-50"
                >
                  <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                  編集
                </button>

                <div className="border-t border-gray-100 my-0.5" />

                <button
                  disabled={isFirst}
                  onClick={() => {
                    onMove(task.id, 'up');
                    setOpenMenuTaskId(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowUp className="w-3.5 h-3.5 text-gray-500" />
                  上に移動
                </button>

                <button
                  disabled={isLast}
                  onClick={() => {
                    onMove(task.id, 'down');
                    setOpenMenuTaskId(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-gray-700 hover:bg-gray-50 disabled:opacity-30 disabled:hover:bg-transparent"
                >
                  <ArrowDown className="w-3.5 h-3.5 text-gray-500" />
                  下に移動
                </button>

                <div className="border-t border-gray-100 my-0.5" />

                <button
                  onClick={() => {
                    onDelete(task.id);
                    setOpenMenuTaskId(null);
                  }}
                  className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  削除
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 【右側：ガントチャート & トラッカー領域】 */}
        <div className="flex relative flex-1">
          {/* レイヤー1: ガントチャートバー */}
          <div className="absolute inset-0 flex items-center pt-3 pointer-events-none z-0">
            {daysList.map((d) => {
              const dateStr = formatDateStr(d);
              const inRange = dateStr >= task.startDate && dateStr <= task.endDate;
              const isStart = dateStr === task.startDate;
              const isEnd = dateStr === task.endDate;

              if (!inRange) return <div key={dateStr} className="w-10 min-w-[40px]" />;

              return (
                <div key={dateStr} className="w-10 min-w-[40px] h-5 flex items-center">
                  <div
                    className={`h-full w-full ${getBarColor(task)} ${
                      isStart ? 'rounded-l-md' : ''
                    } ${isEnd ? 'rounded-r-md' : ''} opacity-85 shadow-xs`}
                  />
                </div>
              );
            })}
          </div>

          {/* レイヤー2: 記録ボタン */}
          <div className="absolute inset-0 flex pt-3 z-10">
            {daysList.map((d) => {
              const dateStr = formatDateStr(d);
              const isLogged = !!task.logs?.[dateStr];
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={dateStr}
                  onClick={() => onToggleLog(task.id, dateStr)}
                  className={`w-10 min-w-[40px] h-full border-r border-gray-100 flex items-center justify-center transition-colors hover:bg-black/5 active:bg-black/10 ${
                    isToday ? 'bg-blue-50/20' : ''
                  }`}
                >
                  {isLogged && (
                    <div className="w-4 h-4 flex items-center justify-center">
                      <Check strokeWidth={4} className="text-blue-600" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* サブタスク再帰 */}
      {!isSub &&
        isExpanded &&
        subtasks.map((sub, sIdx) => (
          <TaskRow
            key={sub.id}
            task={sub}
            subtasks={[]}
            isExpanded={false}
            daysList={daysList}
            todayStr={todayStr}
            getBarColor={getBarColor}
            onToggleExpand={() => {}}
            onToggleCompleted={onToggleCompleted}
            onEdit={onEdit}
            onDelete={onDelete}
            onMove={onMove}
            onViewLog={onViewLog}
            onToggleLog={onToggleLog}
            isFirst={sIdx === 0}
            isLast={sIdx === subtasks.length - 1}
            openMenuTaskId={openMenuTaskId}
            setOpenMenuTaskId={setOpenMenuTaskId}
            isSub={true}
          />
        ))}
    </>
  );
}
