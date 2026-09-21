// =====================================================
// PANRITA FALAK
// KOMPAS ARAH KIBLAT + GPS + WAKTU SALAT
// =====================================================

// ===============================
// KOORDINAT KA'BAH
// ===============================

const KAABAH_LAT = 21.422487;
const KAABAH_LON = 39.826206;


// ===============================
// VARIABEL GLOBAL
// ===============================

let currentLatitude = null;
let currentLongitude = null;
let currentAccuracy = null;

let qiblaBearing = null;
let currentHeading = null;

let prayerTimesToday = {};

let compassStarted = false;
let usingAbsoluteSensor = false;


// ===============================
// FUNGSI ANGKA SUDUT
// ===============================

function normalizeAngle(angle) {
    return ((angle % 360) + 360) % 360;
}


// ===============================
// HITUNG ARAH KIBLAT
// ===============================
//
// Rumus azimut geodesik:
// bearing = atan2(
//   sin(dLon) * cos(lat2),
//   cos(lat1) * sin(lat2)
//   - sin(lat1) * cos(lat2) * cos(dLon)
// )
//
// Hasil: 0° - 360°
// 0°   = Utara
// 90°  = Timur
// 180° = Selatan
// 270° = Barat
// ===============================

function calculateQiblaBearing(latitude, longitude) {

    const lat1 = latitude * Math.PI / 180;
    const lat2 = KAABAH_LAT * Math.PI / 180;

    const deltaLon =
        (KAABAH_LON - longitude) * Math.PI / 180;

    const y =
        Math.sin(deltaLon) *
        Math.cos(lat2);

    const x =
        Math.cos(lat1) *
        Math.sin(lat2) -
        Math.sin(lat1) *
        Math.cos(lat2) *
        Math.cos(deltaLon);

    const bearing =
        Math.atan2(y, x) *
        180 / Math.PI;

    return normalizeAngle(bearing);
}


// ===============================
// HITUNG JARAK KE KA'BAH
// ===============================

function calculateDistance(
    lat1,
    lon1,
    lat2,
    lon2
) {

    const R = 6371;

    const dLat =
        (lat2 - lat1) *
        Math.PI / 180;

    const dLon =
        (lon2 - lon1) *
        Math.PI / 180;

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) ** 2;

    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );

    return R * c;
}


// ===============================
// KONVERSI DERAJAT KE ARAH
// ===============================

function getDirectionName(degrees) {

    const directions = [
        "Utara",
        "Timur Laut",
        "Timur",
        "Tenggara",
        "Selatan",
        "Barat Daya",
        "Barat",
        "Barat Laut"
    ];

    const index =
        Math.round(degrees / 45) % 8;

    return directions[index];
}


// ===============================
// UPDATE TAMPILAN KIBLAT
// ===============================

function updateQiblaDisplay() {

    if (qiblaBearing === null) {
        return;
    }

    const qiblaElement =
        document.getElementById("qiblaDirection");

    if (!qiblaElement) {
        return;
    }

    qiblaElement.textContent =
        qiblaBearing.toFixed(2) +
        "° " +
        getDirectionName(qiblaBearing);
}


// ===============================
// UPDATE JARUM KIBLAT
// ===============================

function updateNeedle() {

    if (
        qiblaBearing === null ||
        currentHeading === null
    ) {
        return;
    }

    /*
       Jarum menunjukkan arah kiblat
       relatif terhadap arah HP.

       Contoh:

       Kiblat = 292°
       HP menghadap = 250°

       Jarum:
       292 - 250
       = 42°

       Artinya jarum bergerak 42°
       ke kanan dari arah depan HP.
    */

    const relativeAngle =
        normalizeAngle(
            qiblaBearing -
            currentHeading
        );

    const needle =
        document.getElementById("needle");

    if (!needle) {
        return;
    }

    needle.style.transform =
        `rotate(${relativeAngle}deg)`;
}


// ===============================
// GPS BERHASIL
// ===============================

