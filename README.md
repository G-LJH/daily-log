# Daily Log

Daily Log 是一个本地运行的每日记录工具。它适合用来记录工作日志、学习笔记、当天想法和截图素材。

数据默认保存在你自己的电脑上：文字记录写入 SQLite，图片保存到本地文件夹；需要备份或整理时，可以手动导出 Markdown。

## 特性

- 按日期创建和查看每日记录
- 支持编辑已经保存的记录
- 左侧历史列表可快速切换日期
- 支持直接粘贴截图或图片
- 支持导出单日、本月或全部 Markdown
- 支持 macOS 和 Windows 双击启动
- 数据本地存储，不依赖云服务或登录账号

## 快速开始

确保已经安装 Node.js，然后运行：

```bash
npm install
npm start
```

打开浏览器访问：

```text
http://localhost:3000
```

## 双击启动

### macOS

双击：

```text
Daily Log.command
```

第一次启动时会自动安装依赖，然后启动本地服务并打开浏览器。

### Windows

双击：

```text
Daily Log.bat
```

第一次启动时会自动安装依赖，然后启动本地服务并打开浏览器。

启动后请保持终端或命令行窗口打开；关闭窗口会停止本地服务。

## 使用方式

1. 选择日期，默认是当天。
2. 在输入框里写下记录内容。
3. 如需添加图片，可以直接粘贴截图或图片。
4. 点击保存。
5. 需要修改时，点击记录旁边的编辑。
6. 需要备份时，选择导出单日、本月或全部 Markdown。

## 数据与隐私

Daily Log 默认只在本地运行，不会主动上传你的记录。

本地数据位置：

```text
data/daily-log.db
data/uploads/YYYY/MM/
exports/markdown/YYYY/YYYY-MM-DD.md
exports/markdown/YYYY/YYYY-MM.md
```

说明：

- `data/daily-log.db` 是 SQLite 数据库，也是主数据源。
- `data/uploads/` 保存粘贴的图片文件。
- `exports/markdown/` 保存手动导出的 Markdown 文件，按年份分目录。
- Markdown 只是导出结果，不会自动同步回数据库。

仓库中的 `.gitignore` 默认排除了 `data/`、`exports/`、`node_modules/` 和日志文件，避免把个人数据提交到 GitHub。

## 项目结构

```text
daily-log/
├── public/                 # 前端页面、样式和交互逻辑
├── server/                 # Express 服务、数据库和导出逻辑
├── tests/                  # 自动测试
├── data/                   # 本地数据库和图片，默认不提交
├── exports/                # Markdown 导出结果，默认不提交
├── Daily Log.command       # macOS 启动器
├── Daily Log.bat           # Windows 启动器
├── package.json
└── README.md
```

## 开发

启动开发服务：

```bash
npm run dev
```

运行测试：

```bash
npm test
```

当前测试覆盖：

- 健康检查接口
- 创建、读取和编辑记录
- 日期列表
- 图片记录
- 单日、本月和全部 Markdown 导出
- 日期和内容校验

## 适用场景

Daily Log 更适合个人本地使用，而不是多人协作系统。它刻意不包含登录、云同步、权限管理和在线部署逻辑。

如果你想要一个轻量、可控、可以导出 Markdown 的本地日志工具，它就是为这个场景准备的。
