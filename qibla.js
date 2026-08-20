const KAABA_LAT = 21.422487;
const KAABA_LNG = 39.826206;

const locateButton = document.getElementById("locate");
const statusText = document.getElementById("status");
const result = document.getElementById("result");
const place = document.getElementById("place");
const needle = document.getElementById("needle");
const degrees = document.getElementById("degrees");
const bearingLabel = document.getElementById("bearing-label");
const distanceText = document.getElementById("distance");
const compassState = document.getElementById("compassState");

let qiblaBearing = null;
let heading = null;
let compassStarted = false;

function toRadians(value) {
  return value * Math.PI / 180;
}

function toDegrees(value) {
  return value * 180 / Math.PI;
}

function normalize(value) {
  return (value + 360) % 360;
}

function calculateQibla(lat, lng) {
  const lat1 = toRadians(lat);
  const lat2 = toRadians(KAABA_LAT);
  const deltaLng = toRadians(KAABA_LNG - lng);

  const y = Math.sin(deltaLng);

  const x =
    Math.cos(lat1) * Math.tan(lat2) -
    Math.sin(lat1) * Math.cos(deltaLng);

  return normalize(toDegrees(Math.atan2(y, x)));
}

function distanceKm(lat1, lng1) {
  const R = 6371;

  const dLat = toRadians(KAABA_LAT - lat1);
  const dLng = toRadians(KAABA_LNG - lng1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
    Math.cos(toRadians(KAABA_LAT)) *
    Math.sin(dLng / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function showBearing() {
  if (qiblaBearing === null) return;

  degrees.textContent = `${Math.round(qiblaBearing)}°`;

  if (heading === null) {
    needle.style.transform =
      `rotate(${qiblaBearing}deg)`;

    bearingLabel.textContent = "from true north";

    compassState.textContent =
      "Compass unavailable — use the bearing shown above.";

    return;
  }

  const rotation = qiblaBearing - heading;

  needle.style.transform =
    `rotate(${rotation}deg)`;

  bearingLabel.textContent = "to the Qibla";

  compassState.textContent =
    "● Qibla navigation active";
}

function orientationHandler(event) {

  let newHeading = null;

  /*
   * iPhone / iPad Safari
   */
  if (
    typeof event.webkitCompassHeading === "number" &&
    event.webkitCompassHeading >= 0
  ) {
    newHeading = event.webkitCompassHeading;
  }

  /*
   * Android / other browsers
   */
  else if (
    event.absolute === true &&
    event.alpha !== null
  ) {
    newHeading = normalize(360 - event.alpha);
  }

  if (newHeading === null) return;

  heading = newHeading;

  showBearing();
}

function startCompass() {

  if (compassStarted) return;

  compassStarted = true;

  window.addEventListener(
    "deviceorientationabsolute",
    orientationHandler,
    true
  );

  window.addEventListener(
    "deviceorientation",
    orientationHandler,
    true
  );

  compassState.textContent = "● Calibrating compass…";

  setTimeout(() => {
    if (heading !== null) {
      compassState.textContent =
        "● Qibla navigation active";
    }
  }, 1500);
}

async function requestCompass() {

  try {

    /*
     * iOS requires explicit permission.
     * This function is called directly from
     * the user's location button.
     */
    if (
      typeof DeviceOrientationEvent !== "undefined" &&
      typeof DeviceOrientationEvent.requestPermission === "function"
    ) {

      const permission =
        await DeviceOrientationEvent.requestPermission();

      if (permission !== "granted") {

        compassState.textContent =
          "Compass permission was not granted.";

        showBearing();

        return;
      }
    }

    startCompass();

  } catch (error) {

    console.log("Compass permission error:", error);

    showBearing();
  }
}

function getLocation() {

  if (!navigator.geolocation) {

    statusText.textContent =
      "Location is not available on this device.";

    return;
  }

  locateButton.disabled = true;

  locateButton.textContent =
    "◎ Locating…";

  statusText.textContent =
    "Finding your position and starting Qibla navigation…";

  navigator.geolocation.getCurrentPosition(

    async position => {

      const lat = position.coords.latitude;
      const lng = position.coords.longitude;

      qiblaBearing = calculateQibla(lat, lng);

      const distance = distanceKm(lat, lng);

      result.hidden = false;

      place.textContent =
        "Your current location";

      distanceText.textContent =
        `Distance to the Kaaba: ${Math.round(distance).toLocaleString()} km`;

      statusText.textContent =
        "Location found. Starting navigation…";

      locateButton.textContent =
        "✓ Qibla navigation active";

      showBearing();

      /*
       * IMPORTANT:
       * Compass permission is requested immediately
       * from the same user action.
       */
      await requestCompass();

    },

    error => {

      console.log(error);

      locateButton.disabled = false;

      locateButton.textContent =
        "◎ Use my location";

      if (error.code === 1) {

        statusText.textContent =
          "Please allow location access to find your Qibla.";

      } else {

        statusText.textContent =
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

locateButton.addEventListener(
  "click",
  getLocation
);
