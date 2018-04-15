dist:
	@mkdir -p dist
	@cp icon*.png options.html welcome.html options.js manifest.json advrearrange.js dist/
	@zip -r quick_tab_manager.zip dist/

clean:
	rm -fr ./dist/

.PHONY: dist clean
