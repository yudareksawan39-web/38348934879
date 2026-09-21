// ==========================================
// KOORDINAT KA'BAH
// ==========================================

const KAABAH_LAT = 21.422487;
const KAABAH_LON = 39.826206;


// ==========================================
// ELEMEN HTML
// ==========================================

const startButton =
    document.getElementById("startButton");

const latitudeElement =
    document.getElementById("latitude");

const longitudeElement =
    document.getElementById("longitude");

const accuracyElement =
    document.getElementById("accuracy");

const headingElement =
    document.getElementById("heading");

const qiblaElement =
    document.getElementById("qibla");

const differenceElement =
    document.getElementById("difference");

const distanceElement =
    document.getElementById("distance");

const statusElement =
    document.getElementById("status");

const arrowElement =
    document.getElementById("arrow");


// ==========================================
// VARIABEL
// ==========================================

let qiblaAzimuth = null;
let currentHeading = null;
let gpsWatchId = null;


// ==========================================
// KONVERSI
// ==========================================

function toRadians(degrees) {
    return degrees * Math.PI / 180;
}


function toDegrees(radians) {
    return radians * 180 / Math.PI;
}


// ==========================================
// HITUNG AZIMUT KIBLAT
// ==========================================

function calculateQibla(latitude, longitude) {

    const lat1 = toRadians(latitude);
    const lat2 = toRadians(KAABAH_LAT);

    const deltaLongitude =
        toRadians(KAABAH_LON - longitude);

    const y =
        Math.sin(deltaLongitude);

    const x =
        Math.cos(lat1) *
        Math.tan(lat2)
        -
        Math.sin(lat1) *
        Math.cos(deltaLongitude);

    let azimuth =
        toDegrees(
            Math.atan2(y, x)
        );

    azimuth =
        (azimuth + 360) % 360;

    return azimuth;
}


// ==========================================
// HITUNG JARAK
// ==========================================

function calculateDistance(latitude, longitude) {

    const R = 6371;

    const lat1 =
        toRadians(latitude);

    const lat2 =
        toRadians(KAABAH_LAT);

    const deltaLatitude =
        toRadians(
            KAABAH_LAT - latitude
        );

    const deltaLongitude =
        toRadians(
            KAABAH_LON - longitude
        );

    const a =
        Math.sin(deltaLatitude / 2) ** 2
        +
        Math.cos(lat1)
        *
        Math.cos(lat2)
        *
        Math.sin(deltaLongitude / 2) ** 2;

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}


// ==========================================
// NORMALISASI SUDUT
// ==========================================

function normalizeAngle(angle) {

    return (
        (angle + 540) % 360
    ) - 180;

}


// ==========================================
// UPDATE POSISI GPS
// ==========================================

function updateGPS(position) {

    const latitude =
        position.coords.latitude;

    const longitude =
        position.coords.longitude;

    const accuracy =
        position.coords.accuracy;


    // Tampilkan koordinat

    latitudeElement.textContent =
        latitude.toFixed(6) + "°";

    longitudeElement.textContent =
        longitude.toFixed(6) + "°";

    accuracyElement.textContent =
        "± " +
        accuracy.toFixed(1) +
        " m";


    // Hitung azimut

    qiblaAzimuth =
        calculateQibla(
            latitude,
            longitude
        );


    qiblaElement.textContent =
        qiblaAzimuth.toFixed(2) + "°";


    // Hitung jarak

    const distance =
        calculateDistance(
            latitude,
            longitude
        );


    distanceElement.textContent =
        distance.toFixed(2) + " km";


    updateCompass();

    statusElement.textContent =
        "GPS aktif.";
}


// ==========================================
// UPDATE KOMPAS
// ==========================================

function updateCompass() {

    if (
        currentHeading === null ||
        qiblaAzimuth === null
    ) {
        return;
    }


    headingElement.textContent =
        currentHeading.toFixed(1) + "°";


    const difference =
        normalizeAngle(
            qiblaAzimuth -
            currentHeading
        );


    differenceElement.textContent =
        difference.toFixed(1) + "°";


    // Putar ikon Ka'bah menuju Kiblat

    arrowElement.style.transform =
        "translate(-50%, -50%) rotate(" +
        difference +
        "deg)";
}


// ==========================================
// SENSOR ORIENTASI
// ==========================================

function handleOrientation(event) {

    let heading = null;


    // iPhone / Safari

    if (
        typeof event.webkitCompassHeading ===
        "number"
    ) {

        heading =
            event.webkitCompassHeading;

    }


    // Browser lain

    else if (
        typeof event.alpha === "number"
    ) {

        heading =
            360 - event.alpha;

    }


    if (heading !== null) {

        currentHeading =
            (heading + 360) % 360;

        updateCompass();

    }
}


// ==========================================
// MEMULAI KOMPAS
// ==========================================

async function startCompass() {

    try {

        // Beberapa browser meminta izin sensor

        if (
            typeof DeviceOrientationEvent !==
            "undefined" &&
            typeof DeviceOrientationEvent.requestPermission ===
            "function"
        ) {

            const permission =
                await DeviceOrientationEvent
                    .requestPermission(true);

            if (permission !== "granted") {

                statusElement.textContent =
                    "Izin sensor kompas ditolak.";

                return;
            }
        }


        window.addEventListener(
            "deviceorientationabsolute",
            handleOrientation,
            true
        );


        window.addEventListener(
            "deviceorientation",
            handleOrientation,
            true
        );


        statusElement.textContent =
            "Sensor kompas aktif.";

    }

    catch (error) {

        statusElement.textContent =
            "Sensor kompas gagal: " +
            error.message;

    }
}


// ==========================================
// MULAI GPS
// ==========================================

function startGPS() {

    if (!navigator.geolocation) {

        statusElement.textContent =
            "GPS tidak tersedia di browser.";

        return;
    }


    gpsWatchId =
        navigator.geolocation.watchPosition(

            updateGPS,

            function(error) {

                statusElement.textContent =
                    "GPS gagal: " +
                    error.message;

            },

            {
                enableHighAccuracy: true,

                maximumAge: 0,

                timeout: 15000
            }
        );
}


// ==========================================
// TOMBOL MULAI
// ==========================================

startButton.addEventListener(
    "click",
    async function() {

        statusElement.textContent =
            "Memulai GPS dan kompas...";


        await startCompass();

        startGPS();

    }
);