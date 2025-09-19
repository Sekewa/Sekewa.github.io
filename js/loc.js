let isSet = false;

const options = {
    enableHighAccuracy: false,
    timeout: 5000,
    maximumAge : 0,
}

function GetLoc() {
    const section = document.getElementById("loc-info-current");
    const ul = document.createElement("ul");

    const Longitude = document.createElement("li");
    const Latitude = document.createElement("li");
    const mesure = document.createElement("li");
    const vitesse = document.createElement("li");
    const timestamp = document.createElement("li");

    navigator.geolocation.getCurrentPosition((position) => {
        Longitude.innerText = `Longitude : ${position.coords.longitude}`;
        Latitude.innerText = `Latitude : ${position.coords.latitude}`;
        mesure.innerText = `Mesure : ${position.coords.accuracy}`;
        vitesse.innerText = `Vitesse : ${position.coords.speed}`;
        timestamp.innerText = `Time Stamp : ?`
    },(err) => {
        console.log("erreur complète : ",err)
        console.error(`ERROR(${err.code}): ${err.message}`);
    },options);

    ul.appendChild(Longitude);
    ul.appendChild(Latitude);
    ul.appendChild(mesure);
    ul.appendChild(vitesse);
    ul.appendChild(timestamp);

    section.appendChild(ul);
}

function GetWatch() {
    const section = document.getElementById("loc-info-watch");
    const ul = document.createElement("ul");

    const Longitude = document.createElement("li");
    const Latitude = document.createElement("li");
    const mesure = document.createElement("li");
    const vitesse = document.createElement("li");
    const timestamp = document.createElement("li");

    navigator.geolocation.watchPosition((position) => {
        Longitude.innerText = `Longitude : ${position.coords.longitude}`;
        Latitude.innerText = `Latitude : ${position.coords.latitude}`;
        mesure.innerText = `Mesure : ${position.coords.accuracy}`;
        vitesse.innerText = `Vitesse : ${position.coords.speed}`;
        timestamp.innerText = `Time Stamp : ?`
    },(err) => {
        console.log("erreur complète : ",err)
        console.error(`ERROR(${err.code}): ${err.message}`);
    },options);

    ul.appendChild(Longitude);
    ul.appendChild(Latitude);
    ul.appendChild(mesure);
    ul.appendChild(vitesse);
    ul.appendChild(timestamp);

    section.appendChild(ul);
}