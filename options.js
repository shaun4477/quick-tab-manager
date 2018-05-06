;(function (global) {
    // Take forceUrl class anchors and use chrome.tabs to 
    // open the location specified in the data-url attribute. 
    // Allows 'chrome://*' links to be work
    document.body.addEventListener("click", (event) => {
        if (event.target.matches("a.forceUrl") && event.target.dataset.url) {
            chrome.tabs.create({ url: event.target.dataset.url });
	    return false;
	}
    });

    var tabPermissions = {permissions: ["tabs"]};

    function updateCheckbox() {
        chrome.permissions.contains(tabPermissions, (enabled) => {
            document.querySelector("#tabsPermission").checked = enabled;
        });
    }

    function updateShortcuts() {
	chrome.commands.getAll(commands => {
	    var listContainer = document.querySelector("div#currentShortcuts");
	    var newList = commands.filter(command => command.shortcut).reduce((list, command) => {
		return list + "<p>" + command.shortcut + " - " + command.description + "</p>"
	    }, "");
	    listContainer.innerHTML = newList || "<strong>No keyboard shorcuts set</strong>";
	});
    }

    document.querySelector("#tabsPermission").addEventListener("change", (event) => {
        if (event.target.checked) 
            chrome.permissions.request(tabPermissions, updateCheckbox);
        else
            chrome.permissions.remove(tabPermissions, updateCheckbox);
    });

    function main() {
	updateCheckbox();
	updateShortcuts();
    };

    main();
})(window);
