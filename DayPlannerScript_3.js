import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getFirestore, doc, setDoc, getDoc, getDocs, collection } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBQPqbtlfHPLpB-JYbyxDZiugu4NqwpSeM",
    authDomain: "askkhonsu-map.firebaseapp.com",
    projectId: "askkhonsu-map",
    storageBucket: "askkhonsu-map.appspot.com",
    messagingSenderId: "266031876218",
    appId: "1:266031876218:web:ec93411f1c13d9731e93c3",
    measurementId: "G-Z7F4NJ4PHW"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);   

let geocoder, map; 
const $map = document.querySelector('.plan_map'),
    $userMail = document.querySelector('.user-email'), 
    $address = document.querySelector('#Activity-Name'),  
    $daysSelect = document.querySelector('select#Day'), 
    $addDay = document.querySelector('.add-day'),
    $dayEvents = document.querySelector('.day-events'), 
    mapZoom = 13,
    initialCoords  = { lat: 40.7580, lng: -73.9855 },
    mapIcon = 'https://uploads-ssl.webflow.com/61268cc8812ac5956bad13e4/64ba87cd2730a9c6cf7c0d5a_pin%20(3).png', 
    directionsUrl = 'https://www.google.com/maps/dir/?api=1&destination=', 
    startingIndex = 1; 

let currentDay = $daysSelect.options[startingIndex]; 
currentDay.markers = [];
// localStorage.markers = JSON.stringify({}); 

$daysSelect.selectedIndex = startingIndex;  


async function saveMarkerToFirebase(userMail, dayNum, markerObj) {  
    const {lat, lng, title, dayEventName} = markerObj;   

    const dayEvents = {};

    currentDay.n = (currentDay.n || 0) + 1;  

    dayEvents[`event${currentDay.n}`] = {      
        lat,
        lng,
        title,
        dayEventName, 
    };

    const existingMarkers = doc(db, `Markers-${userMail}`, `day${dayNum}`);
    setDoc(existingMarkers, dayEvents, { merge: true });
}

google.maps.event.addDomListener(window, 'load', () => {
    const userMail = $userMail?.value || localStorage.getItem('user-email'); 
    retrieveSavedMarkersFromFirebase(userMail);
}); 

async function retrieveSavedMarkersFromFirebase(userMail) {
    const querySnapshot = await getDocs(collection(db, `Markers-${userMail}`));   
    querySnapshot.forEach((doc) => {
        const dayNum = Number(doc.id.slice(-1)); 
        if (dayNum === 1) {
            currentDay = $daysSelect.options[1]; 
            currentDay.markers = currentDay.markers || []; 
            $addDay.dayNum = 1; 
        }
        else {
            currentDay = addOptionToDaysSelect(dayNum);  
            currentDay.markers = currentDay.markers || []; 
            $addDay.dayNum = dayNum;
        }

        const day = `.day-${dayNum}-event`; 
        if ($dayEvents.querySelector(day)) $dayEvents.querySelector(day).querySelector('.single-event').classList.add('hide');  

        const savedMarkers = doc.data();

        Object.values(savedMarkers).forEach(marker => {
            const lat = marker.lat;
            const lng = marker.lng;   
            const createdMarker = createMarker(marker.title, {lat, lng});   
            currentDay.markers.push(createdMarker);  
            postDayEvent(marker.dayEventName, day, createdMarker); 
        });

    });

    $daysSelect.selectedIndex = 0;
}

$userMail?.addEventListener('change', e => {
    localStorage.setItem('user-email', e.currentTarget.value);
});

document.addEventListener('DOMContentLoaded', () => {
    const userMail = localStorage.getItem('user-email'); 
    if (userMail) $userMail.value = userMail; 
});


// setup map 
const icon = {
    url: mapIcon, //place.icon,
    size: new google.maps.Size(71, 71),
    origin: new google.maps.Point(0, 0),
    anchor: new google.maps.Point(17, 34),
    scaledSize: new google.maps.Size(25, 25),
};

const markerPopup = new google.maps.InfoWindow();  

