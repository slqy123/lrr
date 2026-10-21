PORT ?= 29683
SAVED_PAGE ?=
TEST_APP ?= lrr-test-current
TEST_ORIGIN ?= http://127.0.0.1:29683

.PHONY: dev build watch watch-live watch-preview serve test test-quick test-serve test-browser test-status test-logs test-stop

dev: build
	$(MAKE) -j2 watch serve

build:
	pnpm --dir web build:userscript

test-quick: test

test: test-serve
	$(MAKE) test-browser

test-browser:
	LRR_TEST_ORIGIN="$(TEST_ORIGIN)" browser-harness < userscript/test-browser.py

test-serve: build
	node --check lanraragi-checker.user.js
	@test -n "$(SAVED_PAGE)" && test -f "$(SAVED_PAGE)" || { echo 'Set SAVED_PAGE to a saved real HTML page'; exit 1; }
	LRR_SAVED_PAGE="$(abspath $(SAVED_PAGE))" pm2 startOrRestart userscript/ecosystem.config.cjs --only lrr-test-current --update-env

test-status:
	pm2 list

test-logs:
	pm2 logs $(TEST_APP)

test-stop:
	pm2 stop lrr-test-current lrr-test-before lrr-test-after

watch:
	$(MAKE) -j2 watch-live watch-preview

watch-live:
	pnpm --dir web exec vite build --config vite.userscript.config.ts --watch

watch-preview:
	pnpm --dir web exec vite build --config vite.userscript.config.ts --mode preview --watch

serve:
	python3 -m http.server $(PORT) --bind 127.0.0.1 --directory userscript/dist
