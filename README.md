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

在 ExHentai 用户脚本的设置里把“队列服务地址”填成同一地址（默认 `http://localhost:29481`）即可发送选中链接。

## HTTP API

用户脚本依赖的兼容接口：

- `POST /add` — `{"urls": [...]}` → `{"ok": true, "added": n, "duplicates": m}`
- `GET /status` — 各状态计数

完整接口见 `/docs`（OpenAPI）。

## 数据

队列数据存在 `DB_FILE`（默认 `tasks.db`），`url` 唯一，重复链接会被忽略。升级时服务启动会幂等补齐新增字段，无需手动迁移。
