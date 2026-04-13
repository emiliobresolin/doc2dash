const connectionUrl = "https://www.bing.com/favicon.ico?_=" + new Date().getTime();
const onlineUrl = "https://www.bing.com/rewardsapp/bepflyoutpage?style=chromeextension&channel=0&partnerId=BrowserExtensions";
const offlineUrl = "offline_popup.html";

window.onload = function(){
    loadNewTab();
};

function setPopupPage(online, signedOut, v2) {
    const popupFrame = document.getElementById("content");
    if(online)
    {
        chrome.storage.local.get(["Channel", "PartnerCode"], (items) => {
            let frameUrl = items.Channel ? (onlineUrl + "&dchannel=" + items.Channel) : onlineUrl;
            frameUrl = items.PartnerCode ? (frameUrl + "&pc=" + items.PartnerCode) : frameUrl;
            popupFrame.src = frameUrl;

            if (signedOut) {
                popupFrame.classList = "signedOut";
            } else {
                popupFrame.classList = "signedIn";
            }

            if (v2) {
                popupFrame.classList += " v2";
            }
            var market = chrome.i18n.getMessage("ExtnLanguage");
            if (market == "hr-hr" || market == "ja-jp" || market == "nl-nl" || market == "ro-ro") {
                popupFrame.style.height = "540px";
            }
            if (market == "cs-cz" || market == "et-ee") {
                popupFrame.style.height = "560px";
            }
            if (market == "fi-fi" || market == "pt-pt") {
                popupFrame.style.height = "570px";
            }
            if (market == "bg-bg" || market == "hu-hu" || market == "lt-lt" || market == "lv-lv" || market == "pl-pl" || market == "pt-br" || market == "sl-si") {
                popupFrame.style.height = "580px";
            }
            if (market == "el-gr" || market == "sk-sk") {
                popupFrame.style.height = "595px";
            }
            if (market == "uk-ua") {
                popupFrame.style.height = "599px";
            }
        });
    }
    else
    {
        popupFrame.src = offlineUrl;
        popupFrame.classList = "offline";
    }
}

function loadNewTab(){

    if(!window.navigator.onLine) {
        setPopupPage(false, false);
        return;
    }

    const xhr = new XMLHttpRequest();
    xhr.open("GET", onlineUrl);
    xhr.setRequestHeader('Access-Control-Allow-Origin', '*');
    xhr.onreadystatechange = function(){
        if(xhr.readyState === XMLHttpRequest.DONE){
            if(xhr.status >= 200 && (xhr.status < 300 || xhr.status === 304) && xhr.responseText)
            {
                isSignedOut = xhr.responseText.includes("Rewards.FlyoutModular.TemplateOverrideOffers");
                isFlyoutV2 = xhr.responseText.includes("modern-flyout");
                setPopupPage(true, isSignedOut, isFlyoutV2);
            }
            else{
                setPopupPage(false, false, false);
            }
        }
    };
    xhr.send();
}