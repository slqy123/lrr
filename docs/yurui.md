# yurui component library

`web/src/ui/yurui/` contains the local React component library, derived from AniBT UI. Its provenance and AGPL license are recorded in `NOTICE.txt` and `LICENSE` in that directory.

## Boundaries

- Shared components own presentation, native semantics and reusable interaction behavior.
- Callers own service requests, gallery categories, queue state, navigation URLs and persistence.
- Page-specific CVA recipes and motion live in `web/src/userscript/styles/`, not in the component library.
- Import components directly from their modules. Reuse existing components and theme tokens before adding a new abstraction.

## Composition

- `FormFields` lays out fields. `FormField` supplies a label and control attributes through its render function. Pass those attributes to the input or native select.
- `FieldGroup` names multiple controls with a native fieldset and legend. Each control still needs its own accessible name.
- `InputGroup` positions a leading SVG beside an input. Mark decorative icons `aria-hidden`.
- `IconButton` requires a `label`. Use `Button asChild` for links styled as buttons.
- `FilterChip` and `CategoryButton` take a controlled `checked` value and native button events. `SegmentedControl` takes a controlled value and `onValueChange`.
- `TabsList` takes controlled items, a value, an ID prefix and a panel ID. Give `TabsPanel` that panel ID and set its `aria-labelledby` to the selected tab's ID (the prefix, a hyphen and the selected value). Arrow keys, Home and End move focus and activate a tab.
- `Pagination` owns presentation; `PaginationStep` renders a link when given an href and a disabled button otherwise. Compute URLs in the caller.
- `Notice` and `FloatingNotice` accept content, an optional status label/tone and an action. Callers decide when to show or dismiss them.
- `DescriptionList` and `DescriptionItem` render native description-list semantics. The grouped variant supports a marked term with a count supplied by the caller.
- `NavigationList` contains ordinary `NavigationLink` anchors, not ARIA menu items.
- `Separator` is decorative by default; use `decorative={false}` for an announced separator.
- `Skeleton` is decorative and honors reduced motion. Put loading announcements or `aria-busy` on the owning region rather than on individual placeholder blocks.

```tsx
<FormField label="Service URL" description="Use the address of your service.">
  {control => <Input {...control} type="url" value={url} onChange={event => setUrl(event.target.value)} />}
</FormField>
```

## Theme and isolation

The userscript stylesheet imports Tailwind, the yurui theme, palettes and material utilities. Components use Tailwind and CVA; shared material rules remain in the library CSS. Theme roots target `:host` and `:host(.dark)`.

`DialogContent` and `PopoverContent` require an explicit portal container inside the owning Shadow DOM. Do not portal to `document.body` or substitute page-side GM APIs.

For real-page previews and verification limits, see [userscript-preview.md](userscript-preview.md). Build checks do not establish visual fidelity or Firefox/Tampermonkey compatibility.