async function updateGPS(position) {

    const latitude =
        position.coords.latitude;

    const longitude =
        position.coords.longitude;

    const accuracy =
        position.coords.accuracy;

    currentLatitude = latitude;
    currentLongitude = longitude;
    currentAccuracy = accuracy;


    // Tampilkan koordinat

    document.getElementById(
        "latitude"
    ).textContent =
        latitude.toFixed(6);

    document.getElementById(
        "longitude"
    ).textContent =
        longitude.toFixed(6);

    document.getElementById(
        "accuracy"
    ).textContent =
        "±" +
        accuracy.toFixed(1) +
        " m";


    // ===============================
    // HITUNG KIBLAT
    // ===============================

    qiblaBearing =
        calculateQiblaBearing(
            latitude,
            longitude
        );

    updateQiblaDisplay();


    // ===============================
    // HITUNG JARAK
    // ===============================

    const distance =
        calculateDistance(
            latitude,
            longitude,
            KAABAH_LAT,
            KAABAH_LON
        );

    document.getElementById(
        "distance"
    ).textContent =
        distance.toFixed(2) +
        " km";


    // ===============================
    // STATUS GPS
    // ===============================

    document.getElementById(
        "status"
    ).textContent =
        "✓ GPS aktif • Kiblat " +
        qiblaBearing.toFixed(2) +
        "°";


    // ===============================
    // WAKTU SALAT
    // ===============================

    await calculatePrayerTimes(
        latitude,
        longitude
    );


    // Update jarum

    updateNeedle();
}


// ===============================
// GPS ERROR
// ===============================

function gpsError(error) {

    let message =
        "GPS tidak dapat digunakan.";

    if (error.code === 1) {
        message =
            "Izin lokasi ditolak.";
    }

    if (error.code === 2) {
        message =
            "Lokasi tidak tersedia.";
    }

    if (error.code === 3) {
        message =
            "GPS terlalu lama merespons.";
    }

    document.getElementById(
        "status"
    ).textContent = message;

    console.error(
        "GPS ERROR:",
        error
    );
}


// ===============================
// MULAI GPS
// ===============================

function startGPS() {

    if (!navigator.geolocation) {

        document.getElementById(
            "status"
        ).textContent =
            "Browser tidak mendukung GPS.";

        return;
    }

    navigator.geolocation.watchPosition(
        updateGPS,
        gpsError,
        {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 15000
        }
    );
}


// =====================================================
// KOMPAS
// =====================================================


// ===============================
// HALUSKAN GERAKAN KOMPAS
// ===============================

function smoothAngle(
    oldAngle,
    newAngle,
    factor = 0.15
) {

    if (oldAngle === null) {
        return newAngle;
    }

    let difference =
        normalizeAngle(
            newAngle -
            oldAngle
        );

    if (difference > 180) {
        difference -= 360;
    }

    return normalizeAngle(
        oldAngle +
        difference * factor
    );
}


// ===============================
// BACA SENSOR KOMPAS
// ===============================

function handleOrientation(event) {

    let heading = null;


    // iPhone / Safari

    if (
        typeof event.webkitCompassHeading ===
        "number" &&
        !isNaN(event.webkitCompassHeading)
    ) {

        heading =
            event.webkitCompassHeading;
    }


    // Sensor absolute

    else if (
        event.absolute === true &&
        typeof event.alpha ===
        "number"
    ) {

        heading =
            360 - event.alpha;

        usingAbsoluteSensor = true;
    }


    // Sensor biasa

    else if (
        typeof event.alpha ===
        "number"
    ) {

        heading =
            360 - event.alpha;
    }


    if (
        heading === null ||
        isNaN(heading)
    ) {
        return;
    }


    heading =
        normalizeAngle(heading);


    currentHeading =
        smoothAngle(
            currentHeading,
            heading,
            0.20
        );


    document.getElementById(
        "heading"
    ).textContent =
        currentHeading.toFixed(1) +
        "°";


    updateNeedle();
}


// ===============================
// AKTIFKAN KOMPAS
// ===============================

