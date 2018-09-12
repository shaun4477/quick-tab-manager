;(function (global) {
    var getTimestamp = () => (new Date()).getTime();

    // Tab load times by tab id, tab ids are unique across a browser session so
    // no need to consider window ids here 
    var tabLoadTimes = {};

    // Order tabs have been activated in, most recent last 
    var tabActiveOrder = [];

    // Global variable to ignore a tab switch if we initiate it
    var ignoreTabActivate = null;

    // Global variable to store history position while moving forward/back
    var historyPosition = undefined;

    // Keep load time of tabs. Used to handle close duplicate tab functionality
    // if we are granted the "tabs" permission
    function initTabData(tabId) {
        tabLoadTimes[tabId] = getTimestamp();
    }

    function deleteTabData(deletedTabId) {
        tabActiveOrder = tabActiveOrder.filter(tabId => tabId != deletedTabId);
        delete tabLoadTimes[deletedTabId];
    }

    function getTabActiveOrder() {
	return tabActiveOrder;
    }

    function goBackTab() {
        if (historyPosition === undefined)
            historyPosition = 0;

        if (historyPosition <= tabActiveOrder.length - 2)
            historyPosition += 1;
	goToHistoryPosition(historyPosition);
    }

    function goForwardTab() {
	if (!historyPosition)
	    return; 
        if (historyPosition >= 1)
            historyPosition -= 1;
        goToHistoryPosition(historyPosition);
    }

    
    function goToHistoryPosition(historyPosition) {
        var historyIndex = tabActiveOrder.length - 1 - historyPosition;
        if (historyIndex >= 0 && historyIndex < tabActiveOrder.length) {
            var switchTo = tabActiveOrder[historyIndex];
            ignoreTabActivate = switchTo;
            chrome.tabs.update(switchTo, { active: true });
        }
    }

    chrome.tabs.onActivated.addListener(activeInfo => {
	if (ignoreTabActivate && activeInfo.tabId == ignoreTabActivate)
	    return;
	tabActiveOrder = tabActiveOrder.filter(tabId => tabId != activeInfo.tabId);
	tabActiveOrder.push(activeInfo.tabId);

	// Reset the history pointer used for moving forward/back
	historyPosition = undefined;
    });

    chrome.tabs.onCreated.addListener(tab => initTabData(tab.id));

    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
        if (changeInfo["status"] == "complete")
            initTabData(tab.id);
    });

    chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    deleteTabData(tabId);
    });

    chrome.tabs.onReplaced.addListener((addedTabId, removedTabId) => {
        if (removedTabId in tabLoadTimes) {
            tabLoadTimes[addedTabId] = tabLoadTime[removedTabId];
            deleteTabData(removedTabId);
        } else
            initTabData(addedTabId);
    });

    function queryTabsInActiveWindow(query) {
        return new Promise((accept, reject) => {
            chrome.windows.getLastFocused(lastWin => {
                var newQuery = Object.assign({ windowId: lastWin.id }, query);     
                chrome.tabs.query(query, tabs => accept(tabs));
            });
        });
    }

    function getActiveTab() {
        return queryTabsInActiveWindow({ active: true }).then(tabs => tabs[0]);
    }

    function getHighlightedTabs() {
        return queryTabsInActiveWindow({ highlighted: true });
    }

    function getTabs() {
        return queryTabsInActiveWindow({});
    }    

    function moveHighlightedTabsTo(newIndex) {
        return getHighlightedTabs().then(tabs => {
            for (let i = tabs.length - 1; i >= 0; i--) 
                chrome.tabs.move(tabs[i].id, { index: newIndex });
        });
    }

    function moveHighlightedTabsBy(offset) {
        return getHighlightedTabs().then(tabs => {
            if (offset < 0) {
                for (let i = 0; i < tabs.length; i++)
                    chrome.tabs.move(tabs[i].id, { index: tabs[i].index + offset });
            } else {
                for (let i = tabs.length - 1; i >= 0; i--) 
                    chrome.tabs.move(tabs[i].id, { index: tabs[i].index + offset });
            }
        });
    }

    /* 
     * Close any tabs on the same URL in this window 
     */
    function closeDuplicateTabs() {
        getTabs().then(tabs => {
            var tabsByUrl = tabs.filter(tab => tab.url).reduce((tabsByUrl, tab) => { 
                (tab.url in tabsByUrl) || (tabsByUrl[tab.url] = []);
                tabsByUrl[tab.url].push({ id: tab.id, time: tabLoadTimes[tab.id] });
                return tabsByUrl;
            }, {});

            Object.entries(tabsByUrl).forEach(([url, tabs]) => {
                if (tabs.length < 2) 
                    return;
                var tabsToClose = tabs.sort((a, b) => b.time - a.time).slice(1);
                console.log(url, tabs, tabsToClose);
                tabsToClose.forEach(tabToClose => { chrome.tabs.remove(tabToClose.id) });
            });
        });
    }

    function main() {
        // Store tab load time for all current tabs
        getTabs().then(tabs => tabs.map(tab => initTabData(tab.id)));
        
        var exports = { 'tabLoadTimes': tabLoadTimes, 'getTabs': getTabs, 'getActiveTab': getActiveTab, 
                        'closeDuplicateTabs': closeDuplicateTabs, 'getTabActiveOrder': getTabActiveOrder };
        Object.entries(exports).forEach(([name, func]) => global[name] = func);

        // Register the commands for keyboard shortcuts
        var commandList = { 'move-tab-first' :      () => { moveHighlightedTabsTo(1) },
                            'move-tab-left':        () => { moveHighlightedTabsBy(-1) },
                            'move-tab-right':       () => { moveHighlightedTabsBy(1) }, 
			    'tab-select-back':      () => { goBackTab() },
			    'tab-select-forward':   () => { goForwardTab() },
                            'close-duplicate-tabs': closeDuplicateTabs };

        // Add the command listener 
        chrome.commands.onCommand.addListener((command) => {
            if (command in commandList)
                return commandList[command]();
        });

        // If the version of the extension is new, show the updates page
        var oldVersion = localStorage["version"];
        var currentVersion = chrome.runtime.getManifest().version;
        if (!oldVersion || oldVersion != currentVersion) {
            localStorage["version"] = currentVersion;

            // Show welcome screen on first install
            if (oldVersion == null) 
                chrome.tabs.create({ url: chrome.extension.getURL("welcome.html") });
        }
    }

    main();
})(window);