!function initMap() {
    geocoder = new google.maps.Geocoder();
    map = new google.maps.Map($map, { 
        zoom: mapZoom,
        center: initialCoords,
    });

    // Create the search box and link it to the UI element.
    const searchBox = new google.maps.places.SearchBox($address);
    // map.controls[google.maps.ControlPosition.TOP_LEFT].push($address);
    // Bias the SearchBox results towards current map's viewport 
    map.addListener('bounds_changed', () => {
        searchBox.setBounds(map.getBounds()); 
    });

    searchBox.addListener('places_changed', () => { 
        const places = searchBox.getPlaces();
    
        if (places.length == 0) return;
    
        // For each place, get the icon, name and location.
        const bounds = new google.maps.LatLngBounds();

        const numOfPlacesFound = places.length; 
        places.forEach((place) => {
            if (!place.geometry || !place.geometry.location) {
                alert('Sorry, try again\nNo cordinates found'); 
                return;
            }

            const marker = createMarker(place.name, place.geometry.location);  

            map.panTo(marker.position); 

            currentDay.markers.push(marker);

            const dayNum = getCurrentDayNum(); 
            const day = `.day-${dayNum}-event`;    
            $dayEvents.querySelector(`${day} .single-event`).classList.add('hide'); 

            let dayEventName = ''; 
            if (numOfPlacesFound > 1) {
                const addressName = `${place.name} ${place.formatted_address}`; 
                postDayEvent(addressName, day, marker);
                dayEventName = addressName; 
            }
            else {
                postDayEvent($address.value, day, marker);
                dayEventName = $address.value; 
            }


            const lat = marker.position.lat();
            const lng = marker.position.lng();
            const title = marker.title; 
 
            const markerObj = {lat, lng, title, dayEventName};  

            console.log('Lat', lat)
            console.log('Lng', lng)
            console.log('title', title)
            console.log('dayEventName', dayEventName)

            saveMarker(dayNum, markerObj); 
            const userMail = $userMail?.value || localStorage.getItem('user-email'); 
            saveMarkerToFirebase(userMail, dayNum, markerObj);  

        });

        $address.value = '';  
    });
}();

function createMarker(title, position) {
    const marker = new google.maps.Marker({
        map,
        icon,
        title, 
        position,  
    });

    marker.addListener('click', () => { 
        markerPopup.close();
        markerPopup.setContent(marker.getTitle());
        markerPopup.open(marker.getMap(), marker);
    });

    return marker; 
} 

function saveMarker(dayNum, markerObj) {
    const savedMarkers = localStorage.markers ? JSON.parse(localStorage.markers) : {}; 
    const currentDaySavedMarkers = savedMarkers[dayNum];
    if (currentDaySavedMarkers) {
        currentDaySavedMarkers.push(markerObj); 
        savedMarkers[dayNum] = currentDaySavedMarkers;
        localStorage.markers = JSON.stringify(savedMarkers); 
    }
    else {
        savedMarkers[dayNum] = [markerObj];
        localStorage.markers = JSON.stringify(savedMarkers); 
    } 
}

// console.log('DB:', db) 
console.log('done!')   


// google.maps.event.addDomListener(window, 'load', () => loadSavedMarkers()); 

function loadSavedMarkers() {
    const savedMarkers = localStorage.markers ? JSON.parse(localStorage.markers) : {}; 
    for ([dayNum, markers] of Object.entries(savedMarkers)) { 
        if (Number(dayNum) === 1) {
            currentDay = $daysSelect.options[1]; 
            currentDay.markers = currentDay.markers || []; 
            $addDay.dayNum = 1; 
        }
        else {
            currentDay = addOptionToDaysSelect(dayNum);  
            currentDay.markers = currentDay.markers || []; 
            $addDay.dayNum = Number(currentDay.value.slice(-1));
        }

        const day = `.day-${dayNum}-event`; 
        if ($dayEvents.querySelector(day)) $dayEvents.querySelector(day).querySelector('.single-event').classList.add('hide');  

        markers.forEach(marker => {   
            const lat = marker.lat;
            const lng = marker.lng;   
            const createdMarker = createMarker(marker.title, {lat, lng});   
            currentDay.markers.push(createdMarker);  
            postDayEvent(marker.dayEventName, day, createdMarker); 
        });
        
    }
    $daysSelect.selectedIndex = 0;
} 

function hideMarkers() {
    setMapOnAll(null, markers);
}

function showMarkers() {
    setMapOnAll(map, markers);
}

function setMapOnAll(map, markers) {
    markers.forEach(marker => {
        marker.setMap(map);
    });
}

function postDayEvent(dayEvent, day, marker) {
    const $day = $dayEvents.querySelector(day);  
    if ($day) {
        constructEvent(dayEvent, day, marker); 
    }
    else {
        const dayNum = day.split('-')[1]; 
        addDayEventList(dayNum); 
        constructEvent(dayEvent, day, marker); 

        if ($dayEvents.querySelector(`.day-${dayNum}-event`)) 
            $dayEvents.querySelector(`.day-${dayNum}-event`).querySelector('.single-event').classList.add('hide');   
    }
}

function constructEvent(dayEvent, day, marker) {
    const $day = $dayEvents.querySelector(day); 
    const $dayEvent = $day.querySelector('.single-event').cloneNode(true);   
    $dayEvent.classList.remove('hide'); 
    $dayEvent.querySelectorAll('.map_list-icon').forEach(icon => icon.classList.remove('hide')); 
    $dayEvent.querySelector('.day-text').textContent = dayEvent;
    $dayEvent.marker = marker; 
    $dayEvent.addEventListener('mouseover', e => {
        const $event = e.currentTarget; 
        $event.setAttribute('title', $event.querySelector('.day-text').textContent);  
    });
    $day.append($dayEvent);  
}