async function startCompass() {

    if (compassStarted) {
        return;
    }

    try {

        /*
           iPhone / Safari meminta izin sensor
           melalui user interaction.
        */

        if (
            typeof DeviceOrientationEvent !==
            "undefined" &&

            typeof DeviceOrientationEvent
                .requestPermission ===
                "function"
        ) {

            const permission =
                await DeviceOrientationEvent
                    .requestPermission();

            if (
                permission !==
                "granted"
            ) {

                document.getElementById(
                    "status"
                ).textContent =
                    "Izin sensor kompas ditolak.";

                return;
            }
        }


        // Sensor absolut

        window.addEventListener(
            "deviceorientationabsolute",
            handleOrientation,
            true
        );


        // Sensor umum

        window.addEventListener(
            "deviceorientation",
            handleOrientation,
            true
        );


        compassStarted = true;


        document.getElementById(
            "status"
        ).textContent =
            "✓ Kompas aktif. Kalibrasikan HP dengan menjauhkannya dari benda magnetik.";

    }

    catch (error) {

        console.error(
            "COMPASS ERROR:",
            error
        );

        document.getElementById(
            "status"
        ).textContent =
            "Sensor kompas tidak dapat digunakan.";
    }
}


// =====================================================
// WAKTU
// =====================================================

function updateRealTimeClock() {

    const now =
        new Date();

    const hours =
        String(
            now.getHours()
        ).padStart(2, "0");

    const minutes =
        String(
            now.getMinutes()
        ).padStart(2, "0");

    const seconds =
        String(
            now.getSeconds()
        ).padStart(2, "0");

    const clock =
        document.getElementById(
            "realTimeClock"
        );

    if (clock) {

        clock.textContent =
            `${hours}:${minutes}:${seconds}`;
    }
}

updateRealTimeClock();

setInterval(
    updateRealTimeClock,
    1000
);


// =====================================================
// WAKTU SALAT
// =====================================================

/*
   AlAdhan menyediakan metode:
   20 = Kementerian Agama Republik Indonesia

   school:
   0 = Shafi / standar
*/

const PRAYER_METHOD = 20;
const PRAYER_SCHOOL = 0;


async function calculatePrayerTimes(
    latitude,
    longitude
) {

    try {

        const now =
            new Date();

        const day =
            String(
                now.getDate()
            ).padStart(2, "0");

        const month =
            String(
                now.getMonth() + 1
            ).padStart(2, "0");

        const year =
            now.getFullYear();

        const date =
            `${day}-${month}-${year}`;


        const url =
            "https://api.aladhan.com/v1/timings/" +
            date +
            "?latitude=" +
            encodeURIComponent(latitude) +
            "&longitude=" +
            encodeURIComponent(longitude) +
            "&method=" +
            PRAYER_METHOD +
            "&school=" +
            PRAYER_SCHOOL;


        const response =
            await fetch(url);


        if (!response.ok) {
            throw new Error(
                "Gagal mengambil data waktu salat."
            );
        }


        const result =
            await response.json();


        if (
            result.code !== 200 ||
            !result.data
        ) {

            throw new Error(
                "Data waktu salat tidak tersedia."
            );
        }


        const timings =
            result.data.timings;


        prayerTimesToday = {

            fajr:
                cleanPrayerTime(
                    timings.Fajr
                ),

            sunrise:
                cleanPrayerTime(
                    timings.Sunrise
                ),

            dhuhr:
                cleanPrayerTime(
                    timings.Dhuhr
                ),

            asr:
                cleanPrayerTime(
                    timings.Asr
                ),

            maghrib:
                cleanPrayerTime(
                    timings.Maghrib
                ),

            isha:
                cleanPrayerTime(
                    timings.Isha
                )
        };


        displayPrayerTimes();

        updateNextPrayer();

    }

    catch (error) {

        console.error(
            "PRAYER ERROR:",
            error
        );

        document.getElementById(
            "nextPrayer"
        ).textContent =
            "Waktu salat gagal dimuat. Periksa koneksi internet.";
    }
}


// ===============================
// BERSIHKAN FORMAT WAKTU
// ===============================

function cleanPrayerTime(value) {

    if (
        !value ||
        typeof value !==
        "string"
    ) {
        return null;
    }

    const match =
        value.match(
            /^(\d{1,2}):(\d{2})/
        );

    if (!match) {
        return null;
    }

    return (
        String(
            Number(match[1])
        ).padStart(2, "0") +
        ":" +
        match[2]
    );
}


