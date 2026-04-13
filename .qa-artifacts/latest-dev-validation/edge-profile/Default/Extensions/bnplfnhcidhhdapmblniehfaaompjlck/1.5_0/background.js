chrome.management.onEnabled.addListener(function (ExtensionInfo) {
 
    if(ExtensionInfo.id != chrome.runtime.id) {
		return;
	}
	chrome.storage.local.get(["BingDefaultsSet"], (items) => {
		if (!items.BingDefaultsSet) {
			chrome.storage.local.set({ 
				"BingDefaultsSet": "done"
			});
		}
	});
});
