;(function () {
    function queryTabsInActiveWindow(query) {
        return new Promise((accept, reject) => {
            chrome.windows.getLastFocused(function (lastWin) {
                var newQuery = Object.assign({ windowId: lastWin.id }, query);     
                chrome.tabs.query(query, function (tabs) {
                    accept(tabs);
                });
            });
        });
    }

    function getActiveTab() {
        return queryTabsInActiveWindow({ active: true }).then((tabs) => { return tabs[0] });
    }

    function getHighlightedTabs() {
        return queryTabsInActiveWindow({ highlighted: true });
    }

    function getTabs() {
        return queryTabsInActiveWindow({});
    }    

    function moveHighlightedTabsTo(newIndex) {
        return getHighlightedTabs().then((tabs) => {
            for (var i = tabs.length - 1; i >= 0; i--) 
                chrome.tabs.move(tabs[i].id, { index: newIndex });
        });
    }

    function moveHighlightedTabsBy(offset) {
        return getHighlightedTabs().then((tabs) => {
            if (offset < 0) {
                for (var i = 0; i < tabs.length; i++)
                    chrome.tabs.move(tabs[i].id, { index: tabs[i].index + offset });
            } else {
                for (var i = tabs.length - 1; i >= 0; i--) 
                    chrome.tabs.move(tabs[i].id, { index: tabs[i].index + offset });
            }
        });
    }

    var commandList = { 'move-tab-first' : () => { moveHighlightedTabsTo(1) },
                        'move-tab-left': () => { moveHighlightedTabsBy(-1) },
                        'move-tab-right': () => { moveHighlightedTabsBy(1) } };

    function commandExec(command) {
        if (!(command in commandList))
            return;
        commandList[command]();
    }

    // Add the command listener 
    chrome.commands.onCommand.addListener(commandExec);
})();
