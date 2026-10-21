<script lang="ts">
  import { statusLabels, statusTone } from '../format'

  let { status }: { status: string } = $props()
</script>

<span class="rounded px-2 py-0.5 text-xs {statusTone[status] ?? 'bg-surface-2 text-muted'}">
  {statusLabels[status] ?? status}
</span>
