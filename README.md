# Chat UI Deployment Guide

这是一个基于 Next.js 的 AI 聊天界面，支持 OpenAI 格式的 API，并具备视觉模型支持。

## 功能特点

- **自定义 API**: 支持配置 OpenAI 格式的 API Endpoint 和 Key。
- **模型管理**: 自动获取模型列表，支持手动编辑模型属性（如开启“视觉”能力、修改分组）。
- **视觉支持**: 支持上传图片进行多模态对话（需在模型编辑中开启“视觉”）。
- **Markdown 渲染**: 完美支持 Markdown 格式回复，包括文内图片显示。

## 部署方法

### 方式一：Docker 部署 (推荐)

确保服务器已安装 Docker 和 Docker Compose。

1. 在当前目录运行：
   ```bash
   docker-compose up -d --build
   ```
2. 访问 `http://服务器IP:3000`。

### 方式二：手动运行

1. 进入 web 目录：
   ```bash
   cd web
   ```
2. 安装依赖：
   ```bash
   npm install
   ```
3. 启动开发服务器：
   ```bash
   npm run dev
   ```
4. 或构建生产版本：
   ```bash
   npm run build
   npm start
   ```

## 使用说明

1. 打开页面后，点击左下角的 **设置**。
2. 输入你的 API Base URL (例如 `https://api.openai.com`) 和 API Key。
3. 保存后，左侧会自动刷新模型列表。
4. 如果某个模型支持生图/识图但未自动识别，点击该模型右侧的 **编辑图标** (鼠标悬停显示)，手动开启 **"视觉"** 能力。
5. 开启视觉后，输入框左侧会出现图片上传按钮。

