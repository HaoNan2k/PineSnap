"use client";

import {
  Check,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
} from "lucide-react";

const libraryCards = [
  {
    id: 1,
    title: "白桦林集",
    tag: "林业",
    date: "2023年10月",
    progress: 80,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDYxnuwY7Z5JKsp5b0y_SWyscJe_O65Gd7jNZd8fLp5cQKCdLTxcUDZVoYVwaXNJ9j7BhYCeuvgfbt7_oaAZWRN4AZ9ho5qkL1R3QnaqzA4GqKpWTdVGNEUygpcn-33MZeODiJPsflKQZWxyNqlJmG2hJjcNjwQnIrD2Lh2rkRWJkDfUfVR15OWagixAB2teEToy8QIp9r4LLF95cRllnim7tozTrMlSLakClN3_HyMh4w1CGvhuu86VVUg9Z35bopzSGVJneVcA18q",
  },
  {
    id: 2,
    title: "苔藓纹理",
    tag: "摄影",
    date: "2023年9月",
    progress: 45,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCsn4YmlBF4GO_al7MTdc2k__vPQ5rUY9B_S9sr6dKhwQSU8Pa2qSwHgGFdVr9q1l4alNXIURylS_VMjWoJ-dBom8SoawrI7LJW94uhriYddIlwb6n3rhVXTX9mXonuoeCQsatb7VqR0zFBqoKTwMp_0G8ac-0-Ql7U3p295bN9ttujbw2GooMAdY0E-zTtxTpZn7-eCO7UaHIyl5uE3rThmYBXoYRLDk4IOJvM-nwucM4WEy57IXTBDHp0v87KtxGYtgzlrEi1u4B8",
  },
  {
    id: 3,
    title: "北欧光影",
    tag: "设计",
    date: "2023年8月",
    progress: 100,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCV9gek8R_aqrchOZFWIBzCQQFRWf9IRF8Y3sPgobzUaVBYmWHh5VPh15uvPhrRME843iuqyJoK6-LyrGfk8vt_x9XBA1EIip_9HLne4RaWEfGN2ad4hXWCW9acRiD-qpU9X4Sk1TCuLAGjeaJrxRHrnUJXhExLk_v7M1ay3Eag8D86NevSj7fd7k48xFWcuzBmgm03msFkAqb6o7GR8moULNtuAHKK0ajiG2sp-2sueRkkie7bWFOHpw9PGU1nStdRjhg05JCJ2b0r",
  },
  {
    id: 4,
    title: "林间暗影",
    tag: "随笔",
    date: "2023年7月",
    progress: 20,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuAm8sRSoiu0s-h0FOpWhGhmJZ0V6shkuIN2G-NFfdKsVdyJyNrDlc7fLi-fppb_GL2xke_Jl4hBxMKPzLO3xZ0MtZbLNj0TyywmNCRJ1GzxyTYg_xIpl4bQEUO2WJQBJgUOVHQrYhwZ6-R9mg1qGKCsoNTi8kLFGVT43IaQvs4vWSnSP7x4dyA1QKbCP3n6zpJLMdx3Q-qhP_gAxbjNCsRPpwnZnrDO4A2GeLO7QdPPMP-enfoFTn5IBKJA4iDBGyH2dpObhxVTmf8E",
  },
  {
    id: 5,
    title: "冬日生长",
    tag: "林业",
    date: "2023年6月",
    progress: 60,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuA79cEwKqVYXmKcBtkItOVu9piQOeDa8ceDhUcB7Q0N9Vj44wa77TPrFlpS4lOoN-mV-cfeS7M5yN9PzGOxHam3qVOxkfDXl7yaP8ql4bfWHb0ho6wAepwaxu9JiWZ7asBxr3pvRx1adn2BABGBlEshVZAxvNOSQBzFfXs6KE1O_ir2H2U4iExbu9iKasEaNa7P2krWFWYzJCoYCz-RzSvIk769k87Hp4ebs10tLOgkpa_klJCDcI4-C9aO9JE4FbXZYL4pphXk7Pcy",
  },
  {
    id: 6,
    title: "根系探秘",
    tag: "科学",
    date: "2023年5月",
    progress: 10,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDHPPAjJWtkCCd4v2eQc5Rpr6X8Htt4EwVTvHPxdxemHIks3xOpq4oi-WtZf5msZ6xn9VM5lXHNESI1_etd2Cb7w-Ord6fwaKGO55HYPODSp0LHmABHHAqtwmkNtxhc76QGluyYpJ9Y-0i0gFUTA_xDVrHgzINOoOgAf1QM1-HNl0KVZWskBvc2aQuY8yv-2Fjq39uRg1ebx78y29wmaDI_SykuHvUYDFFxbeQHmtZNeOR6JOsuTIU7PcqgB_iNjxWi1dHqx-YRWEkE",
  },
  {
    id: 7,
    title: "云雾松林",
    tag: "摄影",
    date: "2023年4月",
    progress: 95,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuCFL23RsEQurcV3yCYX3T6YQdvgBKk0XOTNIgXcDDpR1VNtgQ80p1TEheQtD2Mj3r58bwfqAtint9KtwVO043bQVbQLsPd-qIQbO7KOSoN869fzjrt2jIvkA7j7jj62F3lgIV3THSLaHEWRvn_P7pFg13n1uyGqYfohYpiV15q0ikGnG55rUSu555YVGcvgqMiHrY20b6zjjGtTLbVVN318-dcA1G-VxR2NGPlaPJWURVMiT-VPDKnJ0zgI-emgUIxHK9VEYe098xP_",
  },
  {
    id: 8,
    title: "苔原植物",
    tag: "植物学",
    date: "2023年3月",
    progress: 30,
    img: "https://lh3.googleusercontent.com/aida-public/AB6AXuDV21RKgJ-qY-JYcHF6JZ6AIha8beZDLJzE8s9pJY6mrC-vdPd3WQQmmH0VL1voZKLxQqw3k32ZrrO51ImRDa4dE4T9qyYbxrTX6RJypJa1f9T5BEln1xHEpzZq9XTEoikEjiPyNE2Ef6FUwsaRwtZHK-J9Mydz3HCMX6H0_4w15oOY8RYv2HB3Pq8iqsoxB9YpVyLahSEjTfGUVp9oOESsKuVIfNoNupBfeW_ScdG4emRE_xBJ6R5k47dYrr8zbQeAJL8Bx0A3fOs8",
  },
];

