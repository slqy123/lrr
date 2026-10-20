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

用 Tampermonkey 安装 [用户脚本](https://raw.githubusercontent.com/slqy123/lrr/main/lanraragi-checker.user.js)，打开 ExHentai / E-Hentai 图库搜索列表页。点击顶部 **设置** 填写 LANraragi 地址、API Key 和队列服务器地址；升级时会读取已有设置。当前支持目标为 Firefox 桌面版 + Tampermonkey，仍需该环境的人工验收。

- 列表采用 AniBT 贴纸手账风格。白樱／夜樱主题默认跟随系统，也可手动选择并保存；提供标准／紧凑两种密度。
- 搜索、分类、评分、页数及高级过滤使用原站搜索条件。支持语言与全年龄快捷建议、文件搜索，以及保留真实游标的翻页和日期／偏移量跳转；浏览器前进后退正常使用。
- 封面保持比例完整显示，标题保留两行，悬浮可查看全文。原站提供的日期、收藏和种子入口可通过卡片的“···”访问；详情与阅读页面保持原样。
- 批量选择提供“未收录／疑似重复／队列中／已入库”四组及数量，可叠加选择；部分选中时点击补齐该组，全部选中后再次点击取消该组。“全选”也包含检查中与查询异常的作品。
- 底部操作栏支持复制真实链接和发送队列。发送成功仅清除本次发送的选择，失败保留；结果区分新增和重复数量。
- 已入库状态优先于队列状态；队列中、检查中及查询异常不会算作未收录。关闭标题搜索后，“未收录”仅表示 URL 未命中。悬浮或点击状态可查看书库匹配、阅读／编辑入口和队列错误详情。
- 队列状态在页面可见时每 5 秒刷新，发送成功后立即查询。书库的确定性结果缓存三天，按服务与密钥隔离；点击 **重新检查** 会绕过缓存且保留选择。
- 顶栏的 **队列后台 ↗** 打开现有队列面板。点击 **原站界面** 可恢复原页面，重新加载列表页即可再次启用新界面；无法识别或解析失败的页面保留原站。

## HTTP API

用户脚本依赖的兼容接口：

- `POST /add` — `{"urls": [...]}` → `{"ok": true, "added": n, "duplicates": m}`
- `GET /status` — 各状态计数
- `POST /api/tasks/lookup` — `{"urls": [...]}`，批量查询待下载、下载中及失败任务，每次最多 500 个 URL；返回 `{"items": [...], "total": n}`。

完整接口见 `/docs`（OpenAPI）。

## 数据

队列数据存在 `DB_FILE`（默认 `tasks.db`），`url` 唯一，重复链接会被忽略。升级时服务启动会幂等补齐新增字段，无需手动迁移。
