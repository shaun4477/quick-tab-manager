;(function (global) {
    function forceLocalUrl() {
        if (this.dataset.url)
            chrome.tabs.create({ url: this.dataset.url });
        return false;
    }

    // Take forceUrl class anchors and use chrome.tabs to 
    // open the location specified in the data-url attribute
    document.body.addEventListener("click", (event) => {
        if (event.target.matches("a.forceUrl")) 
            return forceLocalUrl.call(event.target);
    });

    var tabPermissions = {permissions: ["tabs"]};

    function updateCheckbox() {
        chrome.permissions.contains(tabPermissions, (enabled) => {
            document.querySelector("#tabsPermission").checked = enabled;
        });
    }

    updateCheckbox();

    document.querySelector("#tabsPermission").addEventListener("change", (event) => {
        var checkbox = event.target;

        if (checkbox.checked) 
            chrome.permissions.request(tabPermissions, updateCheckbox);
        else
            chrome.permissions.remove(tabPermissions, updateCheckbox);
    });
})(window);
