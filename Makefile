PORT ?= 29683

.PHONY: dev build watch serve test

dev: build
	$(MAKE) -j2 watch serve

build:
	pnpm --dir web build:userscript

test: build
	node userscript/test-isolation.mjs
	node userscript/test-showcase.mjs
	node userscript/test-live.mjs
	node --check lanraragi-checker.user.js

watch:
	pnpm --dir web exec vite build --config vite.userscript.config.ts --watch

serve:
	python3 -m http.server $(PORT) --bind 127.0.0.1 --directory userscript/dist