// ===============================
// TAMPILKAN WAKTU SALAT
// ===============================

function displayPrayerTimes() {

    document.getElementById(
        "fajr"
    ).textContent =
        prayerTimesToday.fajr ||
        "--:--";


    document.getElementById(
        "sunrise"
    ).textContent =
        prayerTimesToday.sunrise ||
        "--:--";


    document.getElementById(
        "dhuhr"
    ).textContent =
        prayerTimesToday.dhuhr ||
        "--:--";


    document.getElementById(
        "asr"
    ).textContent =
        prayerTimesToday.asr ||
        "--:--";


    document.getElementById(
        "maghrib"
    ).textContent =
        prayerTimesToday.maghrib ||
        "--:--";


    document.getElementById(
        "isha"
    ).textContent =
        prayerTimesToday.isha ||
        "--:--";
}


// ===============================
// WAKTU SALAT BERIKUTNYA
// ===============================

function updateNextPrayer() {

    if (
        !prayerTimesToday.fajr
    ) {
        return;
    }


    const now =
        new Date();


    const prayers = [

        {
            name: "Subuh",
            time: prayerTimesToday.fajr
        },

        {
            name: "Zuhur",
            time: prayerTimesToday.dhuhr
        },

        {
            name: "Asar",
            time: prayerTimesToday.asr
        },

        {
            name: "Magrib",
            time: prayerTimesToday.maghrib
        },

        {
            name: "Isya",
            time: prayerTimesToday.isha
        }

    ];


    let next = null;


    for (
        const prayer of prayers
    ) {

        if (!prayer.time) {
            continue;
        }


        const parts =
            prayer.time.split(":");


        const prayerDate =
            new Date();

        prayerDate.setHours(
            Number(parts[0]),
            Number(parts[1]),
            0,
            0
        );


        if (
            prayerDate > now
        ) {

            next = {
                name: prayer.name,
                date: prayerDate
            };

            break;
        }
    }


    // Jika semua waktu hari ini sudah lewat,
    // maka Subuh dianggap berikutnya.

    if (!next) {

        const parts =
            prayerTimesToday.fajr
                .split(":");


        const tomorrow =
            new Date();

        tomorrow.setDate(
            tomorrow.getDate() + 1
        );

        tomorrow.setHours(
            Number(parts[0]),
            Number(parts[1]),
            0,
            0
        );


        next = {
            name: "Subuh",
            date: tomorrow
        };
    }


    const difference =
        next.date.getTime() -
        now.getTime();


    const totalSeconds =
        Math.max(
            0,
            Math.floor(
                difference / 1000
            )
        );


    const hours =
        Math.floor(
            totalSeconds / 3600
        );

    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        );

    const seconds =
        totalSeconds % 60;


    document.getElementById(
        "nextPrayer"
    ).textContent =
        "Salat berikutnya: " +
        next.name +
        " • " +
        String(hours).padStart(2, "0") +
        ":" +
        String(minutes).padStart(2, "0") +
        ":" +
        String(seconds).padStart(2, "0");
}


// Update countdown setiap detik

setInterval(
    updateNextPrayer,
    1000
);


// =====================================================
// GOOGLE EARTH
// =====================================================

const earthButton =
    document.getElementById(
        "earthButton"
    );


if (earthButton) {

    earthButton.addEventListener(
        "click",
        function () {

            if (
                currentLatitude === null ||
                currentLongitude === null
            ) {

                alert(
                    "Lokasi GPS belum tersedia."
                );

                return;
            }


            const earthURL =
                "https://earth.google.com/web/search/" +
                currentLatitude +
                "," +
                currentLongitude;


            window.open(
                earthURL,
                "_blank"
            );
        }
    );
}


// =====================================================
// TOMBOL KOMPAS
// =====================================================

const startCompassButton =
    document.getElementById(
        "startCompass"
    );


if (startCompassButton) {

    startCompassButton.addEventListener(
        "click",
        startCompass
    );
}


// =====================================================
// MULAI GPS OTOMATIS
// =====================================================

startGPS();