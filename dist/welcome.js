;(function (global) {
    function forceLocalUrl() {
        if (this.dataset.url)
            chrome.tabs.create({ url: this.dataset.url });
        return false;
    }

    for (let link of document.querySelectorAll("a.forceUrl")) 
        link.addEventListener("click", forceLocalUrl);
})(window);
