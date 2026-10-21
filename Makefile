PORT ?= 29682
SAVED_PAGE ?=
TEST_APP ?= lrr-test-current
TEST_ORIGIN ?= http://127.0.0.1:29683
NATIVE_PAGES ?=

.PHONY: dev build watch watch-live watch-preview serve test test-quick test-core test-serve test-browser test-status test-logs test-stop

dev: build
	$(MAKE) -j2 watch-live serve

build:
	pnpm --dir web build:userscript

test-quick: test

test: test-core test-serve
	$(MAKE) test-browser

test-core:
	node --test userscript/test-core.mjs

test-browser:
	LRR_TEST_ORIGIN="$(TEST_ORIGIN)" browser-harness < userscript/test-browser.py

test-serve: build
	node --check lanraragi-checker.user.js
	@test -n "$(SAVED_PAGE)" && test -f "$(SAVED_PAGE)" || { echo 'Set SAVED_PAGE to a saved real HTML page'; exit 1; }
	LRR_NATIVE_PAGES="$(if $(NATIVE_PAGES),$(abspath $(NATIVE_PAGES)),)" LRR_SAVED_PAGE="$(abspath $(SAVED_PAGE))" pm2 startOrRestart userscript/ecosystem.config.cjs --only lrr-test-current --update-env

test-status:
	pm2 list

test-logs:
	pm2 logs $(TEST_APP)

test-stop:
	@for app in lrr-test-current lrr-test-before lrr-test-after; do \
		if pm2 describe $$app >/dev/null 2>&1; then pm2 stop $$app; fi; \
	done

watch:
	$(MAKE) -j2 watch-live watch-preview

watch-live:
	@mkdir -p userscript/dist
	flock -n -E 0 userscript/dist/watch-live.lock pnpm --dir web exec vite build --config vite.userscript.config.ts --watch

watch-preview:
	@mkdir -p userscript/dist
	flock -n -E 0 userscript/dist/watch-preview.lock pnpm --dir web exec vite build --config vite.userscript.config.ts --mode preview --watch

serve:
	@case "$(PORT)" in 29683|29684|29685) echo 'Ports 29683–29685 are reserved for mock tests/previews; use PORT=29682 or another port.'; exit 1;; esac
	@mkdir -p userscript/dist
	flock -n -E 0 userscript/dist/serve-$(PORT).lock python3 -m http.server $(PORT) --bind 127.0.0.1 --directory userscript/dist
