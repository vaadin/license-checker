const licenseBoxTemplate = document.createElement('template');
licenseBoxTemplate.innerHTML = `
  <style>
    :host {
      font: 16px/1.625 -apple-system, BlinkMacSystemFont, "Roboto", "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";
      position: fixed;
      top: .5em;
      right: .5em;
      z-index: 10000;
      cursor: pointer;
      backface-visibility: hidden;
    }

    #content {
      padding: 1em 1.5em;
      margin: 0;
      display: flex;
      flex-direction:row;
      align-items: center;
      text-align: left;
      font-size: inherit;
      line-height: inherit;
      font-weight: inherit;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothin: grayscale;
      white-space: nowrap;
      letter-spacing: 0;
      border-radius: 5px;
    }

    #content[type="needsvalidation"] {
      background-color: #FFD5D8;
      color: #591217;
      box-shadow: 0 0 20px 1px rgba(242,51,51,0.10);
    }

    #content[type="ok"] {
      background-color: #B2F5C2;
      color: #1C562A;
      box-shadow: 0 0 20px 1px rgba(43,193,78,0.10);
    }

    #content > svg {
      display: none;
      fill: currentColor;
      stroke: currentColor 1px;
      padding-left: 1.25em;
    }

    #content[type="needsvalidation"] > #link {
      display: inline;
    }

    #content[type="ok"] > #close {
      display: inline;
      vertical-align: -.125em;
    }
  </style>

  <div id="content">
    <div></div>
    <svg id="link" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 16 16">
      <g id="external-link"><path d="M8.6 3.5l3.5 3.5h-12.1v2h12.1l-3.5 3.5 1.4 1.4 6-5.9-6-5.9z"></path></g>
    </svg>
    <svg id="close" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16" height="16" viewBox="0 0 16 16">
      <g id="close-big"><path d="M16 0l-1 0.010-7 6.99-7-6.99-1-0.010v1l7 7-7 7v1h1l7-7 7 7h1v-1l-7-7 7-7v-1z"></path></g>
    </svg>
  </div>
`;
window.ShadyCSS && window.ShadyCSS.prepareTemplate(licenseBoxTemplate, 'vaadin-license-box');

class LicenseBoxElement extends HTMLElement {
  connectedCallback() {
    window.ShadyCSS && window.ShadyCSS.styleElement(this);

    if (!this.shadowRoot) {
      this.attachShadow({mode: 'open'});
      this.shadowRoot.appendChild(document.importNode(licenseBoxTemplate.content, true));
      this._contentElement = this.shadowRoot.querySelector('#content');
      this._render();
    }
  }

  _render() {
    if (!this._contentElement) {
      return;
    }

    if (this._type) {
      this._contentElement.setAttribute('type', this._type);
    } else {
      this._contentElement.removeAttribute('type');
    }

    this._contentElement.firstElementChild.innerHTML = this._content;
  }

  get type() {
    return this._type;
  }

  set type(type) {
    this._type = type;
    this._render();
  }

  get content() {
    return this._content;
  }

  set content(content) {
    this._content = content;
    this._render();
  }
}

customElements.define('vaadin-license-box', LicenseBoxElement);

class LicenseCheckerLogger {
  constructor() {
    this.id = "vaadin-license-checker";
  }

  isDebug() {
    return localStorage.getItem("vaadin.licenses.debug");
  }

  debug(msg) {
    if (this.isDebug()) {
      console.info(this.id + ": " + msg);
    }
  }
}
class LicenseCheckerStorage {
  constructor() {
    this.logger = new LicenseCheckerLogger();
  }
  getLastCheckKey(productInfo) {
    return "vaadin.licenses.{product}.lastCheck".replace("{product}", productInfo.name);
  }

  getLastCheck(productInfo) {
    return Number(localStorage.getItem(this.getLastCheckKey(productInfo)));
  }

  setLastCheck(productInfo, timestamp) {
    this.logger.debug("Setting last check time to " + new Date(timestamp));
    localStorage.setItem(this.getLastCheckKey(productInfo), timestamp);
  }
}

class VaadinLicenseChecker {
  constructor() {
    this.okNotifier = new LicenseOkNotifier();
    this.validationNeededNotifier = new LicenseValidationNeededNotifier();
    this.storage = new LicenseCheckerStorage();
    this.checkInterval = 1000 * 60 * 60 * 24;
    this.firstCheckDelay = 1000 * 60 * 1;
    this.logger = new LicenseCheckerLogger();
    this.url = "https://tools.vaadin.com/vaadin-license-server/licenses/pro";
  }

  static get version() {
    return '2.1.2';
  }

  getForcedResponseKey(productInfo) {
    return 'vaadin.licenses.{product}.forcedResponse'.replace('{product}', productInfo.name);
  }

  getForcedResponse(productInfo) {
    return localStorage.getItem(this.getForcedResponseKey(productInfo));
  }
  clearForcedResponse(productInfo) {
    return localStorage.removeItem(this.getForcedResponseKey(productInfo));
  }

  maybeCheck(productInfo) {
    this.logger.debug("maybeCheck(" + JSON.stringify(productInfo) + ")");
    // Defer first check until interval has expired to avoid interfering with tests etc
    const now = new Date().getTime();
    const lastCheck = this.storage.getLastCheck(productInfo);
    if (!lastCheck) {
      this.logger.debug("Deferring first check until " + new Date(now + this.firstCheckDelay));
      this.storage.setLastCheck(productInfo, now - this.checkInterval + this.firstCheckDelay);
      return;
    } else {
      const sinceLastCheck = Math.round((now - lastCheck) / 1000);
      const nextCheck = Math.round(this.checkInterval / 1000 - sinceLastCheck);
      if (nextCheck > 0) {
        // Checked recently
        const nextCheckDate = new Date(lastCheck + this.checkInterval);
        this.logger.debug("Checked " + sinceLastCheck + "s ago. Next check in " + nextCheck + "s at " + nextCheckDate + ".");
        return;
      } else {
        this.logger.debug("Last check was " + sinceLastCheck + "s ago.");
      }
    }
    this.check(productInfo);
  }