const filterTabs = ["全部", "摄影", "随笔", "林业", "设计"];

export default function NotesPage() {
  return (
    <div className="flex-1 px-12 py-12 flex flex-col gap-8">
      {/* Header Section */}
      <header className="flex flex-wrap items-end justify-between gap-6">
        <div className="flex flex-col gap-2">
          <h2 className="font-serif text-5xl font-normal text-primary dark:text-white">
            知识
          </h2>
          <p className="text-forest-muted font-sans text-sm tracking-wide">
            记录你学习后的产出与结论
          </p>
          <p className="text-[11px] text-forest-muted/70 mt-2">
            说明：当前为示例内容，实际数据尚未接入
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="relative min-w-[320px]">
            <Search className="h-5 w-5 absolute left-4 top-1/2 -translate-y-1/2 text-forest-muted" aria-hidden />
            <input
              className="w-full bg-sand/10 dark:bg-white/5 border-none focus:ring-1 focus:ring-primary rounded-xl pl-12 pr-4 py-3 text-sm placeholder:text-forest-muted/60 placeholder:font-medium"
              placeholder="搜索知识..."
              type="text"
            />
          </div>
          <button
            className="bg-primary text-white size-12 rounded-xl flex items-center justify-center hover:opacity-90 transition-opacity"
            aria-label="添加新内容"
          >
            <Plus className="h-5 w-5" aria-hidden />
          </button>
        </div>
      </header>

      {/* Filter Chips */}
      <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
        {filterTabs.map((label, idx) => (
          <button
            key={label}
            className={`flex h-10 shrink-0 items-center justify-center gap-x-2 rounded-full px-6 text-sm font-medium transition-colors ${
              idx === 0
                ? "bg-primary text-white"
                : "bg-sand/20 dark:bg-white/10 text-[#131614] dark:text-white hover:bg-sand/30"
            }`}
          >
            {idx === 0 && (
              <Check className="h-4 w-4" aria-hidden />
            )}
            {label}
          </button>
        ))}
      </div>

      {/* Library Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {libraryCards.map((card) => (
          <button
            type="button"
            key={card.id}
            className="group flex flex-col gap-4 border border-gray-100 dark:border-gray-800 p-3 rounded-2xl hover:border-sand transition-all bg-white dark:bg-card cursor-pointer text-left"
          >
            <div
              className="relative w-full aspect-[4/5] bg-center bg-cover rounded-xl overflow-hidden shadow-sm"
              style={{ backgroundImage: `url("${card.img}")` }}
            >
              <div className="absolute inset-0 bg-primary/5 group-hover:bg-transparent transition-colors" />
              {card.progress === 100 && (
                <div className="absolute top-4 right-4 bg-primary text-white size-8 rounded-full flex items-center justify-center">
                  <Check className="h-4 w-4" aria-hidden />
                </div>
              )}
            </div>
            <div className="px-2 pb-2">
              <h3 className="font-serif text-xl font-normal mb-1">
                {card.title}
              </h3>
              <div className="flex justify-between items-center text-[11px] text-forest-muted font-bold uppercase tracking-wider mb-3">
                <span>{card.date}</span>
                <span className="bg-sand/30 px-2 py-0.5 rounded text-primary">
                  {card.tag}
                </span>
              </div>
              <div className="w-full bg-gray-100 dark:bg-gray-800 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{ width: `${card.progress}%` }}
                />
              </div>
              <p className="text-[10px] text-forest-muted mt-2">
                {card.progress === 100
                  ? "已完成"
                  : `学习进度: ${card.progress}%`}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* Footer Pagination */}
      <footer className="mt-12 mb-8 border-t border-gray-100 dark:border-gray-800 pt-8 flex items-center justify-between">
        <p className="text-forest-muted text-xs font-medium">
          显示 8 / 42 条知识
        </p>
        <div className="flex gap-2">
          <button className="bg-sand/10 hover:bg-sand/20 size-10 rounded-lg flex items-center justify-center transition-colors">
            <ChevronLeft className="h-5 w-5 text-primary" aria-hidden />
          </button>
          <button className="bg-primary text-white size-10 rounded-lg flex items-center justify-center font-bold text-sm">
            1
          </button>
          <button className="bg-sand/10 hover:bg-sand/20 size-10 rounded-lg flex items-center justify-center font-medium text-sm transition-colors">
            2
          </button>
          <button className="bg-sand/10 hover:bg-sand/20 size-10 rounded-lg flex items-center justify-center font-medium text-sm transition-colors">
            3
          </button>
          <button className="bg-sand/10 hover:bg-sand/20 size-10 rounded-lg flex items-center justify-center transition-colors">
            <ChevronRight className="h-5 w-5 text-primary" aria-hidden />
          </button>
        </div>
      </footer>
    </div>
  );
}
