;(function (global) {
    var tabLoadTime = {};

    function newTab(tab) {
        tabLoadTime[tab.id] = (new Date()).getTime();
    }
    chrome.tabs.onCreated.addListener(newTab);

    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        if (changeInfo["status"] == "complete")
            tabLoadTime[tab.id] = (new Date()).getTime();
    });

    chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
        delete tabLoadTime[tabId];
    });

    chrome.tabs.onReplaced.addListener(function (addedTabId, removedTabId) {
        if (removedTabId in tabLoadTime) {
            tabLoadTime[addedTabId] = tabLoadTime[removedTabId];
            delete tabLoadTime[removedTabId];
        } else
            tabLoadTime[addedTabId] = (new Date()).getTime();
    });

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

    function main() {
        // Store tab load time for all current tabs
        getTabs().then((tabs) => {
            for (var tab of tabs) {
                newTab(tab);       
            } 
        });
        
        global.tabLoadTime = tabLoadTime;

        // Register the commands for keyboard shortcuts
        var commandList = { 'move-tab-first' : () => { moveHighlightedTabsTo(1) },
                            'move-tab-left':   () => { moveHighlightedTabsBy(-1) },
                            'move-tab-right':  () => { moveHighlightedTabsBy(1) } };

        function commandExec(command) {
            if (!(command in commandList))
                return;
            commandList[command]();
        }

        // Add the command listener 
        chrome.commands.onCommand.addListener(commandExec);

        // If the version of the extension is new, show the page
        var oldVersion = localStorage["version"];
        var currentVersion = chrome.runtime.getManifest().version;
        if (!oldVersion || oldVersion != currentVersion) {
            console.log("New version", oldVersion, currentVersion);
            localStorage["version"] = currentVersion;
        }
        console.log("Loaded", currentVersion);
    }

    main();

})(window);
