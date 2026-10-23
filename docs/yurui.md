# yurui component library

`web/src/ui/yurui/` contains the local React component library, derived from AniBT UI. Its provenance and AGPL license are recorded in `NOTICE.txt` and `LICENSE` in that directory.

## Boundaries

- Shared components own presentation, native semantics and reusable interaction behavior.
- Callers own service requests, gallery categories, queue state, navigation URLs and persistence.
- Page-specific CSS, CVA recipes and motion live in `web/src/userscript/styles/`, not in the component library.
- Import components directly from their modules. Reuse existing components and theme tokens before adding a new abstraction.

## Design language

YuruLib is a personal manga library with the character of a reader's notebook: paper surfaces, bookmark accents and restrained sticker-like controls. Editorial typography keeps the artwork and reading content in focus. This is not a comic-effects skin.

- Use offset shadows and slight asymmetry for primary actions and brand accents. Keep secondary controls quieter; do not tilt reading text or entire content cards.
- Establish hierarchy with typography, spacing and alignment before adding backgrounds or borders. Reserve the strongest accent for the primary action or current state.
- Use badges for categorical tags and short status labels, not as a default container for every fact. Present measurements as numbers with captions, and people and dates as attribution.
- Give each section at most one decorative motif. Bookmarks, paper edges and stitched separators should clarify grouping, not frame every element. Decorations must not obstruct content or pointer targets.
- Keep covers uncropped. Keep descriptions, comments and long tag groups on calm surfaces; do not add patterns behind reading content.
- Consume existing semantic theme and material tokens. Avoid theme-specific page skins and arbitrary new colors.
- Motion confirms an action or introduces newly available content. Prefer short, small movements without loops, staggered entrances or bounces; respect reduced motion and disabled states.

Page-specific expressions of this language remain in userscript styles. Shared component defaults must remain useful outside a single page.

Each component combines at most one complete appearance recipe. That recipe owns its background, foreground, border and shadow across selection, hover and active states; shared button geometry, sizes, focus and disabled behavior remain reusable. For example, `CategoryButton` uses the `category` button variant, rather than stacking `secondary` or `ghost` with category appearance overrides. `yurui-category-ink` shares only category color resolution; it must not import button surfaces or interaction states. Static gallery category labels define their own surface without inheriting button interactions.

## Composition

- `FormFields` lays out fields. `FormField` supplies a label and control attributes through its render function. Pass those attributes to the input or native select.
- `FieldGroup` names multiple controls with a native fieldset and legend. Each control still needs its own accessible name.
- `InputGroup` positions a leading SVG beside an input. Mark decorative icons `aria-hidden`.
- `IconButton` requires a `label`. Use `Button asChild` for links styled as buttons.
- `FilterChip` and `CategoryButton` take a controlled `checked` value and native button events. `SegmentedControl` takes a controlled value and `onValueChange`.
- `TabsList` takes controlled items, a value, an ID prefix and a panel ID. Give `TabsPanel` that panel ID and set its `aria-labelledby` to the selected tab's ID (the prefix, a hyphen and the selected value). Arrow keys, Home and End move focus and activate a tab.
- `Pagination` owns presentation; `PaginationStep` renders a link when given an href and a disabled button otherwise. Compute URLs in the caller.
- `Notice` presents inline contextual information. `ToastProvider` owns transient notifications in the supplied Shadow DOM portal; `useToast` publishes or dismisses messages. Reuse a stable ID for ongoing operations. Loading stays until dismissed or replaced, errors remain dismissible, and ordinary messages expire after five seconds (paused on hover or focus).
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

The userscript stylesheet is the Tailwind entry point and owns Shadow DOM reset, page imports and responsive variants. Shared styles have explicit owners:

- `theme.css`: semantic tokens, light/dark values, interaction materials and Tailwind token mappings for the single supported palette.
- `components.css`: shared presentation, nested-element rules and reusable selection treatments. `yurui-btn` owns base button geometry; React CVA supplies sizes and variants without repeating that geometry. Padding, dimensions and simple state utilities stay in React where `className` composition must replace them.
- `motion.css`: shared keyframes, control transitions and the single reduced-motion policy.

Page styles have matching feature owners: `page.css`, `gallery.css`, `search.css` and `details.css`. Shared CSS utilities use the `yurui-` prefix; page utilities use feature names. Keep simple element layout in Tailwind and use CVA for class composition that depends on props. Put complex descendants, pseudo-elements and decoration in named CSS utilities rather than exported style-string constants or lookup objects. Scope overrides of shared component defaults through their public `data-slot` when needed; do not rely on a named utility sorting after a component's size utilities.

The `layout-compact`, `layout-narrow` and `layout-small` variants centralize the existing 1150px, 700px and 450px maximum-width breakpoints, in descending order so narrower layouts override wider ones.

The production stylesheet scans only userscript and shared-component sources. `web/src/preview/styles.css` imports that same stylesheet, adds showcase-only layout and scans preview sources. Each entry passes its compiled stylesheet to `mount`; mounting and Shadow DOM isolation are shared, without bundling the showcase stylesheet into the installable userscript.

Theme roots target `:host` and `:host(.dark)`. Keep category-dependent values on the category element rather than resolving them in host-level tokens.

`DialogContent` and `PopoverContent` require an explicit portal container inside the owning Shadow DOM. Do not portal to `document.body` or substitute page-side GM APIs.

For real-page previews and verification limits, see [userscript-preview.md](userscript-preview.md). Build checks do not establish visual fidelity or Firefox/Tampermonkey compatibility.
