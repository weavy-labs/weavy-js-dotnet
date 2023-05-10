import { asElement } from "../utils/dom";
import WeavyPromise from "../utils/promise";
import { whenTimeout } from "../utils/timeout";
import WeavyPostal from "../utils/postal-parent";
import WeavyConsole from "../utils/console";
import WeavyRoot from "./dom-root";
import WeavyDialog from "./dialog";

const console = new WeavyConsole("Status");

// STATUS CHECK
var statusFrame = null;

/**
 * Checks that frame communication is not blocked.
 **/
export default function frameStatusCheck(environment) {
  var statusUrl = new URL("/dropin/client/ping", environment.url);

  var storageAccessAvailable = "hasStorageAccess" in document;

  var whenFrameCookiesChecked = new WeavyPromise();
  var whenFrameCookiesEnabled = new WeavyPromise();
  var whenFrameStatusCheck = new WeavyPromise();
  var whenFrameReady = new WeavyPromise();

  var whenStatusTimeout = whenTimeout(3000);

  var dialog, dialogRoot, dialogCookie, dialogStorage;

  if (!statusFrame) {
    console.log("Frame Check: Started...");

    // frame status checking
    statusFrame = document.createElement("iframe");
    statusFrame.className = "wy-status-check";
    statusFrame.hidden = true;
    statusFrame.id = environment.getId("status-check");
    statusFrame.setAttribute("name", environment.getId("status-check"));

    dialogRoot ??= new WeavyRoot(
      document.documentElement,
      null
    );

    dialog ??= new WeavyDialog(dialogRoot)

    var requestStorageAccess = () => {
      whenStatusTimeout.cancel();

      var msgText = asElement(
        '<div class="wy-text">Third party cookies are required to use collaborative features on this page.</div>'
      );
      var msgButton = asElement(
        '<button class="wy-button">Enable cookies</button>'
      );

      var storageAccessWindow;

      msgButton.onclick = () => {
        console.log("Frame Check: Opening storage access request");
        storageAccessWindow = window.open(
          new URL("/dropin/client/cookie-access", environment.url),
          environment.getId("storage-access")
        );
        WeavyPostal.registerContentWindow(
          storageAccessWindow,
          environment.getId("storage-access"),
          environment.getId(),
          environment.url.origin
        );
        
        // TODO: STYLING???
        /*WeavyPostal.one(
          "ready",
          { weavyId: environment.getId(), windowName: environment.getId("storage-access") },
          () => {
            let styles = weavy.root.styles.getAllCSS();
            let className = weavy.className;
            let styleMessage = {
              name: "styles",
              id: null,
              css: styles,
              className: className,
            };
            WeavyPostal.postToFrame(
              weavy.getId("storage-access"),
              weavy.getId(),
              styleMessage
            );
          }
        );*/
      };

      var msg = document.createElement("template").content;
      msg.append(msgText, msgButton);
      
      dialogStorage = dialog.message(msg, true);
      
      WeavyPostal.one(
        "storage-access-granted",
        { weavyId: true, domain: environment.url.origin },
        () => {
          console.log(
            "Frame Check: Storage access was granted, authenticating and reloading status check."
          );

          if (dialogCookie) {
            dialogCookie.remove();
            dialogCookie = null;
          }

          if (dialogStorage) {
            dialogStorage.remove();
            dialogStorage = null;
          }
          let weavyId = environment.getId();

          environment.authentication.signIn().then(() => {
            console.debug("Frame Check: reloading status check");
            WeavyPostal.postToFrame(environment.getId("status-check"), weavyId, {
              name: "reload",
            });
          });
        }
      );
    };

    // TODO: UNREGISTER
    WeavyPostal.on(
      "user-status",
      { weavyId: environment.getId(), windowName: environment.getId("status-check") },
      (userStatus) => {
        var cookieIsValid =
          parseInt(userStatus.id) === parseInt(environment.authentication.user.id);
        console.debug("Frame Check: user-status received", cookieIsValid);
        whenFrameCookiesChecked.resolve(cookieIsValid);

        if (!cookieIsValid) {
          if (storageAccessAvailable) {
            requestStorageAccess();
          } else if (!storageAccessAvailable) {
            console.error("Allow third party cookies to use collaborative features on this page.")

            dialogCookie = dialog.message("Allow third party cookies to use collaborative features on this page.");
          }
        } else {
          whenFrameCookiesEnabled.resolve();
        }
      }
    );

    WeavyPostal.one(
      "ready",
      { weavyId: environment.getId(), windowName: environment.getId("status-check") },
      () => {
        console.debug("Frame Check: frame ready");
        whenFrameReady.resolve();
      }
    );

    // Frame network investigator triggered when status frame timeout
    whenStatusTimeout.then(() => {
      environment
        .fetch(statusUrl)
        .then((response) => {
          console.warn(
            "Status check timeout. Please make sure your web server is properly configured."
          );

          if (response.ok) {
            if (response.headers.has("X-Frame-Options")) {
              let frameOptions = response.headers.get("X-Frame-Options");
              if (
                frameOptions === "DENY" ||
                (frameOptions === "SAMEORIGIN" &&
                  statusUrl.origin !== window.location.origin)
              ) {
                return Promise.reject(
                  new Error("Frames are blocked by header X-Frame-Options")
                );
              }
            }

            if (response.headers.has("Content-Security-Policy")) {
              let secPolicy = response.headers
                .get("Content-Security-Policy")
                .split(";");

              let frameAncestors = secPolicy
                .filter((policy) => {
                  return policy.indexOf("frame-ancestors") === 0;
                })
                .pop();

              if (frameAncestors) {
                let faDomains = frameAncestors.split(" ");
                faDomains.splice(0, 1);

                let matchingDomains = faDomains.filter((domain) => {
                  if (
                    domain === "'self'" &&
                    environment.url.origin === window.location.origin
                  ) {
                    return true;
                  } else if (domain.indexOf("*")) {
                    return window.location.origin.endsWith(
                      domain.split("*").pop()
                    );
                  } else if (domain === window.location.origin) {
                    return true;
                  }
                  return false;
                });

                if (!matchingDomains.length) {
                  return Promise.reject(
                    new Error(
                      "Frames blocked by header Content-Security-Policy: frame-ancestors"
                    )
                  );
                }
              }
            }
          } else {
            return Promise.reject(
              new Error("Error fetching status url: " + response.statusText)
            );
          }
        })
        .catch((error) => {
          console.error("Frame status error detected: " + error.message);
        });
    });

    document.documentElement.appendChild(statusFrame);

    whenTimeout(1).then(() => {
      statusFrame.src = statusUrl.href;
      environment.isBlocked = true;

      try {
        WeavyPostal.registerContentWindow(
          statusFrame.contentWindow,
          environment.getId("status-check"),
          environment.getId(),
          environment.url.origin
        );
      } catch (e) {
        console.warn("Frame postMessage is blocked", e);
        environment.triggerEvent("frame-check", { blocked: true });
      }
    });

    return Promise.all([whenFrameReady(), whenFrameCookiesEnabled()])
      .then(() => {
        console.log("Frame Check:", "OK");
        environment.isBlocked = false;

        whenStatusTimeout.cancel();

        if (dialogCookie) {
          dialogCookie.remove();
          dialogCookie = null;
        }

        if (dialogStorage) {
          dialogStorage.remove();
          dialogStorage = null;
        }

        /**
         * Triggered when the frame check is done.
         *
         * @category events
         * @event Weavy#frame-check
         * @returns {WeavyPromise}
         * @property {boolean} blocked - Whether iframes communication is blocked or not.
         * @resolves {WeavyPromise}
         **/
        environment.triggerEvent("frame-check", { blocked: false });
        whenFrameStatusCheck.resolve({ blocked: false });
        return whenFrameStatusCheck();
      })
      .catch((error) => {
        environment.triggerEvent("frame-check", { blocked: true });
        whenFrameStatusCheck.reject(
          new Error("Frame check failed: " + error.message)
        );
        return whenFrameStatusCheck();
      });
  }
}
