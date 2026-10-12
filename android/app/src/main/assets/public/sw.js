/**
 * Copyright 2018 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *     http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// If the loader is already loaded, just stop.
if (!self.define) {
  let registry = {};

  // Used for `eval` and `importScripts` where we can't get script URL by other means.
  // In both cases, it's safe to use a global var because those functions are synchronous.
  let nextDefineUri;

  const singleRequire = (uri, parentUri) => {
    uri = new URL(uri + ".js", parentUri).href;
    return registry[uri] || (
      
        new Promise(resolve => {
          if ("document" in self) {
            const script = document.createElement("script");
            script.src = uri;
            script.onload = resolve;
            document.head.appendChild(script);
          } else {
            nextDefineUri = uri;
            importScripts(uri);
            resolve();
          }
        })
      
      .then(() => {
        let promise = registry[uri];
        if (!promise) {
          throw new Error(`Module ${uri} didn’t register its module`);
        }
        return promise;
      })
    );
  };

  self.define = (depsNames, factory) => {
    const uri = nextDefineUri || ("document" in self ? document.currentScript.src : "") || location.href;
    if (registry[uri]) {
      // Module is already loading or loaded.
      return;
    }
    let exports = {};
    const require = depUri => singleRequire(depUri, uri);
    const specialDeps = {
      module: { uri },
      exports,
      require
    };
    registry[uri] = Promise.all(depsNames.map(
      depName => specialDeps[depName] || require(depName)
    )).then(deps => {
      factory(...deps);
      return exports;
    });
  };
}
define(['./workbox-7e5eb42b'], (function (workbox) { 'use strict';

  self.skipWaiting();
  workbox.clientsClaim();
  /**
   * The precacheAndRoute() method efficiently caches and responds to
   * requests for URLs in the manifest.
   * See https://goo.gl/S9QRab
   */
  workbox.precacheAndRoute([{
    "url": "terms.html",
    "revision": "4e0e3718335b86576decb7aa7ef4bc98"
  }, {
    "url": "reset-password.html",
    "revision": "30bc058e643973a4e37841111bc6066f"
  }, {
    "url": "registerSW.js",
    "revision": "1872c500de691dce40960bb85481de07"
  }, {
    "url": "pwa-512x512.png",
    "revision": "4a940c84bba05092c024753a50c28982"
  }, {
    "url": "privacy.html",
    "revision": "b708a11762abd823434b7f1987b44c89"
  }, {
    "url": "index.html",
    "revision": "4604d36adce79df2c7536626fdab1508"
  }, {
    "url": "icon.svg",
    "revision": "233b6b54cc524dc27584d66e3a25935a"
  }, {
    "url": "delete-account.html",
    "revision": "8f7c9f109d023c39a4c78a1d46f585dd"
  }, {
    "url": "apple-touch-icon.png",
    "revision": "4a940c84bba05092c024753a50c28982"
  }, {
    "url": "assets/zap-h5QMgbxQ.js",
    "revision": null
  }, {
    "url": "assets/web-DovIhZck.js",
    "revision": null
  }, {
    "url": "assets/web-Dlabfa2Z.js",
    "revision": null
  }, {
    "url": "assets/web-BV-G2roY.js",
    "revision": null
  }, {
    "url": "assets/index-CrhCNHIF.css",
    "revision": null
  }, {
    "url": "assets/index-BAvfq72e.js",
    "revision": null
  }, {
    "url": "assets/BusinessPortalView-CnUrzMJ7.js",
    "revision": null
  }, {
    "url": "assets/AdminPortalView-CSVEXqF8.js",
    "revision": null
  }], {});
  workbox.cleanupOutdatedCaches();
  workbox.registerRoute(new workbox.NavigationRoute(workbox.createHandlerBoundToURL("index.html")));

}));
