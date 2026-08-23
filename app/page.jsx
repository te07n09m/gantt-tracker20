'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  FolderPlus,
  Trash2,
  Calendar,
  Layers,
  MoreVertical,
  Download,
  Upload,
  Edit2,
  X,
} from 'lucide-react';

export default function Home() {
  const [projects, setProjects] = useState([]);
  const [projectRanges, setProjectRanges] = useState({});
  const [newProjectName, setNewProjectName] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // 編集モーダル用 State
  const [editingProject, setEditingProject] = useState(null);
  const [editProjectName, setEditProjectName] = useState('');

  // 3点リーダーメニュー用 State
  const [openMenuProjectId, setOpenMenuProjectId] = useState(null);

  // ファイル読み込み用 Ref
  const fileInputRef = useRef(null);

  // ローカルストレージからの読み込み＆タスク期間の計算
  const loadProjectsAndRanges = () => {
    const savedProjects = localStorage.getItem('gantt_tracker_projects');
    if (savedProjects) {
      try {
        const parsedProjects = JSON.parse(savedProjects);
        setProjects(parsedProjects);

        // 各プロジェクトのタスクから全体期間を計算
        const ranges = {};
        parsedProjects.forEach((p) => {
          const taskData = localStorage.getItem(`gantt_tracker_tasks_${p.id}`);
          if (taskData) {
            try {
              const tasks = JSON.parse(taskData);
              if (tasks.length > 0) {
                const startDates = tasks.map((t) => t.startDate).filter(Boolean);
                const endDates = tasks.map((t) => t.endDate).filter(Boolean);

                if (startDates.length > 0 && endDates.length > 0) {
                  const minStart = startDates.reduce((min, d) => (d < min ? d : min));
                  const maxEnd = endDates.reduce((max, d) => (d > max ? d : max));

                  // YYYY-MM-DD -> YYYY/MM/DD フォーマット調整
                  const formatStr = (str) => str.replace(/-/g, '/');
                  ranges[p.id] = `${formatStr(minStart)} 〜 ${formatStr(maxEnd)}`;
                }
              }
            } catch (e) {
              console.error(e);
            }
          }
        });
        setProjectRanges(ranges);
      } catch (e) {
        console.error(e);
      }
    }
  };

  useEffect(() => {
    loadProjectsAndRanges();
  }, []);

  // 保存処理
  const saveProjects = (updatedProjects) => {
    setProjects(updatedProjects);
    localStorage.setItem('gantt_tracker_projects', JSON.stringify(updatedProjects));
  };

  // プロジェクト作成
  const handleCreateProject = (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const newProject = {
      id: Date.now().toString(),
      name: newProjectName.trim(),
      createdAt: new Date().toISOString(),
    };

    saveProjects([...projects, newProject]);
    setNewProjectName('');
    setIsCreateModalOpen(false);
  };

  // プロジェクト名編集の開始
  const handleStartEdit = (project) => {
    setEditingProject(project);
    setEditProjectName(project.name);
    setOpenMenuProjectId(null);
  };

  // プロジェクト名編集の保存
  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!editProjectName.trim() || !editingProject) return;

    const updatedProjects = projects.map((p) =>
      p.id === editingProject.id ? { ...p, name: editProjectName.trim() } : p
    );

    saveProjects(updatedProjects);
    setEditingProject(null);
  };

  // プロジェクト削除
  const handleDeleteProject = (id, name) => {
    if (!confirm(`「${name}」を削除しますか？\n（関連するタスクデータもすべて削除されます）`)) return;

    const updatedProjects = projects.filter((p) => p.id !== id);
    saveProjects(updatedProjects);
    localStorage.removeItem(`gantt_tracker_tasks_${id}`);
    setOpenMenuProjectId(null);
  };

  // バックアップのエクスポート (JSON出力)
  const handleExportBackup = () => {
    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      projects: projects,
      tasks: {},
    };

    // 全プロジェクトのタスクデータを抽出
    projects.forEach((p) => {
      const taskData = localStorage.getItem(`gantt_tracker_tasks_${p.id}`);
      if (taskData) {
        try {
          backupData.tasks[p.id] = JSON.parse(taskData);
        } catch (e) {
          console.error(e);
        }
      }
    });

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gantt_tracker_backup_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // バックアップのインポート (ファイル読み込み)
  const handleImportBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result);

        if (!data.projects || !Array.isArray(data.projects)) {
          alert('不正なバックアップファイルフォーマットです。');
          return;
        }

        if (!confirm('現在のデータを上書きしてバックアップを読み込みますか？')) return;

        // データ保存
        localStorage.setItem('gantt_tracker_projects', JSON.stringify(data.projects));
        if (data.tasks) {
          Object.keys(data.tasks).forEach((pId) => {
            localStorage.setItem(
              `gantt_tracker_tasks_${pId}`,
              JSON.stringify(data.tasks[pId])
            );
          });
        }

        loadProjectsAndRanges();
        alert('バックアップの読み込みが完了しました。');
      } catch (err) {
        alert('ファイルの読み込みに失敗しました。');
        console.error(err);
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // リセット
  };

  return (
    <div
      className="min-h-screen bg-gray-50 text-gray-800 flex flex-col"
      onClick={() => setOpenMenuProjectId(null)}
    >
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-10 shadow-sm">
        <h1 className="font-bold text-xl text-gray-900 flex items-center gap-2">
          <Layers className="w-6 h-6 text-blue-600" />
          プロジェクト
        </h1>

        <div className="flex items-center gap-2">
          {/* バックアップ操作 */}
          <button
            onClick={handleExportBackup}
            title="データを書き出す"
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            title="データを復元する"
            className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Upload className="w-4 h-4" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBackup}
            accept=".json"
            className="hidden"
          />

          {/* 新規プロジェクト追加 */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-1.5 bg-blue-600 text-white text-xs px-3.5 py-2 rounded-full font-medium hover:bg-blue-700 active:scale-95 transition-transform ml-1"
          >
            <FolderPlus className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6">
        {projects.length === 0 ? (
          <div className="bg-white border border-dashed border-gray-300 rounded-2xl p-8 text-center my-12">
            <div className="w-12 h-12 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-3">
              <FolderPlus className="w-6 h-6" />
            </div>
            <h2 className="text-base font-semibold text-gray-900 mb-1">
              プロジェクトがありません
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              新しいプロジェクトを作成してガントチャートを開始しましょう
            </p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 text-white text-xs px-4 py-2 rounded-full font-medium hover:bg-blue-700 transition-colors"
            >
              プロジェクトを作成
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Link
                      href={`/projects/${project.id}`}
                      className="font-semibold text-gray-900 hover:text-blue-600 text-base truncate flex-1"
                    >
                      {project.name}
                    </Link>

                    {/* 3点リーダーメニュー */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuProjectId(
                            openMenuProjectId === project.id ? null : project.id
                          );
                        }}
                        className="p-1 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {openMenuProjectId === project.id && (
                        <div
                          className="absolute right-0 top-7 z-20 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleStartEdit(project)}
                            className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-gray-700 hover:bg-gray-50"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-gray-500" />
                            名前の変更
                          </button>
                          <button
                            onClick={() => handleDeleteProject(project.id, project.name)}
                            className="w-full px-3 py-1.5 text-left flex items-center gap-2 text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            削除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* プロジェクト全体の期間を表示 */}
                  <p className="text-[11px] text-gray-500 flex items-center gap-1 font-medium">
                    <Calendar className="w-3 h-3 text-gray-400" />
                    期間: {projectRanges[project.id] || 'タスクなし'}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* 新規プロジェクト作成モーダル */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">新規プロジェクト</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleCreateProject}>
              <input
                type="text"
                placeholder="プロジェクト名を入力..."
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* プロジェクト名編集モーダル */}
      {editingProject && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 text-sm">プロジェクト名の変更</h3>
              <button
                onClick={() => setEditingProject(null)}
                className="text-gray-400 hover:text-gray-600 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <input
                type="text"
                value={editProjectName}
                onChange={(e) => setEditProjectName(e.target.value)}
                autoFocus
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
