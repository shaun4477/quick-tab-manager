dist:
	@mkdir -p dist
	@cp icon*.png manifest.json advrearrange.js dist/
	@zip -r rearrange_tabs.zip dist/

clean:
	rm -fr ./dist/

.PHONY: dist clean
