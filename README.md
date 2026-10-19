# lrr-queue

给 [LANraragi](https://github.com/Difegue/LANraragi) 用的下载队列服务，附带一个 Web 面板。
把画廊链接批量入队后，服务通过 LRR 的 `download_url` 插件后台下载，记录状态、失败自动重试，并在面板里实时展示。

## 组成

- **队列服务**（`lrr_queue/`）：FastAPI + SQLite。提供入队/查询 HTTP API，后台 worker 对账 LRR minion 任务状态。
- **Web 面板**（`web/`）：Svelte 5 单页，总览 / 任务 / 设置三个视图。
- **用户脚本**（`lanraragi-checker.user.js`）：ExHentai / E-Hentai 查重与选品面板，可把所选链接发送到队列。

## 安装

需要 Python 3.11+；构建面板需要 `pnpm`。

```bash
cp .env.example .env        # 填入 LRR_URL / LRR_KEY
uv venv .venv
uv pip install -e .
./install.sh                # 构建面板 + 安装并重启 systemd 用户服务
```

不装 systemd 时也可直接运行：

```bash
.venv/bin/python -m lrr_queue
```

## 配置

配置全部来自 `.env`（真实环境变量优先）：

| 键 | 默认 | 说明 |
|---|---|---|
| `LRR_URL` | 必填 | LANraragi 地址 |
| `LRR_KEY` | 必填 | LANraragi API Key |
| `APP_PORT` | `29481` | 监听端口（兼容旧名 `HTTP_PORT`） |
| `DB_FILE` | `tasks.db` | SQLite 文件路径 |
| `MAX_CONCURRENT` | `2` | 同时在途的下载任务数 |
| `TICK_INTERVAL_SEC` | `3` |  worker 对账周期 |
| `MIN_SUBMIT_INTERVAL_SEC` | `5` | 两次提交之间的最小间隔 |
| `MAX_ATTEMPTS` | `3` | 单任务最大提交次数 |
| `RETRY_BASE_SEC` / `RETRY_MAX_SEC` | `60` / `1800` | 指数退避区间 |
| `BREAKER_THRESHOLD` | `3` | 永久失败任务达到该数量时自动暂停队列 |
| `LOG_LEVEL` | `INFO` | 日志级别（输出到 stderr） |

## 使用

打开 `http://<主机>:29481`：

- **总览**：各状态计数与队列流水线。
- **任务**：粘贴链接入队、按状态/链接筛选、单条重试/取消/删除、批量重试失败。
- **设置**：服务与 LRR 连通状态、用 urlfinder 核对历史任务。

用 Tampermonkey 安装 [用户脚本](https://raw.githubusercontent.com/slqy123/lrr/main/lanraragi-checker.user.js)，打开 ExHentai / E-Hentai 缩略图列表页。点击顶部 **设置** 填写 LANraragi 地址、API Key 和队列服务器地址（默认 `http://localhost:29481`）。

- 列表页采用统一的导航、搜索筛选、结果工具栏和作品网格；保留原站搜索条件、翻页与作品链接。分类常驻居中，沿用分类色相并适度降低饱和度，高级筛选按需展开，点击搜索统一提交；顶栏的 **队列后台 ↗** 可直接进入队列面板。
- 封面完整显示、不裁切；其下是紧邻的复选框和状态，标题自然显示一至三行，悬浮可查看全文。分类和页数常驻，日期、收藏及下载入口可通过卡片的“···”展开。
- 界面以中性色为主，蓝色用于主要操作和选择；**灰色未收录、青色排队／下载中、绿色已入库、紫色疑似重复、琥珀色等待重试／查询异常、红色下载失败**。具体队列状态可悬浮或点击查看；队列状态每 30 秒刷新，发送成功后立即刷新。
- 批量选择提供“未收录／疑似重复／队列中／已入库”四组及数量，各组可叠加选择；部分选中时点击补齐该组，全部选中后再次点击取消该组。窄桌面下分组收进“按状态选择”面板。
- “全选”包含当前页全部作品（含查询中、查询异常），再次点击取消全部。选中后复选框和标题变为蓝色，底部提供复制和发送操作。发送成功仅清除本次发送的选择，失败保留，结果区分新增与重复数量。
- 队列中、检查中和查询异常的作品不参与“选择未收录”，已入库标记优先。关闭标题搜索后，“未收录”仅表示 URL 未命中。
- 支持紧凑／标准网格密度和随站点／浅色／深色主题；设置保存后自动重新检查，不清空选择。
- 点击 **原站界面** 可退出新版布局；点击原站缩略图列表工具栏的 **美化界面** 可恢复。其他原生列表模式不接管布局，仍通过 LRR 面板使用队列工具。

## HTTP API

用户脚本依赖的兼容接口：

- `POST /add` — `{"urls": [...]}` → `{"ok": true, "added": n, "duplicates": m}`
- `GET /status` — 各状态计数
- `POST /api/tasks/lookup` — `{"urls": [...]}`，批量查询待下载、下载中及失败任务，每次最多 500 个 URL；返回 `{"items": [...], "total": n}`。

完整接口见 `/docs`（OpenAPI）。

## 数据

队列数据存在 `DB_FILE`（默认 `tasks.db`），`url` 唯一，重复链接会被忽略。升级时服务启动会幂等补齐新增字段，无需手动迁移。
