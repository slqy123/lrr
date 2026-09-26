<script lang="ts">
  import { statusLabels } from '../format'
  import { store } from '../store.svelte'

  const cards = ['pending', 'running', 'done', 'failed', 'dead'] as const

  const tone: Record<string, string> = {
    pending: 'text-muted',
    running: 'text-accent',
    done: 'text-ok',
    failed: 'text-warn',
    dead: 'text-err',
  }

  const bar: Record<string, string> = {
    pending: 'bg-muted',
    running: 'bg-accent',
    done: 'bg-ok',
    failed: 'bg-warn',
    dead: 'bg-err',
  }

  const count = (status: string) => (store.stats as unknown as Record<string, number>)[status] ?? 0
  const total = $derived(cards.reduce((sum, status) => sum + count(status), 0))
  const width = (status: string) => (total === 0 ? 0 : (count(status) / total) * 100)
</script>

<section class="space-y-6">
  <div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
    {#each cards as status}
      <div class="rounded border border-line bg-surface p-4">
        <div class="text-xs text-muted">{statusLabels[status]}</div>
        <div class="tnum mt-2 text-2xl {tone[status]}">{count(status)}</div>
      </div>
    {/each}
  </div>

  <div class="rounded border border-line bg-surface p-4">
    <div class="mb-3 flex items-baseline justify-between">
      <h2 class="text-sm text-muted">队列流水线</h2>
      <span class="tnum text-xs text-muted">共 {total} 条</span>
    </div>
    <div class="flex h-3 overflow-hidden rounded-full bg-surface-2">
      {#each cards as status}
        {#if count(status) > 0}
          <div class="{bar[status]} h-full transition-[width] duration-500" style="width: {width(status)}%" title="{statusLabels[status]} {count(status)}"></div>
        {/if}
      {/each}
    </div>
    <div class="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {#each cards as status}
        <span><span class="{bar[status]} mr-1 inline-block h-2 w-2 rounded-full"></span>{statusLabels[status]} {count(status)}</span>
      {/each}
    </div>
  </div>

  {#if store.stats.cancelled > 0}
    <p class="text-xs text-muted">已取消 {store.stats.cancelled} 条。</p>
  {/if}
</section>
