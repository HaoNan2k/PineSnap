export default function LearningPage() {
  return (
    <div className="flex-1 px-12 py-12 flex flex-col gap-8">
      {/* Header Section */}
      <header className="flex flex-wrap items-end justify-between gap-6 pb-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-5xl font-normal text-primary dark:text-white">
            学习
          </h2>
          <p className="text-forest-muted font-sans text-sm tracking-wide">
            管理你的学习过程与进度
          </p>
        </div>
      </header>

      <div className="flex flex-col items-center justify-center gap-4 py-24 text-forest-muted">
        <span className="material-symbols-rounded text-6xl opacity-30">
          school
        </span>
        <p className="text-lg">学习功能开发中</p>
        <p className="text-sm">这里将展示你的学习任务与进度</p>
      </div>
    </div>
  );
}
