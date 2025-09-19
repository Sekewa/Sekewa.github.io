navigator.geolocation.getCurrentPosition((pos) => {
    longitude = pos.coords.longitude;
    latitude = pos.coords.latitude;
    mesure_circle = pos.coords.accuracy;
    //console.log(`Longitude : ${longitude}, Latitude : ${latitude}`);

    var map = L.map('map').setView([latitude,longitude],13)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }
    ).addTo(map);

    var marker_my_loc = L.marker([latitude,longitude]).addTo(map);
    const latitude_nice = 43.7031
    const longitude_nice = 7.2661
    var marker_nice = L.marker([latitude_nice,longitude_nice]).addTo(map);
    
    const triangle_one = [25.7617,-80.1918];
    const triangle_two = [32.3078,-64.7505];
    const triangle_three = [18.4655,-66.1057];

    var triangle_bermude = L.polygon([
        triangle_one,
        triangle_two,
        triangle_three
    ]).addTo(map);

    var circle_me = L.circle([latitude,longitude], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: mesure_circle
    }).addTo(map);

    const latitude_marseille = 43.2970;
    const longitude_marseille = 5.3811;

    var marker_marseille = L.marker([latitude_marseille,longitude_marseille]).addTo(map);

    var between_nice_marseille = L.polygon([
        [latitude_nice,longitude_nice],
        [latitude_marseille,longitude_marseille]
    ]).addTo(map);

    const nice = turf.point([latitude_nice,longitude_nice]);
    const marseille = turf.point([latitude_marseille,longitude_marseille]);

    const distance_nice_marseille = turf.distance(nice,marseille, {units : 'kilometers'});

    const distance_node = document.createElement("span");
    distance_node.innerText = `la distance entre Nice et Marseille est de ${distance_nice_marseille} km`
    
    const map_sec = document.getElementById("sec_map");
    map_sec.appendChild(distance_node);
    
},(err) => {
    console.log("ERROR : ",err)
},options);
