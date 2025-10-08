// Création du moteur et de la scène
var canvas = document.getElementById("renderCanvas");
var engine = new BABYLON.Engine(canvas, true);
var scene = new BABYLON.Scene(engine);

// Caméra ArcRotate (comme OrbitControls)
var camera = new BABYLON.ArcRotateCamera("camera", 
    -Math.PI/2, Math.PI/2, 3, BABYLON.Vector3.Zero(), scene);
camera.attachControl(canvas, true);
camera.lowerRadiusLimit = 1.5;
camera.upperRadiusLimit = 50;
camera.wheelPrecision = 50;

// Lumière
var light = new BABYLON.HemisphericLight("hemiLight", new BABYLON.Vector3(0,5,0), scene);
light.intensity = 1;

// Globe
var sphere = BABYLON.MeshBuilder.CreateSphere("globe", {diameter:2, segments:32}, scene);
var globeMat = new BABYLON.StandardMaterial("globeMat", scene);
globeMat.diffuseTexture = new BABYLON.Texture("img/world.200410.3x5400x2700.png", scene);
globeMat.diffuseTexture.uAng = Math.PI; // rotation pour centrer Greenwich
sphere.material = globeMat;

globeMat.diffuseTexture.uScale = -1;

// Fonction conversion lat/lon -> 3D
function calcPosFromLatLonRad(lat, lon, radius){
    var phi = (90 - lat) * Math.PI / 180;
    var theta = (lon + 180) * Math.PI / 180;

    var x =  radius * Math.sin(phi) * Math.cos(theta);
    var z = radius * Math.sin(phi) * Math.sin(theta);
    var y = radius * Math.cos(phi);

    return new BABYLON.Vector3(x, y, z);
}

// Marqueur de position GPS
if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
        const Lon = position.coords.longitude;
        const Lat = position.coords.latitude;

        var pos = calcPosFromLatLonRad(Lat, Lon, 1); // attention ordre Lat,Lon

        var marker = BABYLON.MeshBuilder.CreateSphere("marker", {diameter:0.02, segments:16}, scene);
        var markerMat = new BABYLON.StandardMaterial("markerMat", scene);
        markerMat.diffuseColor = new BABYLON.Color3(1,0,0);
        marker.material = markerMat;
        marker.position = pos;
    });
}

// Render loop
engine.runRenderLoop(function(){
    scene.render();
});

window.addEventListener("resize", function(){
    engine.resize();
});

fetch("https://restcountries.com/v3.1/all?fields=name,latlng,flags")
.then(res => res.json())
.then(data => {
    data.forEach(country => {
    if (country.latlng && country.latlng.length === 2) {
        const [lat, lon] = country.latlng;

        // Position légèrement au-dessus de la surface
        const offset = 0.02;
        const pos = calcPosFromLatLonRad(lat, lon, 1 + offset);

        const size = 0.02;

        // Création d'un cube
        const boxOptions = {
            width: size,
            height: size,
            depth: size,
            faceUV: [
                new BABYLON.Vector4(0,0,1,1), // avant
                new BABYLON.Vector4(0,0,1,1), // arrière
                new BABYLON.Vector4(0,0,1,1), // haut
                new BABYLON.Vector4(0,0,1,1), // bas
                new BABYLON.Vector4(0,0,1,1), // droite
                new BABYLON.Vector4(0,0,1,1)  // gauche
            ]
        };
        const cube = BABYLON.MeshBuilder.CreateBox(country.name.common, boxOptions, scene);

        // Orientation : face avant vers l’extérieur
        const dir = pos.normalize();
        cube.lookAt(pos.add(dir));

        // Matériau
        const mat = new BABYLON.StandardMaterial(country.name.common + "Mat", scene);
        if(country.flags && country.flags.png){
            mat.diffuseTexture = new BABYLON.Texture(country.flags.png, scene);
            mat.emissiveColor = new BABYLON.Color3(1,1,1);
            mat.backFaceCulling = false;
        } else {
            mat.diffuseColor = new BABYLON.Color3(0,0.5,1);
        }
        cube.material = mat;

        cube.position = pos;
      }
  });
})
.catch(err => console.error("Erreur lors de la récupération des données des pays :", err));
