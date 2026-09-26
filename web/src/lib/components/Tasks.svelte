<script lang="ts">
  import { api } from '../api'
  import { relativeTime, secondsUntil, statusLabels } from '../format'
  import { store } from '../store.svelte'
  import Badge from './Badge.svelte'

  let input = $state('')
  let message = $state('')

  const limit = $derived(store.query.limit ?? 50)
  const offset = $derived(store.query.offset ?? 0)
  const page = $derived(Math.floor(offset / limit) + 1)
  const pages = $derived(Math.max(1, Math.ceil(store.total / limit)))

  async function addUrls() {
    const urls = input
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (urls.length === 0) {
      message = '请先粘贴至少一个链接'
      return
    }
    try {
      const result = await api.add(urls)
      message = `已加入 ${result.added} 条，跳过重复 ${result.duplicates} 条`
      input = ''
      await store.refresh()
    } catch (cause) {
      message = `加入失败：${cause instanceof Error ? cause.message : String(cause)}`
    }
  }

  function go(delta: number) {
    store.query.offset = Math.max(0, offset + delta * limit)
    store.refresh()
  }

  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url)
      message = '链接已复制'
    } catch {
      message = '复制失败'
    }
  }
</script>

<section class="space-y-4">
  <div class="rounded border border-line bg-surface p-4">
    <label class="mb-2 block text-xs text-muted" for="add-urls">粘贴画廊链接，每行一个</label>
    <textarea
      id="add-urls"
      bind:value={input}
      rows="3"
      spellcheck="false"
      placeholder="https://exhentai.org/g/..."
      class="tnum w-full resize-y rounded border border-line bg-ink px-3 py-2 text-xs outline-none focus:border-accent"
    ></textarea>
    <div class="mt-2 flex items-center gap-3">
      <button class="rounded bg-accent px-3 py-1 text-sm text-ink hover:opacity-90" onclick={addUrls}>
        加入队列
      </button>
      <button
        class="rounded border border-line px-3 py-1 text-sm text-muted hover:border-warn hover:text-warn"
        onclick={() => store.mutate(async () => {
          const result = await api.retryFailed()
          message = `已重排 ${result.affected} 条失败任务`
        })}
      >
        重试全部失败
      </button>
      {#if message}<span class="text-xs text-muted">{message}</span>{/if}
    </div>
  </div>

  <div class="flex flex-wrap items-center gap-3">
    <select
      bind:value={store.query.status}
      onchange={() => store.refresh()}
      class="rounded border border-line bg-surface px-2 py-1 text-sm"
    >
      <option value="">全部状态</option>
      {#each Object.keys(statusLabels) as status}
        <option value={status}>{statusLabels[status]}</option>
      {/each}
    </select>
    <input
      bind:value={store.query.q}
      oninput={() => store.refresh()}
      placeholder="按链接搜索"
      class="tnum w-64 rounded border border-line bg-surface px-2 py-1 text-sm outline-none focus:border-accent"
    />
    <span class="tnum ml-auto text-xs text-muted">第 {page} / {pages} 页 · 共 {store.total} 条</span>
    <button
      class="rounded border border-line px-2 py-1 text-sm text-muted disabled:opacity-40"
      disabled={offset === 0}
      onclick={() => go(-1)}>上一页</button
    >
    <button
      class="rounded border border-line px-2 py-1 text-sm text-muted disabled:opacity-40"
      disabled={offset + limit >= store.total}
      onclick={() => go(1)}>下一页</button
    >
  </div>

  <div class="overflow-x-auto rounded border border-line">
    <table class="w-full border-collapse text-sm">
      <thead class="bg-surface text-left text-xs text-muted">
        <tr>
          <th class="px-3 py-2 font-normal">状态</th>
          <th class="px-3 py-2 font-normal">链接</th>
          <th class="px-3 py-2 font-normal">尝试</th>
          <th class="px-3 py-2 font-normal">更新时间</th>
          <th class="px-3 py-2 font-normal">操作</th>
        </tr>
      </thead>
      <tbody>
        {#each store.tasks as task (task.id)}
          <tr class="border-t border-line align-top">
            <td class="px-3 py-2"><Badge status={task.status} /></td>
            <td class="max-w-[28rem] px-3 py-2">
              <a href={task.url} target="_blank" rel="noreferrer" class="tnum break-all text-xs hover:text-accent">
                {task.url}
              </a>
              {#if task.status === 'done' && task.lrr_archive_id}
                <div class="text-xs text-muted">LRR: {task.title || task.lrr_archive_id}</div>
              {/if}
              {#if task.error}
                <div class="text-xs text-err">{task.error}</div>
              {/if}
              {#if task.status === 'failed' && task.next_attempt_at > 0}
                <div class="text-xs text-warn">{secondsUntil(task.next_attempt_at)}</div>
              {/if}
            </td>
            <td class="tnum px-3 py-2 text-xs text-muted">{task.attempts}/{task.max_attempts}</td>
            <td class="tnum px-3 py-2 text-xs text-muted">{relativeTime(task.updated_at)}</td>
            <td class="px-3 py-2">
              <div class="flex flex-wrap gap-1 text-xs">
                {#if ['failed', 'dead', 'cancelled', 'done'].includes(task.status)}
                  <button class="rounded border border-line px-2 py-0.5 hover:border-accent hover:text-accent" onclick={() => store.mutate(() => api.retry(task.id))}>重试</button>
                {/if}
                {#if ['pending', 'running', 'failed'].includes(task.status)}
                  <button class="rounded border border-line px-2 py-0.5 hover:border-warn hover:text-warn" onclick={() => store.mutate(() => api.cancel(task.id))}>取消</button>
                {/if}
                <button class="rounded border border-line px-2 py-0.5 hover:border-accent hover:text-accent" onclick={() => copy(task.url)}>复制</button>
                <button class="rounded border border-line px-2 py-0.5 hover:border-err hover:text-err" onclick={() => store.mutate(() => api.remove(task.id))}>删除</button>
              </div>
            </td>
          </tr>
        {:else}
          <tr><td colspan="5" class="px-3 py-8 text-center text-sm text-muted">没有任务。在上方粘贴链接即可开始。</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</section>
