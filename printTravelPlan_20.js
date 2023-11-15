import { initializeApp } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-app.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.1.0/firebase-firestore.js";

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

let map; 

const $map = document.querySelector('.map'), 
    mapZoom = 13,
    initialCoords  = { lat: 40.7580, lng: -73.9855 },
    mapIcon = 'https://uploads-ssl.webflow.com/61268cc8812ac5956bad13e4/64ba87cd2730a9c6cf7c0d5a_pin%20(3).png'; 

const $slideContainer = document.querySelector('.cs-slide-body'); 
const daySlideNum = 'is-8'; 
const daySlideNumNext = 'is-9';

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
    map = new google.maps.Map($map, { 
        zoom: mapZoom,
        center: initialCoords,
    });
}();

function createMarker(place) {
    const { name, latLng } = place; 

    const marker = new google.maps.Marker({
        map,
        icon,
        title : name, 
        position : latLng,  
    }); 

    marker.addListener('click', () => { 
        markerPopup.close();
        markerPopup.setContent(marker.getTitle());
        markerPopup.open(marker.getMap(), marker);
    });

    return marker; 
} 

// google.maps.event.addDomListener(window, 'load', () => {
//     const userMail = localStorage.getItem('user-email');  
//     if (userMail) retrieveSavedMarkersFromFirebase(userMail);
// }); 

async function retrieveSavedMarkersFromFirebase(userMail, arrivalDate) {
    const docRef = doc(db, 'Locations', `User-${userMail}`);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        // docSnap.data() will be undefined in this case
        console.log('No user with such email!');
        return; 
    } 

    const userData = sortObject(docSnap.data());

    const $daySlide = document.querySelector(`.cs_slide.${daySlideNum}`); 

    const startDate = new Date(arrivalDate.replaceAll('-','/')); 

    for (let [entry, locations] of Object.entries(userData)) {
        if (entry.startsWith('_')) {
            const day = entry; 

            const dayNum = day.split('Day')[1]; 

            let daysDate = '';

            if (dayNum === '1') {
                const daysDateLen = startDate.toDateString().length;      
                daysDate = startDate.toDateString().slice(-daysDateLen, -5);

                clearSlideCells($daySlide); 

                setupDays(locations, $daySlide, dayNum, daysDate)
            }
            else {
                daysDate = new Date( startDate.setDate( startDate.getDate() + 1 ) ).toDateString(); 
                const daysDateLen = daysDate.length;      
                daysDate = daysDate.slice(-daysDateLen, -5);

                const $daySlideClone = $daySlide.cloneNode(true);
                $daySlideClone.classList.remove(`.${daySlideNum}`);  

                clearSlideCells($daySlideClone); 

                const $daySlideNext = $slideContainer.querySelector(`.cs_slide.${daySlideNumNext}`); 

                setupDays(locations, $daySlideClone, dayNum, daysDate)

                $slideContainer.insertBefore($daySlideClone, $daySlideNext);  
            }    
        }
        else {
            if (entry.toLowerCase() === 'khonsunotes') { 
                setupKhonsuNotes(locations); 
            }
            else if (entry.toLowerCase() === 'reservations') { 
                setupReservations(locations); 
            }
            else if (entry.toLowerCase() === 'mapurl') {
                setupMapUrl(locations); 
            } 
        }

    } 

    function sortObject(obj) {
        return Object.keys(obj).sort().reduce((result, key) => {   
            result[key] = obj[key];
            return result;
        }, {});
    }
}

function setupDays(locations, $daySlide, dayNum, daysDate) {
    locations.forEach((location, num) => {
        const { lat, lng, title, dayEventName } = location;
        if (lat && lng) {
            const locationInfo = {
                name: title,
                latLng: {lat, lng}
            };
            const createdMarker = createMarker(locationInfo);  
            
            populateDays($daySlide, dayNum, daysDate, num, title, dayEventName); 
        }
    });
}

function populateDays($daySlide, dayNum, daysDate, num, title, dayEventName) {
    const $dayNumNDate = $daySlide.querySelector('.css_heading-1');
    const $dayEventsTable = $daySlide.querySelector('.css-8_table');
    const $dayEventsTableTitleCell = $dayEventsTable.querySelector('.css-table_cell-content.is-left'); 
    const $dayEventsTableAddressCell = $dayEventsTable.querySelector('.css-table_cell-content');  
    const $dayEventsTableTitleCellClone = $dayEventsTableTitleCell.cloneNode(true);
    const $dayEventsTableAddressCellClone = $dayEventsTableAddressCell.cloneNode(true);

    $dayNumNDate.querySelector('strong').textContent = `Day ${dayNum} - ${daysDate}`; 

    if (num == 0) {
        $dayEventsTableTitleCell.querySelector('.css_cell-text').textContent = title;
        $dayEventsTableAddressCell.querySelector('.css_cell-text').textContent = dayEventName;
    }
    else {
        $dayEventsTableTitleCellClone.querySelector('.css_cell-text').textContent = title;
        $dayEventsTableAddressCellClone.querySelector('.css_cell-text').textContent = dayEventName;
        $dayEventsTable.append($dayEventsTableTitleCellClone, $dayEventsTableAddressCellClone);
    }

    return $daySlide; 
}  

