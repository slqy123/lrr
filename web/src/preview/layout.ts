export const previewLayoutStyles = {
  'preview-strip': 'flex items-center justify-between mb-6 text-muted-foreground text-[12px] [&>span]:flex [&>span]:items-center [&>span]:gap-3 [&_label]:flex [&_label]:items-center [&_label]:gap-3 [&_select]:px-2 [&_select]:py-1 [&_select]:text-foreground [&_select]:bg-card [&_select]:border [&_select]:border-input [&_select]:rounded-[8px]',
  'collection-heading': 'flex items-center justify-between gap-4 mb-[18px] [&_h1]:flex [&_h1]:items-center [&_h1]:gap-[10px] [&_h1]:mt-[5px] [&_h1]:mb-2 [&_h1]:text-[24px] [&_h1]:leading-[1.4] [&_h1]:font-extrabold [&_h1]:tracking-[.5px] [&_p]:text-muted-foreground [&_p]:m-0 [&_p]:text-[12px] [&_h2]:mt-0 [&_h2]:mx-0 [&_h2]:mb-[10px] [&_h2]:text-[19px] [&_h2]:font-extrabold [&_h2_.yurui-tape]:h-auto [&_h2_.yurui-tape]:px-2 [&_h2_.yurui-tape]:py-[2px]',
  eyebrow: '[font:500_11px/1.4_var(--font-yurui-display)] text-accent-foreground tracking-[2px]',
  'header-sticker': 'rotate-[4deg] px-[14px] py-[10px]',
  count: 'ml-3',
  'detail-body': 'grid grid-cols-[180px_1fr] gap-6 py-3 [&>img]:w-[180px] [&>img]:rounded-[10px]',
  'queue-stats': 'grid grid-cols-4 gap-[18px] my-7',
  'stat-card': 'flex flex-col gap-2 p-[22px] [&_strong]:text-accent-foreground [&_strong]:text-[34px] [&_small]:text-muted-foreground [&_small]:text-[11px]',
  'task-panel': 'pt-2 px-[18px] pb-[18px]',
  'task-toolbar': 'flex items-center justify-between gap-4 py-[14px]',
  'task-identity': 'flex items-center gap-3 [&_img]:w-8 [&_img]:h-[44px] [&_img]:object-contain [&_img]:rounded-[4px] [&_strong]:block [&_strong]:text-[13px] [&_strong]:font-semibold [&_small]:block [&_small]:mt-1 [&_small]:text-muted-foreground [&_small]:text-[11px]',
  'progress-track': 'w-[100px] h-[6px] rounded-[4px] bg-muted [&_span]:block [&_span]:w-[62%] [&_span]:h-full [&_span]:rounded-[inherit] [&_span]:bg-(--yurui-water)',
} as const
