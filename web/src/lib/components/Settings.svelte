<script lang="ts">
  import { api } from '../api'
  import { store } from '../store.svelte'
  import type { Health } from '../types'

  let health = $state<Health | null>(null)
  let message = $state('')

  async function load() {
    try {
      health = await api.health()
    } catch {
      health = null
    }
  }

  $effect(() => {
    load()
  })

  async function recheck() {
    message = '正在核对…'
    try {
      const result = await api.recheck()
      message = `已更新 ${result.affected} 条`
      await store.refresh()
    } catch (cause) {
      message = `失败：${cause instanceof Error ? cause.message : String(cause)}`
    }
  }

  const rows = $derived([
    ['服务地址', window.location.origin],
    ['队列状态', store.stats.paused ? `已暂停（${store.stats.pause_reason || '手动'}）` : '运行中'],
    ['Worker 线程', health ? (health.worker_alive ? '存活' : '已停止') : '未知'],
    ['数据库', health ? (health.db ? '可读写' : '异常') : '未知'],
    ['LANraragi', health ? (health.lrr ? '连接正常' : `不可用：${health.lrr_error}`) : '未知'],
  ])
</script>

<section class="max-w-2xl space-y-4">
  <div class="rounded border border-line bg-surface">
    {#each rows as [label, value]}
      <div class="flex items-start gap-4 border-b border-line px-4 py-3 last:border-b-0">
        <span class="w-28 shrink-0 text-xs text-muted">{label}</span>
        <span class="tnum break-all text-sm">{value}</span>
      </div>
    {/each}
  </div>

  <div class="flex items-center gap-3">
    <button class="rounded border border-line px-3 py-1 text-sm hover:border-accent hover:text-accent" onclick={recheck}>
      用 urlfinder 核对已完成/失败任务
    </button>
    {#if message}<span class="text-xs text-muted">{message}</span>{/if}
  </div>

  <p class="text-xs text-muted">
    连接、并发、重试等配置由服务端 <code class="tnum">.env</code> 提供，修改后重启服务生效。
  </p>
</section>
