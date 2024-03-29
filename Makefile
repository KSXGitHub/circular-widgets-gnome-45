UUID=$$(jq -r .uuid < src/metadata.json)
SRCDIR=src
BUILDDIR=build
FILES=*.json *.js schemas *.css
MKFILE_PATH := $(lastword $(MAKEFILE_LIST))
MKFILE_DIR := $(dir $(MKFILE_PATH))
ABS_MKFILE_PATH := $(abspath $(MKFILE_PATH))
ABS_MKFILE_DIR := $(abspath $(MKFILE_DIR))
ABS_BUILDDIR=$(ABS_MKFILE_DIR)/$(BUILDDIR)
INSTALL_PATH=~/.local/share/gnome-shell/extensions

default_target: all
.PHONY: clean all zip install

clean:
	rm .tsbuildinfo
	rm -rf $(BUILDDIR)

deps:
	corepack pnpm install --frozen-lockfile

tsc: deps
	corepack pnpm exec tsc

assets:
	node copy-assets.cjs

build: deps assets tsc

# compile the schemas
all: clean build
	mkdir -p $(BUILDDIR)/$(UUID)
	cp -r dist/* $(BUILDDIR)/$(UUID)
	@if [ -d $(BUILDDIR)/$(UUID)/schemas ]; then \
		glib-compile-schemas $(BUILDDIR)/$(UUID)/schemas; \
	fi

xz: all
	(cd $(BUILDDIR)/$(UUID); \
         tar -czvf $(ABS_BUILDDIR)/$(UUID).tar.xz $(FILES:%=%); \
        );

zip: all
	(cd $(BUILDDIR)/$(UUID); \
         zip -rq $(ABS_BUILDDIR)/$(UUID).zip $(FILES:%=%); \
        );

install: all
	mkdir -p $(INSTALL_PATH)/$(UUID)
	cp -R -p build/$(UUID)/* $(INSTALL_PATH)/$(UUID)
