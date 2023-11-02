let map; 

const $map = document.querySelector('.map'), 
    mapZoom = 13,
    initialCoords  = { lat: 40.7580, lng: -73.9855 },
    mapIcon = 'https://uploads-ssl.webflow.com/61268cc8812ac5956bad13e4/64ba87cd2730a9c6cf7c0d5a_pin%20(3).png'; 

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

google.maps.event.addDomListener(window, 'load', () => {
    const userMail = localStorage.getItem('user-email');  
    if (userMail) retrieveSavedMarkersFromFirebase(userMail);
}); 

async function retrieveSavedMarkersFromFirebase(userMail) {
    const docRef = doc(db, 'Locations', `User-${userMail}`);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
        // docSnap.data() will be undefined in this case
        console.log('No user with such email!');
        return; 
    } 

    const userData = sortObject(docSnap.data());

    for (let [day, locations] of Object.entries(userData)) {
        if (!day.startsWith('_')) continue;

        const dayNum = day.split('Day')[1]; 

        locations.forEach((location, num) => {
            const { lat, lng, title, dayEventName } = location;
            if (lat && lng) {
                const locationInfo = {
                    name: title,
                    latLng: {lat, lng}
                };
                const createdMarker = createMarker(locationInfo);  
                
                populateDays(dayNum, num, title, dayEventName); 
            }
        });

    } 

    function sortObject(obj) {
        return Object.keys(obj).sort().reduce((result, key) => {   
            result[key] = obj[key];
            return result;
        }, {});
    }
}

function populateDays(dayNum, num, title, dayEventName) {
    dayNum === '1' ? populateDay1(dayNum, num, title, dayEventName) : populateMoreDays(dayNum, num, title, dayEventName); 
}    

function populateDay1(dayNum, num, title, dayEventName) {
    const $daySlide = document.querySelector('.cs_slide.is-8');
    setupSlide($daySlide, dayNum, num, title, dayEventName); 
} 

function populateMoreDays(dayNum, num, title, dayEventName) {
    const $daySlide = document.querySelector('.cs_slide.is-8');
    const $daySlideClone = $daySlide.cloneNode(true);

    const $newDaySlide = setupSlide($daySlideClone, dayNum, num, title, dayEventName); 
    const $slideContainer = document.querySelector('.cs-slide-body'); 

    $slideContainer.insertBefore( $newDaySlide, $daySlide.nextElementSibling ); 
}

function setupSlide($daySlide, dayNum, num, title, dayEventName) {
    const $dayNumNDate = $daySlide.querySelector('.css_heading-1');
    const $dayEventsTable = $daySlide.querySelector('.css-8_table');
    const $dayEventsTableTitleCell = $dayEventsTable.querySelector('.css-table_cell-content.is-left'); 
    const $dayEventsTableAddressCell = $dayEventsTable.querySelector('.css-table_cell-content');  
    const $dayEventsTableTitleCellClone = $dayEventsTableTitleCell.cloneNode(true);
    const $dayEventsTableAddressCellClone = $dayEventsTableAddressCell.cloneNode(true);

    $dayNumNDate.querySelector('.strong').textContent = `Day ${dayNum}`; 

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
    }
}]); 