$addDay.addEventListener('click', e => {
    const $addDayBtn = e.currentTarget;
    const dayNum = updateDayNum($addDayBtn); 
    currentDay = addOptionToDaysSelect(dayNum); 
    currentDay.markers = []; 
    $address.value = '';  

    $dayEvents.querySelectorAll('.day-event').forEach(day => day.classList.add('hide')); 

    addDayEventList(dayNum); 
});

function updateDayNum($addDayBtn) {
    const dayNum = ($addDayBtn.dayNum || 1) + 1;
    $addDayBtn.dayNum = dayNum;  
    return dayNum; 
} 

function addOptionToDaysSelect(dayNum) {
    const $option = document.createElement('option');
    $option.setAttribute('value', `day-${dayNum}`);
    $option.textContent = `Day ${dayNum}`;  
    $daysSelect.append($option); 
    $daysSelect.value = `day-${dayNum}`; 
    return $option; 
}

function addDayEventList(dayNum) {
    const $dayEvent = $dayEvents.children[0].cloneNode(true);
    $dayEvent.classList.remove('day-1-event');
    $dayEvent.classList.add(`day-${dayNum}-event`);
    $dayEvent.querySelector('.day-head').textContent = `Day ${dayNum}`; 

    if ($dayEvent.querySelector('.single-event.hide'))   {
        $dayEvent.querySelectorAll('.single-event:not(.hide)').forEach(el => el.remove()); 
        $dayEvent.querySelector('.single-event.hide').classList.remove('hide'); 
    }

    $dayEvent.querySelectorAll('.map_list-icon').forEach(icon => icon.classList.add('hide')); 
    
    $dayEvent.classList.remove('hide');    
    $dayEvents.append($dayEvent);  
}

function getCurrentDayNum() {
    const dayNum = $daysSelect.selectedIndex !== 0 ? $daysSelect.selectedIndex : $daysSelect.options.length - 1;  
    return dayNum; 
} 

$daysSelect.addEventListener('change', e => {
    const $select = e.currentTarget; 
    let index = $select.selectedIndex; 
    if (index !== 0) {
        $dayEvents.querySelectorAll('.day-event').forEach(day => day.classList.add('hide')); 
        document.querySelector(`.day-event.day-${index}-event`).classList.remove('hide');   
    }
    else {
        index = $select.options.length - 1; 
        $dayEvents.querySelectorAll('.day-event').forEach(day => day.classList.remove('hide')); 
    }
    currentDay = $select.options[ index ];   
});  

$dayEvents.addEventListener('click', e => {
    if (e.target.closest('.remove-marker')) {
        const $removeMarker = e.target; 
        const $event = $removeMarker.closest('.single-event'); 
        const $dayEvent = $removeMarker.closest('.day-event');
        const eventNum = $dayEvent.querySelectorAll('.single-event:not(.hide)').length; 
        
        removeMarker($event, $removeMarker, $dayEvent); 
        if ($dayEvent.querySelectorAll('.single-event').length > 1) $event.remove(); 

        if (eventNum == 1) {
            $dayEvent.querySelector('.single-event.hide')?.classList.remove('hide'); 
            if ( Number( $dayEvent.querySelector('.day-head').textContent.slice(-1) ) !== 1 ) {
                $dayEvent.classList.add('hide'); 
            }
        }
    }
    else if (e.target.closest('.get-directions')) {
        const $getDir = e.target;
        const $event = $getDir.closest('.single-event'); 
        const lat = $event.marker.position?.lat() || $event.marker.lat;
        const lng = $event.marker.position?.lng() || $event.marker.lng;  
        if (lat && lng) {
            const url = `${directionsUrl}${lat},${lng}`;  
            window.open(url);  
        }
    }
});  

function removeMarker($event, $removeMarker, $dayEvent) {
    $event.marker?.setMap(null); 
    const dayNum = $removeMarker.closest('.day-event').querySelector('.day-head').textContent.slice(-1); 
    const currentDayMarkers = $daysSelect.options[dayNum].markers;
    if (currentDayMarkers) currentDayMarkers.splice(currentDayMarkers.indexOf($event.marker), 1);  
    removeSavedMarker($event, $dayEvent); 
}    

function removeSavedMarker($event, $dayEvent) {
    const savedMarkers = localStorage.markers ? JSON.parse(localStorage.markers) : {}; 
    if (!Object.keys(savedMarkers).length) return;  
    const eventIndex = [...$event.parentElement.querySelectorAll('.single-event:not(.hide)')].indexOf($event);  
    const dayIndex = [...$dayEvent.parentElement.querySelectorAll('.day-event')].indexOf($dayEvent) + 1; 
    const savedDayMarkers = savedMarkers[dayIndex]; 
    savedDayMarkers.splice(eventIndex, 1);  
    localStorage.markers = JSON.stringify(savedMarkers); 
}  