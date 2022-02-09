var fs = require('fs');
var jsmediatags = require("jsmediatags");

var artistData = [];
var queue = [];
var path = "/media/nicco/Nicco's USB/Music/";
var player;

var scrolling = false;
var allowClicks = true;
var mouseX;
var mouseY;
var distanceY;
var distanceX;
var currentView = "library";

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
    getAlbumArtwork(path + queue[0].artist + "/" + queue[0].album + "/" + queue[0].file).then(function(result) {
        document.getElementById("playerImage").src = result;
    });
    document.getElementById("playerImage").style.animation="spin 2s linear infinite";
    if(queue[0].title.length > 35){
        document.getElementById("songTitle").innerText = queue[0].title.substring(0, 35) + "...";
    } else {
        document.getElementById("songTitle").innerText = queue[0].title;
    }
    document.getElementById("artistAlbumInfo").innerText = queue[0].album + " | " + queue[0].artist;
    player = new Audio(path + queue[0].artist + "/" + queue[0].album + "/" + queue[0].file);
    player.play();
    player.addEventListener("ended", nextSong);
    player.addEventListener("pause", pauseMusic);
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
        document.getElementById("pauseButton").innerText = "Play";
        document.getElementById("pauseButton").onclick = resumeMusic;
    }
}

function resumeMusic() {
    if(queue.length > 0){
        player.play();
        document.getElementById("playerImage").style.animation="spin 2s linear infinite";
        document.getElementById("pauseButton").innerText = "Pause";
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
        player.currentTime = player.duration;
        document.getElementById("pauseButton").innerText = "Pause";
        document.getElementById("pauseButton").onclick = "pauseMusic()";
    }
}

async function scanMusic(){ //Scan the music folder for subfolders (representing artists) and scan artist folders for subfolders (representing albums) 
        if (fs.existsSync(path)) {
                var artists = fs.readdirSync(path);
                for( const artist of artists ) { //For ear artist
                        if(fs.lstatSync(path + artist).isDirectory()){
                            var artistAlbums = [];
                            document.getElementById("indexStatus").innerText = "Importing " + artist + "...";
                            const albums = fs.readdirSync(path + artist);
                                for (const album of albums) {
                                if(fs.lstatSync(path + artist + "/" + album).isDirectory()){
                                    var albumSongs = [];
                                    const songs = fs.readdirSync(path + artist + "/" + album);
                                    for (const song of songs) {
                                        var extension = song.match(/\.[0-9a-z]+$/i)[0];
                                        if(extension == ".m4a" || extension == ".mp3" || extension == ".wav"){
                                            try{
                                                const tagInfo = await new Promise((resolve, reject) => {
                                                        new jsmediatags.Reader(path + artist + "/" + album + "/" + song).setTagsToRead(["title"]).read({
                                                            onSuccess: function(tag) {
                                                                resolve(tag);
                                                            }, onError: function(error){
                                                                reject(error);
                                                            }
                                                            });
                                                });
                                                albumSongs.push({file: song, title: tagInfo.tags.title});
                                            } catch(error) {
                                                console.log("Media Tag Error: " + error);
                                                albumSongs.push({file: song, title: song});
                                            }
                                        }
                                    }
                                    if(albumSongs.length > 0){
                                        artistAlbums.push({name: album, songs: albumSongs});
                                    }
                                }
                            }
                            artistData.push({name: artist, albums: artistAlbums});
                        }
                }
        }
}

async function getAlbumArtwork(filepath) {//WARNING: Extremely slow function. Use sparingly.
    try{
        const tagInfo = await new Promise((resolve, reject) => { 
            new jsmediatags.Reader(filepath).setTagsToRead(["picture"]).read({
                onSuccess: function(tag) {
                    resolve(tag);
                },
                onError: function(error) {
                    reject(error);
                }
            });
        });
        var picture = tagInfo.tags.picture; // create reference to track art
        var base64String = "";
        for (var i = 0; i < picture.data.length; i++) {
            base64String += String.fromCharCode(picture.data[i]);
        }
        var imageUri = "data:" + picture.format + ";base64," + window.btoa(base64String);
        return imageUri;
    } catch(error) {
        console.log("Media Tag Error: " + error);
        return "placeholder.jpg";
    }
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
        getAlbumArtwork(path + artistData[artistIndex].name + "/" + artistData[artistIndex].albums[albumIndex].name + "/" + artistData[artistIndex].albums[albumIndex].songs[0].file).then(function(result) {
            document.getElementById("albumImage").src = result;
        });
    }
}

window.addEventListener('DOMContentLoaded', () => {
    if(fs.existsSync('config.js')) {
        eval(fs.readFileSync('config.js', 'utf8'));
    } else {
        path = require('os').homedir() + "/Music/";
        fs.writeFileSync('config.js', 'path = "' + path + '"; //The location where Tamarack scans for music. Music should be arranged in to subfolders of the following structure: [Artist Name]/[Albun Name]/musicfile.mp3');
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
        scanMusic().then(function() {
            document.getElementById("scanningCont").style.display = "none";
            document.getElementById("artistsCont").style.display = "flex";
            fs.writeFileSync('music.json', JSON.stringify(artistData));
            generateArtists();
        });
    }
});

function rescanMusic() {
    artistData = [];
    console.log("Indexing music");
    document.getElementById("artistsCont").style.display = "none";
    document.getElementById("albumsCont").style.display = "none";
    document.getElementById("songsCont").style.display = "none";
    document.getElementById("scanningCont").style.display = "block";
    scanMusic().then(function() {
        document.getElementById("indexStatus").innerText = "Erasing Old Database...";
        fs.unlinkSync('music.json');
        document.getElementById("indexStatus").innerText = "Writing Database...";
        fs.writeFileSync('music.json', JSON.stringify(artistData));
        document.getElementById("scanningCont").style.display = "none";
        document.getElementById("artistsCont").style.display = "flex";
        generateArtists();
    });
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
    scrolling = true;
    allowClick = false;
    mouseX = e.clientX;
    mouseY = e.clientY;
    distanceY = 0;
    distanceX = 0;
}

function drag(e, element){
    if(scrolling){
        var differenceY = e.clientY - mouseY;
        var differenceX = e.clientX - mouseX;
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
        //It's a swipe, so switch the view
        if(currentView == "library"){
            playingView();
        } else if(currentView == "player"){
            libraryView();
        }
    } else {
        //It's a scroll. Do nothing, as drag() has it all taken care of
    }
}
