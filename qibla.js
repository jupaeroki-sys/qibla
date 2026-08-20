"use strict";

const KAABA = {
  lat: 21.422487,
  lng: 39.826206
};

let qiblaBearing = null;
let heading = null;
let listening = false;

const locateBtn = document.getElementById("locate");
const compassBtn = document.getElementById("compassBtn");
const result = document.getElementById("result");
const status = document.getElementById("status");
const place = document.getElementById("place");
const needle = document.getElementById("needle");
const degrees = document.getElementById("degrees");
const bearingLabel = document.getElementById("bearing-label");
const distance = document.getElementById("distance");
const compassNote = document.getElementById("compassNote");

function toRad(value) {
  return value * Math.PI / 180;
}

function toDeg(value) {
  return value * 180 / Math.PI;
}

function calculateQibla(lat, lng) {
  const phi1 = toRad(lat);
  const phi2 = toRad(KAABA.lat);
  const deltaLambda = toRad(KAABA.lng - lng);

  const y = Math.sin(deltaLambda);
  const x =
    Math.cos(phi1) * Math.tan(phi2) -
    Math.sin(phi1) * Math.cos(deltaLambda);

  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) *
    Math.cos(lat2 * rad) *
    Math.sin(dLng / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function showLocation(lat, lng) {
  qiblaBearing = calculateQibla(lat, lng);

  const km = distanceKm(
    lat,
    lng,
    KAABA.lat,
    KAABA.lng
  );

  result.hidden = false;

  degrees.textContent = Math.round(qiblaBearing) + "°";

  distance.textContent =
    "Distance to the Kaaba: " +
    Math.round(km).toLocaleString() +
    " km.";

  place.textContent = "📍 Your current location";

  status.textContent =
    "Location found. Your Qibla direction is ready.";

  updateNeedle();
}

function updateNeedle() {
  if (qiblaBearing === null) return;

  const rotation =
    heading === null
      ? qiblaBearing
      : qiblaBearing - heading;

  needle.style.transform =
    "rotate(" + rotation + "deg)";

  degrees.textContent =
    Math.round(qiblaBearing) + "°";

  bearingLabel.textContent =
    heading === null
      ? "from true north"
      : "to the Qibla";

  compassNote.textContent =
    heading === null
      ? "Enable the live compass to follow the Qibla as you turn."
      : "The needle is live — it points toward the Qibla as you turn.";
}

function locate() {
  if (!navigator.geolocation) {
    status.textContent =
      "Location is not available on this device.";
    return;
  }

  locateBtn.disabled = true;
  locateBtn.textContent = "⌖ Locating…";
  status.textContent = "Please allow location access…";

  navigator.geolocation.getCurrentPosition(
    function(position) {
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      showLocation(lat, lng);

      locateBtn.disabled = false;
      locateBtn.textContent = "⌖ Use my location";
    },
    function(error) {
      locateBtn.disabled = false;
      locateBtn.textContent = "⌖ Use my location";

      if (error.code === 1) {
        status.textContent =
          "Location permission was denied. Please allow location access.";
      } else {
        status.textContent =
          "Could not get your location. Please try again.";
      }
    },
    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }
  );
}

function onOrientation(event) {
  let value = null;

  if (
    typeof event.webkitCompassHeading === "number" &&
    Number.isFinite(event.webkitCompassHeading)
  ) {
    value = event.webkitCompassHeading;
  } else if (
    event.absolute &&
    event.alpha !== null
  ) {
    value = (360 - event.alpha) % 360;
  }

  if (value !== null) {
    heading = value;
    updateNeedle();
  }
}

async function enableCompass() {
  try {
    const DeviceOrientation =
      window.DeviceOrientationEvent;

    if (
      DeviceOrientation &&
      typeof DeviceOrientation.requestPermission === "function"
    ) {
      const permission =
        await DeviceOrientation.requestPermission();

      if (permission !== "granted") {
        compassNote.textContent =
          "Compass permission was not granted.";
        return;
      }
    }

    if (!listening) {
      window.addEventListener(
        "deviceorientationabsolute",
        onOrientation,
        true
      );

      window.addEventListener(
        "deviceorientation",
        onOrientation,
        true
      );

      listening = true;
    }

    compassBtn.textContent =
      "◎ Live compass active";

    compassBtn.classList.add("active");

    compassNote.textContent =
      "The needle is live — it points toward the Qibla as you turn.";

  } catch (error) {
    console.error(error);

    compassNote.textContent =
      "This device does not provide a usable compass sensor.";
  }
}

locateBtn.addEventListener("click", locate);
compassBtn.addEventListener("click", enableCompass);

window.addEventListener("pagehide", function() {
  window.removeEventListener(
    "deviceorientationabsolute",
    onOrientation,
    true
  );

  window.removeEventListener(
    "deviceorientation",
    onOrientation,
    true
  );
});
