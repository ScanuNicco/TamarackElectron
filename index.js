var fs = require('fs');
var os = require('os');
var jsmediatags = require("jsmediatags");
const util = require('util');
const { spawn } = require('node:child_process');
const app = require('electron');
const process = require('process');

var artistData = [];
var queue = [];
var rusty;
var rustyName = "rustyScanner-" + os.platform() + "-" + os.arch(); //Tamarack will look for a RustyScanner binary corresponding to the correct platform and architecture
var path;
var showMouse;
var player = new Audio();
player.addEventListener("pause", pauseMusic);

var scrolling = false;
var allowClicks = true;
var mouseX;
var mouseY;
var distanceY;
var distanceX;
var currentView = "library";
var SCROLL_MOMENTUM;

function playingView(){
    document.getElementById("libraryCont").style.left = "-100vw";
    document.getElementById("playingCont").style.left = "0px";
    currentView = "player";
}

function libraryView(){
    document.getElementById("libraryCont").style.left = "0px";
    document.getElementById("playingCont").style.left = "100vw";
    currentView = "library";
}

function playSong(artistIndex, albumIndex, songIndex){ //Add the current song to the queue, and add all the ones that come after it
    if(distanceX <= 10 && distanceY <= 10){
        clearQueue();
        for(var i = songIndex; i < artistData[artistIndex].albums[albumIndex].songs.length; i++){
            var song = artistData[artistIndex].albums[albumIndex].songs[i];
            var album = artistData[artistIndex].albums[albumIndex];
            var artist = artistData[artistIndex];
            //console.log(path + artist.name + "/" + album.name + "/" + song.file);
            queue.push({title: song.title, artist: artist.name, album: album.name, artwork: album.artwork, file: song.file});
        }
        playingView();
        startPlaying();
    }
}

function startPlaying() { //Start playing the first song in the queue
    document.getElementById("playerImage").src = process.cwd() + "/" + queue[0].artwork;
    document.getElementById("playerImage").style.animation="spin 2s linear infinite";
    document.getElementById("pauseButton").innerHTML = "<img class='buttonIcon' src='pause.svg'>";
    if(queue[0].title.length > 35){
        document.getElementById("songTitle").innerText = queue[0].title.substring(0, 35) + "...";
    } else {
        document.getElementById("songTitle").innerText = queue[0].title;
    }
    document.getElementById("artistAlbumInfo").innerText = queue[0].album + " | " + queue[0].artist;
    player.src = path + queue[0].artist + "/" + queue[0].album + "/" + queue[0].file;
    player.load();
    player.play();
    player.addEventListener("ended", nextSong);
    document.getElementById("pauseButton").onclick = pauseMusic;
}

function clearQueue(){
    if(queue.length > 0){
        player.pause();
        player.removeEventListener("ended", nextSong);
        queue = []; //Clear the queue
    }
}

function nextSong() {
    if(queue.length > 1){
        queue.shift();
        startPlaying();
    }
}

function pauseMusic() {
    if(queue.length > 0){
        player.pause();
        document.getElementById("playerImage").style.animation="";
        document.getElementById("pauseButton").innerHTML = "<img class='buttonIcon' src='play.svg'>";
        document.getElementById("pauseButton").onclick = resumeMusic;
    }
}

function resumeMusic() {
    if(queue.length > 0){
        player.play();
        document.getElementById("playerImage").style.animation="spin 2s linear infinite";
        document.getElementById("pauseButton").innerHTML = "<img class='buttonIcon' src='pause.svg'>";
        document.getElementById("pauseButton").onclick = pauseMusic;
    }
}

function restartSong(){
    if(queue.length > 0){
        player.currentTime = 0;
    }
}

function skipSong() {
    if(queue.length > 0){
        //player.pause();
        nextSong();
    }
}

