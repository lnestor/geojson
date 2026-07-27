// ==UserScript==
// @name         Geoguessr Overlaps
// @namespace    http://tampermonkey.net/
// @version      2026-07-27
// @description  try to take over the world!
// @author       You
// @match        *://*.geoguessr.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=tampermonkey.net
// @grant        none
// @run-at document-start
// ==/UserScript==

const OVERLAYS = [
    {
        id: "france_phone",
        name: "France - Phone Codes",
        url: "https://raw.githubusercontent.com/lnestor/geojson/main/jsons/france_phone_codes.geojson"
    }
]

const LABEL_PROPERTY = "label";

let labelMode = "off";
let activeOverlay = null;
let currentMap = null;

function applyLabelMode() {
    if (!activeOverlay) return;
    for (const marker of activeOverlay.markers) {
        marker.setVisible(labelMode === "on");
    }
}

function clearActiveOverlay() {
    if (!activeOverlay) return;
    activeOverlay.dataLayer.setMap(null);
    for (const marker of activeOverlay.markers) marker.setMap(null);
    activeOverlay = null;
}

function loadOverlay(config) {
    if (!currentMap) return;
    const google = window.google || unsafeWindow.google;

    clearActiveOverlay();

    const dataLayer = new google.maps.Data({ map: currentMap });
    activeOverlay = { dataLayer, markers: [], config };

    dataLayer.setStyle({
        fillOpacity: 0.0,
        strokeColor: "#000000",
        strokeWeight: 1,
        clickable: false,
    });

    dataLayer.loadGeoJson(config.url, null, () => {
        dataLayer.forEach((feature) => {
            const labelText = feature.getProperty(LABEL_PROPERTY);
            const lat = feature.getProperty("label_lat");
            const lng = feature.getProperty("label_lng");

            const marker = new google.maps.Marker({
                position: { lat, lng },
                map: currentMap,
                icon: { path: google.maps.SymbolPath.CIRCLE, scale: 0 },
                label: {
                    text: labelText || "??",
                    color: labelText ? "#000000" : "#ff3333",
                    fontSize: "13px",
                    fontWeight: "bold",
                },
                clickable: false,
                visible: false,
            });

            activeOverlay.markers.push(marker);
        });

        applyLabelMode();
    });
}

function checkForGoogleScriptTag(mutations) {
    for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
            if (node.src && node.src.startsWith("https://maps.googleapis.com/")) {
                return node;
            }
        }
    }
    return null;
}

(function() {
    'use strict';

    const watcher = new MutationObserver((mutations) => {
        const script = checkForGoogleScriptTag(mutations);
        if (!script) return;

        watcher.disconnect();

        const oldOnloadCallback = script.onload;
        script.onload = (event) => {
            const google = window.google || unsafeWindow.google;

            google.maps.Map = class extends google.maps.Map {
                constructor(...args) {
                    super(...args);
                    currentMap = this;
                }
            };

            if(oldOnloadCallback) oldOnloadCallback.call(script, event);
        };
    });

    document.addEventListener("DOMContentLoaded", () => {
        watcher.observe(document.documentElement, { childList: true, subtree: true });

        const button = document.createElement("div");
        button.id = "geo-overlay-toggle";
        button.textContent = `LABELS: ${labelMode.toUpperCase()}`;
        button.style.cssText = `
          position: fixed;
          top: 3rem;
          left: 1rem;
          z-index: 9999;
          background: #222;
          color: #fff;
          padding: 6px 12px;
          font: bold 13px sans-serif;
          border-radius: 4px;
          cursor: pointer;
          user-select: none;
      `;
        button.addEventListener("click", () => {
            labelMode = labelMode === "off" ? "on" : "off";
            button.textContent = `LABELS: ${labelMode.toUpperCase()}`;
            applyLabelMode();
        });

        document.body.appendChild(button);

        const select = document.createElement("select");
        select.id = "geo-overlay-select";
        select.style.cssText = `
      position: fixed;
      top: 5rem;
      left: 1rem;
      z-index: 9999;
      padding: 4px 8px;
      font: bold 13px sans-serif;
      border-radius: 4px;
       `;

        const noneOption = document.createElement("option");
        noneOption.value = "";
        noneOption.textContent = "None";
        select.appendChild(noneOption);

        for (const config of OVERLAYS) {
            const option = document.createElement("option");
            option.value = config.id;
            option.textContent = config.name;
            select.appendChild(option);
        }

        select.addEventListener("change", () => {
            if (!select.value) {
                clearActiveOverlay();
                return;
            }
            const config = OVERLAYS.find((o) => o.id === select.value);
            if (config) loadOverlay(config);
        });

        document.body.appendChild(select);
    });
})();
