navigator.geolocation.getCurrentPosition((pos) => {
    longitude = pos.coords.longitude;
    latitude = pos.coords.latitude;
    console.log(`Longitude : ${longitude}, Latitude : ${latitude}`);

    var map = L.map('map').setView([latitude,longitude],13)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
            maxZoom: 19,
            attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        }
    ).addTo(map);

    var marker_my_loc = L.marker([latitude,longitude]).addTo(map);
    var marker_nic = L.marker([43.7031,7.2661]).addTo(map);
    
    var triangle_one = [25.7617,-80.1918];
    var triangle_two = [32.3078,-64.7505];
    var triangle_three = [18.4655,-66.1057];

    var triangle_bermude = L.polygon([
        triangle_one,
        triangle_two,
        triangle_three
    ]).addTo(map);
},(err) => {
    console.log("ERROR : ",err)
},options);
