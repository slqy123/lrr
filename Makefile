PORT ?= 29683
SAVED_PAGE ?=

.PHONY: dev build watch serve test test-quick

dev: build
	$(MAKE) -j2 watch serve

build:
	pnpm --dir web build:userscript

test-quick: build
	LRR_TEST_QUICK=1 node userscript/test-live.mjs
	node --check lanraragi-checker.user.js

test: build
	node userscript/test-isolation.mjs
	node userscript/test-showcase.mjs
	node userscript/test-live.mjs $(if $(SAVED_PAGE),"$(SAVED_PAGE)")
	node --check lanraragi-checker.user.js

watch:
	pnpm --dir web exec vite build --config vite.userscript.config.ts --watch

serve:
	python3 -m http.server $(PORT) --bind 127.0.0.1 --directory userscript/dist
