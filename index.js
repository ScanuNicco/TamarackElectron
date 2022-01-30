var fs = require('fs');
var jsmediatags = require("jsmediatags");

var artistData = [];
var queue = [];
var path = "/media/nicco/Nicco's USB/Music/";

function playingView(){
    document.getElementById("libraryCont").style.left = "-100vw";
    document.getElementById("playingCont").style.left = "0px";
}

function libraryView(){
    document.getElementById("libraryCont").style.left = "0px";
    document.getElementById("playingCont").style.left = "100vw";
}

function playSong(artistIndex, albumIndex, songIndex){ //Add the current song to the queue, and add all the ones that come after it
    clearQueue();
    for(var i = songIndex; i < artistData[artistIndex].albums[albumIndex].songs.length; i++){
        var song = artistData[artistIndex].albums[albumIndex].songs[i];
        var album = artistData[artistIndex].albums[albumIndex];
        var artist = artistData[artistIndex];
        var audio = new Audio(path + artist.name + "/" + album.name + "/" + song.file);
        queue.push({title: song.title, artist: artist.name, album: album.name, artwork: album.artwork, file: song.file, audio: audio});
    }
    playingView();
    startPlaying();
}

function startPlaying() { //Start playing the first song in the queue
    document.getElementById("playerImage").src = queue[0].artwork;
    document.getElementById("playerImage").style.animation="spin 2s linear infinite";
    if(queue[0].title.length > 35){
        document.getElementById("songTitle").innerText = queue[0].title.substring(0, 35) + "...";
    } else {
        document.getElementById("songTitle").innerText = queue[0].title;
    }
    document.getElementById("artistAlbumInfo").innerText = queue[0].album + " | " + queue[0].artist;
    queue[0].audio.play();
    queue[0].audio.addEventListener("ended", nextSong);
}

function clearQueue(){
    if(queue.length > 0){
        queue[0].audio.pause();
        queue[0].audio.removeEventListener("ended", nextSong);
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
        queue[0].audio.pause();
        document.getElementById("playerImage").style.animation="";
        document.getElementById("pauseButton").innerText = "Play";
        document.getElementById("pauseButton").onclick = resumeMusic;
    }
}

function resumeMusic() {
    if(queue.length > 0){
        queue[0].audio.play();
        document.getElementById("playerImage").style.animation="spin 2s linear infinite";
        document.getElementById("pauseButton").innerText = "Pause";
        document.getElementById("pauseButton").onclick = pauseMusic;
    }
}

function restartSong(){
    if(queue.length > 0){
        queue[0].audio.currentTime = 0;
    }
}

function skipSong() {
    if(queue.length > 0){
        queue[0].audio.currentTime = queue[0].audio.duration;
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
                                        
                                        try{
                                            const tagInfo = await new Promise((resolve, reject) => { 
                                                new jsmediatags.Reader(path + artist + "/" + album + "/" + albumSongs[0].file).setTagsToRead(["picture"]).read({
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
                                            artistAlbums.push({name: album, songs: albumSongs, artwork: imageUri});
                                        } catch(error) {
                                            console.log("Media Tag Error: " + error);
                                            artistAlbums.push({name: album, songs: albumSongs, artwork: "placeholder.jpg"});
                                        }
                                                
                                    }
                                }
                            }
                            artistData.push({name: artist, albums: artistAlbums});
                        }
                }
        }
}

function generateArtists() { //Generate the Artists list based on artistData
    html = "<div style='text-align: center'><button>Shuffle All</button></div>";
    for(var i = 0; i < artistData.length; i++){
        html += "<li onclick='viewAlbums(" + i + ")'>" + artistData[i].name + "</li>";
    }
    document.getElementById("artistList").innerHTML = html;
}

function viewAlbums(index) {
    document.getElementById("artistsCont").style.display = "none";
    document.getElementById("albumsCont").style.display = "block";
    document.getElementById("songsCont").style.display = "none"
    document.getElementById("albumHeaderTitle").innerText = artistData[index].name;
    html = "";
    for(var i = 0; i < artistData[index].albums.length; i++){
        html += "<li onclick='viewSongs(" + index + ", " + i + ")'>" + artistData[index].albums[i].name + "</li>";
    }
    document.getElementById("albumList").innerHTML = html;
}

function viewSongs(artistIndex, albumIndex){
    document.getElementById("albumsCont").style.display = "none";
    document.getElementById("songsCont").style.display = "block";
    html = "<div class='albumInfo'><leftContainer><button onclick='viewAlbums(" + artistIndex + ")'>Back</button></leftContainer><img class='albumImage' src='" + artistData[artistIndex].albums[albumIndex].artwork + "'></img><div class='albumData'><h1>" + artistData[artistIndex].albums[albumIndex].name + "</h1><h3>" + artistData[artistIndex].name + "</h3></div><rightContainer><button>Shuffle All</button><button onclick='playingView()'>Now Playing</button></div>"
    for(var i = 0; i < artistData[artistIndex].albums[albumIndex].songs.length; i++){
        html += "<li onclick='playSong(" + artistIndex + ", " + albumIndex + ", " + i + ")'>" + artistData[artistIndex].albums[albumIndex].songs[i].title + "</li>";
    }
    document.getElementById("songsList").innerHTML = html;
}

window.addEventListener('DOMContentLoaded', () => {
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
            document.getElementById("artistsCont").style.display = "block";
            fs.writeFileSync('music.json', JSON.stringify(artistData));
            generateArtists();
        });
    }
});

function rescanMusic() {
    console.log("Indexing music");
    document.getElementById("artistsCont").style.display = "none";
    document.getElementById("albumsCont").style.display = "none";
    document.getElementById("songsCont").style.display = "none";
    document.getElementById("scanningCont").style.display = "block";
    scanMusic().then(function() {
        document.getElementById("scanningCont").style.display = "none";
        document.getElementById("artistsCont").style.display = "block";
        fs.writeFileSync('music.json', JSON.stringify(artistData));
        generateArtists();
    });
}