  check(productInfo) {
    this.logger.debug("check(" + JSON.stringify(productInfo) + ")");

    // Only show an ok notification if the "validation needed" notification was shown.
    // For background checks, show no visual notification if all goes well
    var showOkOnSuccess = this.validationNeededNotifier.isVisible(productInfo);

    const checker = this;
    const onerror = function () {
      // Offline or blocked, just log to console and let people get work done
      console.error("Unable to validate the license for " + productInfo.name + ". Check your internet access.");
    };
    const onresponse = function (responseText) {
      const response = JSON.parse(responseText);
      if (response.result == "ok") {
        // Everything is fine, stop
        checker.logger.debug("License check ok for " + JSON.stringify(productInfo));
        checker.storage.setLastCheck(productInfo, new Date().getTime());
        if (showOkOnSuccess) {
          checker.logger.debug("Showing validation-ok dialog");
          checker.okNotifier.show(productInfo);
        }
      } else {
        checker.logger.debug("License check failed for " + JSON.stringify(productInfo));
        checker.logger.debug("Showing validation-needed dialog");
        checker.validationNeededNotifier.show(productInfo);
      }
      if (response.message) {
        console.log(response.message);
      }
    };

    // This is typically hidden already but when receiving a window message it is not
    this.logger.debug("Ensuring validation-needed dialog is hidden");
    this.validationNeededNotifier.hide(productInfo);

    if (this.logger.isDebug() && this.getForcedResponse(productInfo)) {
      const respJson = this.getForcedResponse(productInfo);
      this.clearForcedResponse(productInfo);
      if (JSON.parse(respJson).type == "error") {
        this.logger.debug("Forced error for check");
        onerror();
      } else {
        this.logger.debug("Forced response for check: " + respJson);
        onresponse(respJson);
      }
    } else {
      this.send(this.url, productInfo, onresponse, onerror);
    }
  }
  send(url, productInfo, onsuccess, onerror) {
    this.logger.debug("Sending request to " + url);
    var req = new XMLHttpRequest();
    req.withCredentials = true;
    req.addEventListener("readystatechange", function () {
      if (req.readyState === XMLHttpRequest.DONE && req.status === 200) {
        onsuccess(req.responseText);
      }
    });
    req.addEventListener("error", function () {
      onerror();
    });
    req.open("GET", url);
    req.setRequestHeader("check-source","webcomponent");
    req.setRequestHeader("product-name", productInfo.name);
    req.setRequestHeader("product-version", productInfo.version);

    req.send();
  };
}
class LicenseOkNotifier {
  static get id() {
    return 'vaadin-license-validation-ok';
  }
  getInstance() {
    return document.getElementById(LicenseOkNotifier.id);
  }
  show(productInfo) {
    // Only show one ok box even if multiple licenses were checked
    if (this.getInstance()) {
      // Already shown
      return;
    }
    const instance = document.createElement("vaadin-license-box");
    instance.id = LicenseOkNotifier.id;
    instance.type = "ok";
    instance.content = "Your license has been validated";
    document.body.appendChild(instance);
    instance.addEventListener("click", function () {
      instance.parentElement.removeChild(instance);
    });
  }
}
class LicenseValidationNeededNotifier {
  id(productInfo) {
    return "vaadin-license-validation-notification-{product}".replace("{product}", productInfo.name);
  }
  getInstance(productInfo) {
    return document.getElementById(this.id(productInfo));
  }
  show(productInfo) {
    if (this.getInstance(productInfo)) {
      // Already shown
      return;
    }
    const instance = document.createElement("vaadin-license-box");
    instance.id = this.id(productInfo);
    instance.type = "needsvalidation";
    instance.content = "This application is using components which are part of a Vaadin subscription.<br>Click here to get a trial or validate your subscription";
    document.body.appendChild(instance);
    instance.addEventListener("click", function () {
      window.open("https://vaadin.com/pro/validate-license", "_blank");
    });
  }
  hide(productInfo) {
    const instance = this.getInstance(productInfo);
    if (instance) {
      instance.parentElement.removeChild(instance);
    }
  }
  isVisible(productInfo) {
    return !!this.getInstance(productInfo);
  }
}

const proProducts = [];

window.Vaadin = window.Vaadin || {};
window.Vaadin.LicenseChecker = window.Vaadin.VaadinLicenseChecker || new VaadinLicenseChecker();
window.Vaadin.LicenseCheckerClass = window.Vaadin.LicenseCheckerClass || VaadinLicenseChecker;
window.Vaadin.developmentModeCallback = window.Vaadin.developmentModeCallback || {};
window.Vaadin.developmentModeCallback["vaadin-license-checker"] = function (cls) {
  var productInfo = { name: cls.is, version: cls.version };
  proProducts.push(productInfo);
  window.addEventListener("message", function (e) {
    if (e.data == "validate-license") {
      window.Vaadin.LicenseChecker.check(productInfo);
    }
  }, false);

  window.Vaadin.checkLicenses = function () {
    // Force checking of all licenses to avoid e.g. popups during presentations when the grace period just has ended
    proProducts.forEach(function(productInfo){
      window.Vaadin.LicenseChecker.check(productInfo);
    });
  }

  window.Vaadin.LicenseChecker.maybeCheck(productInfo);
};