function clearSlideCells($daySlide) {
    const $lastCell = $daySlide.querySelector('.css-8_table .css-table_cell-content:not(.is-left)');
    const lastCellIndex = [...$daySlide.querySelectorAll('.css-8_table > div')].indexOf($lastCell);
    $daySlide.querySelectorAll(`.css-8_table > div:nth-child(${lastCellIndex + 1}) ~ *`).forEach(cell => cell.remove());
}

function setupKhonsuNotes(locations) {
    const $khonsuNotesSlide = document.querySelector('.cs_slide.is-3');
    const $khonsuNotes = $khonsuNotesSlide.querySelectorAll('.css-table_cell-text-area')[1].querySelector('.css_cell-text'); 

    $khonsuNotes.innerHTML = locations.replaceAll('-','<br>-').replace(/^\<br\>/,''); 
}

function setupReservations(locations) {
    const $reservations = document.querySelector('.cs_slide.is-6'); 
    const $reservation = $reservations.querySelector('.css-6_table');
    const $reservationCellTitle = $reservation.querySelector('.css-table_cell-title');
    const $reservationCellContent = $reservation.querySelector('.css-table_cell-content');

    $reservation.querySelectorAll(`div:nth-child(${2}) ~ *`).forEach(cell => cell.remove());
    
    locations.forEach((location, num) => { 
        const time = location.split('-')[0];
        const info = location.split('-')[1];
        if (num == 0) {
            $reservationCellTitle.querySelector('strong').textContent = time; 
            $reservationCellContent.querySelector('strong').textContent = info;
        }
        else {
            const $reservationCellTitleClone = $reservationCellTitle.cloneNode(true);
            const $reservationCellContentClone = $reservationCellContent.cloneNode(true);

            $reservationCellTitleClone.querySelector('strong').textContent = time; 
            $reservationCellContentClone.querySelector('strong').textContent = info;

            $reservation.append($reservationCellTitleClone, $reservationCellContentClone);
        }
    });
}

function setupMapUrl(locations) {
    if (locations.trim().length) {
        const $mapUrl = document.querySelector('.cs_slide.is-17 .ccs_center-container a'); 
        $mapUrl.href = locations; 
        document.querySelector('.cs_slide.is-15').classList.add('hide');
        document.querySelector('.cs_slide.is-17').classList.remove('hide'); 

        const $qrCodeContainer = document.querySelector('.cs_slide.is-17 .qr');
        generateQRCode(locations, $qrCodeContainer);
    }
    else {
        document.querySelector('.cs_slide.is-15').classList.remove('hide');
        document.querySelector('.cs_slide.is-17').classList.add('hide'); 
    }
}

function generateQRCode(link, container) {
    const qrCodeFillColor = '#000';
    const qrCodeRingColor = '#f8942c'; 
    const qrCodeRingCenterColor = '#000'; 
    const width = getComputedStyle(container).width;
    const height = getComputedStyle(container).height;
    const margin = 'auto';
    const bgColor = '#fff'; 

    const $qrCode = document.createElement('qr-code');
    $qrCode.id = 'qr1';
    $qrCode.setAttribute('contents', link);
    $qrCode.setAttribute('module-color', qrCodeFillColor);
    $qrCode.setAttribute('position-ring-color', qrCodeRingColor);
    $qrCode.setAttribute('position-center-color', qrCodeRingCenterColor);
    $qrCode.setAttribute('style', `width:${width};height:${height};margin:${margin};background-color:${bgColor};`);

    const $khonsuImg = document.createElement('img');
    $khonsuImg.src = 'Imgs/khonsu-logo-white.png';
    $khonsuImg.setAttribute('slot', 'icon'); 

    $qrCode.append($khonsuImg);

    container.innerHTML = '';
    container.append($qrCode); 
}

const $slide1 = document.querySelector('.cs_slide.is-1'); 
const $name = $slide1.querySelectorAll('.css1_heading-wrapper .css_heading-note')[0];
const $arrivalDeparture = $slide1.querySelectorAll('.css1_heading-wrapper .css_heading-note')[1];


window.sa5 = window.sa5 || [];
window.sa5.push(['userInfoChanged', 
(user) => {
    console.log("USER INFO CHANGED", user); 
    const { 
        name, 
        email,
        data: {
            "arrival-date": arrivalDate,
            "departure-date": departureDate,
        } 
    } = user;
    
    if (email) {
        $name.querySelector('strong').textContent = name;
        $arrivalDeparture.querySelector('strong').textContent = `${arrivalDate} - ${departureDate}`;

        retrieveSavedMarkersFromFirebase(email, arrivalDate);
    }
}]); 