function scanMusic(){ //Scan the music folder for subfolders (representing artists) and scan artist folders for subfolders (representing albums) 
        document.getElementById("indexStatus").innerText = "RustyScanner is initializing.";
        const rustyScanner = spawn("./" + rustyName, [path]);
        rustyScanner.stdout.on('data', (data) => {
            document.getElementById("indexStatus").innerText = `stdout: ${data}`;
        });

        rustyScanner.stderr.on('data', (data) => {
            document.getElementById("indexStatus").innerText = `stderr: ${data}`;
        });

        rustyScanner.on('close', (code) => {
            document.getElementById("indexStatus").innerText = `child process exited with code ${code}`;
            //RustyScanner will generate a json file, which we need to import into ArtistData
            if (fs.existsSync('music.json')) {
                document.getElementById("indexStatus").innerText = "Loading Index from Disk.";
                const data = fs.readFileSync('music.json', 'utf8');
                artistData = JSON.parse(data);
                document.getElementById("scanningCont").style.display = "none";
                document.getElementById("artistsCont").style.display = "flex";
                generateArtists();
            } else {
                document.getElementById("indexStatus").innerText = "Error: Music Index Missing!";
                popup("An Error Occured", "The music index is missing! Try scanning again or running RustyScanner manually from the terminal.", "<button onclick='closePopup()'>Ok</button>");
            }
        });
}

function generateArtists() { //Generate the Artists list based on artistData
    html = "<div style='text-align: center'><button onclick='shuffleAll()'>Shuffle All</button></div>";
    for(var i = 0; i < artistData.length; i++){
        html += "<li onclick='viewAlbums(" + i + ")'>" + artistData[i].name + "</li>";
    }
    document.getElementById("artistList").innerHTML = html;
}

function viewAlbums(index) {
    if(distanceX <= 10 && distanceY <= 10){
        document.getElementById("artistsCont").style.display = "none";
        document.getElementById("albumsCont").style.display = "flex";
        document.getElementById("songsCont").style.display = "none"
        document.getElementById("albumHeaderTitle").innerText = artistData[index].name;
        html = "<div style='text-align: center'><button onclick='shuffleArtist(" + index + ")'>Shuffle " + artistData[index].name + "</button></div>";
        for(var i = 0; i < artistData[index].albums.length; i++){
            html += "<li onclick='viewSongs(" + index + ", " + i + ")'>" + artistData[index].albums[i].name + "</li>";
        }
        document.getElementById("albumList").innerHTML = html;
    }
}

function viewSongs(artistIndex, albumIndex){
    if(distanceX <= 10 && distanceY <= 10){
        document.getElementById("albumsCont").style.display = "none";
        document.getElementById("songsCont").style.display = "flex";
        html = "<div class='albumInfo'><leftContainer><button onclick='viewAlbums(" + artistIndex + ")'>Back</button></leftContainer><img id='albumImage' src='placeholder.jpg'></img><div class='albumData'><h1>" + artistData[artistIndex].albums[albumIndex].name + "</h1><h3>" + artistData[artistIndex].name + "</h3></div><rightContainer><button onclick='shuffleAlbum(" + artistIndex + ", " + albumIndex + ")'>Shuffle Album</button><button onclick='playingView()'>Now Playing</button></div>"
        for(var i = 0; i < artistData[artistIndex].albums[albumIndex].songs.length; i++){
            html += "<li onclick='playSong(" + artistIndex + ", " + albumIndex + ", " + i + ")'>" + artistData[artistIndex].albums[albumIndex].songs[i].title + "</li>";
        }
        document.getElementById("songsList").innerHTML = html;
        document.getElementById("albumImage").src = process.cwd() + "/" + artistData[artistIndex].albums[albumIndex].artwork;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if(fs.existsSync(rustyName)) { //If a compatible RustyScanner executable is available, configure Tamarack to use it.
        rusty = true;
        console.log("RustyScanner detected");
    } else {
        rusty = false;
        popup("Notice", "Tamarack could not find a RustyScanner binary for your system/architecture. Scanning music is disabled.", "<button onclick='closePopup()'>Ok</button>");
    }
    if(fs.existsSync('config.js')) { //If config.js is present, import it. Otherwise generate the default file.
        eval(fs.readFileSync('config.js', 'utf8'));
    } else {
        path = os.homedir() + "/Music/";
        showMouse = true;
        SCROLL_MOMENTUM = .75;
        fs.writeFileSync('config.js', 'path = "' + path + '"; //The location where Tamarack scans for music. Music should be arranged in to subfolders of the following structure: [Artist Name]/[Album Name]/musicfile.mp3;\nshowMouse = true; //If set to false, the mouse will be hidden. Useful on embedded devices with touchscreens.\nSCROLL_MOMENTUM = .75; //A number between 0 and 1. Effects how long the list keeps moving after drag stops\n //rusty = false; //Uncomment this line to force tamarack to use the JavaScript Scanner instead of the Rust one.');
    }
    if(showMouse){
        document.body.style.cursor = 'pointer';
    }
    if (fs.existsSync('music.json')) {
        console.log("Loading index from disk");
        const data = fs.readFileSync('music.json', 'utf8');
        artistData = JSON.parse(data);
        generateArtists();
    } else {
        console.log("Indexing music");
        document.getElementById("artistsCont").style.display = "none";
        document.getElementById("albumsCont").style.display = "none";
        document.getElementById("songsCont").style.display = "none";
        document.getElementById("scanningCont").style.display = "block";
        scanMusic();
    }
});

