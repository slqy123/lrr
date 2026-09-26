<script lang="ts">
  import Dashboard from './lib/components/Dashboard.svelte'
  import Settings from './lib/components/Settings.svelte'
  import Tasks from './lib/components/Tasks.svelte'
  import { store } from './lib/store.svelte'

  type View = 'dashboard' | 'tasks' | 'settings'
  let view = $state<View>('dashboard')

  const tabs: { id: View; label: string }[] = [
    { id: 'dashboard', label: '总览' },
    { id: 'tasks', label: '任务' },
    { id: 'settings', label: '设置' },
  ]

  $effect(() => {
    store.refresh()
    const timer = setInterval(() => {
      if (!document.hidden) store.refresh()
    }, 2000)
    const onVisibility = () => {
      if (!document.hidden) store.refresh()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  })

  async function togglePause() {
    if (store.stats.paused) await store.resume()
    else await store.pause()
  }
</script>

<div class="min-h-screen bg-ink text-text">
  <header class="border-b border-line bg-surface">
    <div class="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-3">
      <h1 class="text-sm font-semibold">lrr-queue</h1>
      <nav class="flex gap-1">
        {#each tabs as tab}
          <button
            class="rounded px-3 py-1 text-sm transition-colors {view === tab.id
              ? 'bg-surface-2 text-text'
              : 'text-muted hover:text-text'}"
            onclick={() => (view = tab.id)}
          >
            {tab.label}
          </button>
        {/each}
      </nav>
      <div class="ml-auto flex items-center gap-3 text-xs">
        <span class="text-muted">{store.online ? '实时 · 2s' : '离线'}</span>
        <button
          class="rounded border border-line px-3 py-1 hover:border-accent hover:text-accent"
          onclick={togglePause}
        >
          {store.stats.paused ? '恢复队列' : '暂停队列'}
        </button>
      </div>
    </div>
  </header>

  {#if store.error}
    <div class="border-b border-err/40 bg-err/10 px-6 py-2 text-sm text-err">
      无法连接队列服务：{store.error}
    </div>
  {/if}
  {#if store.stats.paused}
    <div class="border-b border-warn/40 bg-warn/10 px-6 py-2 text-sm text-warn">
      队列已暂停：{store.stats.pause_reason || '手动暂停'}
    </div>
  {/if}

  <main class="mx-auto max-w-5xl px-6 py-6">
    {#if view === 'dashboard'}
      <Dashboard />
    {:else if view === 'tasks'}
      <Tasks />
    {:else}
      <Settings />
    {/if}
  </main>
</div>
