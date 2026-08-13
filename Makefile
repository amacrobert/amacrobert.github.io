PORT ?= 8080

.PHONY: run build clean install

# Serve the site at http://localhost:$(PORT), rebuilding on save.
run: node_modules
	npx eleventy --serve --port=$(PORT)

# Build the site into _site/.
build: node_modules
	npx eleventy

install: node_modules

node_modules: package.json package-lock.json
	npm install
	@touch node_modules

clean:
	rm -rf _site
