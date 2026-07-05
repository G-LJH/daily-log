# Daily Log

一个本地每日记录工具。数据保存在 SQLite 里，需要时可以手动导出 Markdown。

## 功能

- 快速保存每日记录
- 按日期查看当天记录
- 在左侧历史列表查看之前的记录
- 编辑已保存的记录
- 支持粘贴图片，保存后和记录一起展示
- 按月份手动导出 Markdown，导出全部时也是每个月一个文件
- 支持 macOS 双击启动
- 支持 Windows 双击启动

## 从终端启动

```bash
npm install
npm start
```

然后打开：

```text
http://localhost:3000
```

## 在 macOS 上双击启动

双击这个文件：

```text
Daily Log.command
```

启动器会在需要时安装依赖，启动本地服务，并打开：

```text
http://localhost:3000
```

使用时保持 Terminal 窗口开着；关闭窗口就相当于停止工具。

## 在 Windows 上双击启动

双击这个文件：

```text
Daily Log.bat
```

启动器会在需要时安装依赖，启动本地服务，并打开：

```text
http://localhost:3000
```

使用时保持命令行窗口开着；关闭窗口就相当于停止工具。

## 数据位置

- SQLite 数据库：`data/daily-log.db`
- 图片文件：`data/uploads/YYYY/MM/`
- 月度 Markdown 导出文件：`exports/markdown/YYYY/YYYY-MM.md`
- 单日 Markdown 导出文件：`exports/markdown/YYYY/MM/YYYY-MM-DD.md`

SQLite 是主数据源。图片保存在本地文件夹，数据库只记录图片路径。Markdown 只是手动导出的备份文件，不会自动生成。

## 使用方式

1. 选择日期，默认是今天。
2. 在文本框里输入内容。
3. 可以直接把截图或图片粘贴到文本框里，保存前会显示预览。
4. 点击 `保存`。
5. 如果写错了，点击记录旁边的 `编辑`。
6. 想查看以前的记录，点击左侧历史日期。
7. 需要备份时，选择月份后点击 `导出本月 Markdown`；点击 `导出全部` 会按月份生成多个 Markdown 文件。

## 验证

运行自动测试：

```bash
npm test
```

手动检查：

1. 启动工具。
2. 保存一条记录。
3. 粘贴一张图片并保存。
4. 编辑这条记录。
5. 点击左侧历史日期，确认能查看之前的记录。
6. 选择月份，点击 `导出本月 Markdown`。
7. 确认 `exports/markdown/YYYY/YYYY-MM.md` 出现 Markdown 文件。

## 备注

第一版暂不包含登录、云同步、AI、标签、搜索和删除。
