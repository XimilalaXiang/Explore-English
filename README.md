# Awesome English 🚀

<p align="center">
  <strong>智能英文单词学习助手 - 探索单词的意义与形态</strong>
</p>

<p align="center">
  <a href="https://awesome-english.vercel.app">在线体验</a> •
  <a href="#功能特性">功能特性</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#技术栈">技术栈</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Tailwind-4-06B6D4?style=flat-square&logo=tailwindcss" alt="Tailwind CSS">
</p>

## ✨ 功能特性

### 🔍 智能单词分析
输入任意英文单词，AI 将为你找到两类相关词汇：

- **意思相似 (Semantic)**：语义相近的同义词，附带中文释义
- **拼写相似 (Visual)**：外形相似的单词，帮助区分易混淆词汇

### 🎨 优雅的用户体验
- 现代化的 UI 设计，简洁直观
- 支持深色/浅色主题切换
- 响应式布局，完美适配各种设备
- 流畅的加载动画

### 💾 便捷功能
- **搜索历史**：自动保存搜索记录，快速回顾
- **一键复制**：轻松复制搜索结果
- **自定义 API**：支持配置任意 OpenAI 兼容的 API

## 🚀 快速开始

### 环境要求
- Node.js 18+
- pnpm (推荐) / npm / yarn

### 本地开发

```bash
# 克隆项目
git clone https://github.com/XimilalaXiang/Explore-English.git
cd Explore-English

# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

打开 [http://localhost:3000](http://localhost:3000) 查看应用。

### 配置 API

1. 点击右上角 **设置** 按钮
2. 填入你的 API URL 和 API Key
3. 点击 **获取模型列表** 选择模型
4. 保存设置后即可开始使用

> 💡 支持 OpenAI 官方 API 及所有兼容接口

## 🛠 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | [Next.js 16](https://nextjs.org/) (App Router) |
| UI | [React 19](https://react.dev/) + [TypeScript 5](https://www.typescriptlang.org/) |
| 样式 | [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) |
| AI | [Vercel AI SDK](https://sdk.vercel.ai/) |
| 部署 | [Vercel](https://vercel.com/) |

## 📁 项目结构

```
Explore-English/
├── app/
│   ├── api/
│   │   └── find-words/      # 单词查询 API
│   ├── settings/            # 设置页面
│   ├── layout.tsx           # 根布局
│   ├── page.tsx             # 首页
│   └── globals.css          # 全局样式
├── components/
│   ├── ui/                  # shadcn/ui 组件
│   ├── theme-provider.tsx   # 主题提供者
│   └── theme-toggle.tsx     # 主题切换按钮
├── lib/
│   └── utils.ts             # 工具函数
├── public/                  # 静态资源
└── styles/                  # 额外样式
```

## 🌐 部署

项目已部署在 Vercel：[https://awesome-english.vercel.app](https://awesome-english.vercel.app)

### 自行部署

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/XimilalaXiang/Explore-English)

## 📄 许可证

MIT License © 2025

---

<p align="center">
  Made with ❤️ for English learners
</p>