function rescanMusic() {
    artistData = [];
    console.log("Indexing music");
    document.getElementById("artistsCont").style.display = "none";
    document.getElementById("albumsCont").style.display = "none";
    document.getElementById("songsCont").style.display = "none";
    document.getElementById("scanningCont").style.display = "block";
    document.getElementById("indexStatus").innerText = "Erasing Old Database...";
    fs.unlinkSync('music.json');
    scanMusic();
}

function promptRescan() {
    popup("Are you sure?", "Rescanning music can take a some time if there is a large amount of new music.", "<button onclick='closePopup()'>Cancel</button><button onclick='closePopup(); rescanMusic()'>Continue</button>");
}

function shuffleAll() {
    var songs = [];
    clearQueue();
    for(const artist of artistData){
        for(const album of artist.albums){
            for(const song of album.songs){
                songs.push({title: song.title, artist: artist.name, album: album.name, artwork: album.artwork, file: song.file});
            }
        }
    }
    var randLength = 200;
    if(songs.length < 200){
        randLength = songs.length;
    }
    for(var i = 0; i < randLength; i++){
        var index = Math.floor(Math.random() * songs.length);
        queue.push(songs[index]);
    }
    playingView();
    startPlaying();
}

function shuffleArtist(index){
    clearQueue();
    const artist = artistData[index];
    for(const album of artist.albums){
        for(const song of album.songs){
            queue.splice(Math.floor(Math.random() * queue.length), 0, {title: song.title, artist: artist.name, album: album.name, artwork: album.artwork, file: song.file});
        }
    }
    playingView();
    startPlaying();
}

function shuffleAlbum(index1, index2){
    clearQueue();
    const artist = artistData[index1];
    const album = artist.albums[index2];
    for(const song of album.songs){
        queue.splice(Math.floor(Math.random() * queue.length), 0, {title: song.title, artist: artist.name, album: album.name, artwork: album.artwork, file: song.file});
    }
    playingView();
    startPlaying();
}



function startScroll(e){
    clearInterval(momentumTimer);
    scrolling = true;
    allowClick = false;
    mouseX = e.clientX;
    mouseY = e.clientY;
    distanceY = 0;
    distanceX = 0;
}

var oldTime = Date.now();
var scrollVel = 0;
var scrollElement;
function drag(e, element){
    if(scrolling){
        scrollElement = element;
        var differenceY = e.clientY - mouseY;
        var differenceX = e.clientX - mouseX;
        var newTime = Date.now();
        scrollVel = differenceY / (newTime - oldTime);
        oldTime = newTime;
        element.scrollTop -= differenceY;
        mouseY = e.clientY;
        mouseX = e.clientX;
        distanceY += Math.abs(differenceY);
        distanceX += Math.abs(differenceX);
    }
}

function endScroll(){
    scrolling = false;
    if(distanceX <= 10 && distanceY <= 10){
        //It's a click. Set allowClicks to true to enable any onclick events to go through
        allowClicks = true;
    } else if(distanceX > 80) {
        //It's a horizontal swipe, so switch the view
        if(currentView == "library"){
            playingView();
        } else if(currentView == "player"){
            libraryView();
        }
    } else {
        console.log("Velocity: " + scrollVel + "px/ms");
        momentumTimer = setInterval(scrollMomentum, 50);
    }
}

var momentumTimer;
function scrollMomentum(){
    scrollElement.scrollTop -= scrollVel * 50; //Multiply speed by 50 because we're only running this every 50 ms.
    scrollVel *= SCROLL_MOMENTUM;
    if(Math.abs(scrollVel) < .1){
        clearInterval(momentumTimer);
    }
}

function popup(header, text, actions){
    document.getElementById("popup").style.display = "block";
    document.getElementById("popupHeader").innerText = header;
    document.getElementById("popupText").innerText = text;
    document.getElementById("popupActions").innerHTML = actions;
}

function closePopup() {
    document.getElementById("popup").style.display = "none";
}
