// Global variables
let hotels = [];
let currentHotelIndex = 0;
let matchedHotels = [];

// Set minimum dates for check-in and check-out
document.addEventListener('DOMContentLoaded', function() {
    // Set min date to today for check-in
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    
    document.getElementById('check-in').min = formatDate(today);
    document.getElementById('check-out').min = formatDate(tomorrow);
    
    // Set default dates (today and tomorrow)
    document.getElementById('check-in').value = formatDate(today);
    document.getElementById('check-out').value = formatDate(tomorrow);
    
    // Add event listener to update check-out min date when check-in changes
    document.getElementById('check-in').addEventListener('change', function() {
        const checkInDate = new Date(this.value);
        const nextDay = new Date(checkInDate);
        nextDay.setDate(checkInDate.getDate() + 1);
        document.getElementById('check-out').min = formatDate(nextDay);
        
        // If check-out is before new check-in + 1, update it
        const checkOutDate = new Date(document.getElementById('check-out').value);
        if (checkOutDate <= checkInDate) {
            document.getElementById('check-out').value = formatDate(nextDay);
        }
    });
});

// Show loading indicator
function showLoader() {
    document.getElementById('loader').classList.remove('hidden');
}

// Hide loading indicator
function hideLoader() {
    document.getElementById('loader').classList.add('hidden');
}

// Show element by ID
function showElement(id) {
    document.getElementById(id).classList.remove('hidden');
}

// Hide element by ID
function hideElement(id) {
    document.getElementById(id).classList.add('hidden');
}

// Start swiping hotels
async function startSwiping() {
    const location = document.getElementById('location').value.trim();
    const checkIn = document.getElementById('check-in').value;
    const checkOut = document.getElementById('check-out').value;
    const guests = document.getElementById('guests').value;
    
    if (!location) {
        alert('Please enter a destination.');
        return;
    }
    
    // Reset previous data
    hotels = [];
    currentHotelIndex = 0;
    matchedHotels = [];
    document.getElementById('matches-list').innerHTML = '';
    hideElement('matches-container');
    hideElement('swiper-container');
    hideElement('no-hotels');
    
    // Show loader
    showLoader();
    
    try {
        // Fetch hotels from the server
        const response = await fetch('/ai/funny-hotel-search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                location,
                checkIn,
                checkOut,
                guests
            }),
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.error || 'Failed to search for hotels');
        }
        
        // Store the hotels
        if (data.hotels && data.hotels.length > 0) {
            hotels = data.hotels;
            showElement('swiper-container');
            displayCurrentHotel();
        } else {
            showElement('no-hotels');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Failed to search for hotels. Please try again later.');
    } finally {
        hideLoader();
    }
}

// Display the current hotel
function displayCurrentHotel() {
    if (currentHotelIndex >= hotels.length) {
        // No more hotels to show
        showElement('no-hotels');
        hideElement('swiper-container');
        return;
    }
    
    const hotel = hotels[currentHotelIndex];
    const hotelData = hotel.hotel || hotel;
    
    if (!hotelData || !hotelData.name) {
        // Skip invalid hotel data
        currentHotelIndex++;
        displayCurrentHotel();
        return;
    }
    
    // Reset card animation
    const card = document.getElementById('hotel-card');
    card.className = 'swiper-card fade-in';
    
    // Set hotel image
    let imageUrl = 'https://via.placeholder.com/400x300?text=No+Image+Available';
    
    // Try to get image from different possible structures
    if (hotelData.images && hotelData.images.length > 0) {
        const firstImage = hotelData.images[0];
        if (firstImage.url) {
            imageUrl = firstImage.url;
        } else if (firstImage.image) {
            imageUrl = firstImage.image;
        } else if (firstImage.thumbnail) {
            imageUrl = firstImage.thumbnail;
        } else if (typeof firstImage === 'string') {
            imageUrl = firstImage;
        }
    } else if (hotelData.image) {
        imageUrl = hotelData.image;
    } else if (hotelData.thumbnail) {
        imageUrl = hotelData.thumbnail;
    } else if (hotelData.photos && hotelData.photos.length > 0) {
        imageUrl = hotelData.photos[0].url || hotelData.photos[0];
    }
    
    document.getElementById('hotel-image').src = imageUrl;
    
    // Set hotel name
    document.getElementById('hotel-name').textContent = hotelData.name;
    
    // Set hotel address
    let address = '';
    if (hotelData.address && typeof hotelData.address === 'string') {
        address = hotelData.address;
    } else if (hotelData.address && hotelData.address.full) {
        address = hotelData.address.full;
    } else if (hotelData.location && hotelData.location.address) {
        address = hotelData.location.address;
    } else if (hotelData.city) {
        address = hotelData.city + (hotelData.country ? ', ' + hotelData.country : '');
    }
    document.getElementById('hotel-address').textContent = address || 'Address not available';
    
    // Set hotel rating
    let rating = 3; // Default rating
    if (hotelData.rating) {
        rating = parseFloat(hotelData.rating);
    } else if (hotelData.starRating) {
        rating = parseFloat(hotelData.starRating);
    } else if (hotelData.stars) {
        rating = parseFloat(hotelData.stars);
    }
    rating = Math.max(1, Math.min(5, Math.round(rating)));
    document.getElementById('hotel-rating').textContent = '★'.repeat(rating);
    
    // Set hotel price
    let priceText = 'Price not available';
    try {
        if (hotel.roomTypes && hotel.roomTypes.length > 0) {
            const prices = [];
            hotel.roomTypes.forEach(room => {
                if (room.rates && room.rates.length > 0) {
                    room.rates.forEach(rate => {
                        if (rate.retailRate && rate.retailRate.total && rate.retailRate.total.length > 0) {
                            prices.push(parseFloat(rate.retailRate.total[0].amount));
                        } else if (rate.price) {
                            prices.push(parseFloat(rate.price));
                        }
                    });
                }
            });
            
            if (prices.length > 0) {
                const lowestPrice = Math.min(...prices);
                priceText = `$${lowestPrice.toFixed(2)} per night`;
            }
        } else if (hotel.price) {
            priceText = `$${parseFloat(hotel.price).toFixed(2)} per night`;
        } else if (hotelData.price) {
            priceText = `$${parseFloat(hotelData.price).toFixed(2)} per night`;
        } else if (hotel.rates && hotel.rates.length > 0) {
            const rate = hotel.rates[0];
            if (rate.price) {
                priceText = `$${parseFloat(rate.price).toFixed(2)} per night`;
            }
        }
    } catch (error) {
        console.error('Error calculating price:', error);
    }
    document.getElementById('hotel-price').textContent = priceText;
    
    // Enable swipe buttons
    document.getElementById('swipe-left').disabled = false;
    document.getElementById('swipe-right').disabled = false;
}

// Swipe left (dislike)
function swipeLeft() {
    const card = document.getElementById('hotel-card');
    card.classList.add('swiping-left');
    
    // Disable buttons during animation
    document.getElementById('swipe-left').disabled = true;
    document.getElementById('swipe-right').disabled = true;
    
    // Move to next hotel after animation
    setTimeout(() => {
        currentHotelIndex++;
        getHumorousResponse('dislike');
    }, 300);
}

// Swipe right (like)
function swipeRight() {
    const card = document.getElementById('hotel-card');
    card.classList.add('swiping-right');
    
    // Disable buttons during animation
    document.getElementById('swipe-left').disabled = true;
    document.getElementById('swipe-right').disabled = true;
    
    // Add to matches
    const hotel = hotels[currentHotelIndex];
    const hotelData = hotel.hotel || hotel;
    matchedHotels.push(hotelData);
    updateMatches();
    
    // Move to next hotel after animation
    setTimeout(() => {
        currentHotelIndex++;
        getHumorousResponse('like');
    }, 300);
}

// Update matches list
function updateMatches() {
    const matchesList = document.getElementById('matches-list');
    const matchesContainer = document.getElementById('matches-container');
    
    // Only show matches container if we have matches
    if (matchedHotels.length > 0) {
        showElement('matches-container');
    }
    
    // Get the latest match
    const hotel = matchedHotels[matchedHotels.length - 1];
    
    // Create match item
    const matchItem = document.createElement('div');
    matchItem.className = 'match-item';
    
    // Get image URL
    let imageUrl = 'https://via.placeholder.com/50x50?text=No+Image';
    if (hotel.images && hotel.images.length > 0) {
        const firstImage = hotel.images[0];
        if (firstImage.url) {
            imageUrl = firstImage.url;
        } else if (firstImage.image) {
            imageUrl = firstImage.image;
        } else if (typeof firstImage === 'string') {
            imageUrl = firstImage;
        }
    } else if (hotel.image) {
        imageUrl = hotel.image;
    } else if (hotel.thumbnail) {
        imageUrl = hotel.thumbnail;
    }
    
    // Create match item HTML
    matchItem.innerHTML = `
        <img src="${imageUrl}" alt="${hotel.name}" onerror="this.src='https://via.placeholder.com/50x50?text=No+Image'">
        <div class="match-info">
            <h4>${hotel.name}</h4>
            <p>${hotel.city || ''}</p>
        </div>
    `;
    
    // Add to matches list
    matchesList.appendChild(matchItem);
}

// Get humorous response from Gemini AI
async function getHumorousResponse(swipeType) {
    try {
        const hotel = hotels[currentHotelIndex - 1]; // The hotel that was just swiped
        const hotelData = hotel.hotel || hotel;
        
        // Prepare the prompt based on swipe type
        let prompt;
        if (swipeType === 'like') {
            prompt = `
                You are a sophisticated, witty travel agent with a dry sense of humor and excellent vocabulary. 
                The user just swiped right (liked) on a hotel called "${hotelData.name}" in ${hotelData.city || 'this city'}.
                
                Write a clever, funny response (2-3 sentences) that playfully teases them about their choice in a good-natured way.
                
                Your response should:
                - Use sophisticated humor and wordplay
                - Avoid filler phrases like "eh?" or "huh?"
                - Perhaps reference what type of traveler would choose this hotel
                - Maybe joke about a fictional amenity or feature
                - Be witty without being mean-spirited
                
                Make it sound like something a clever travel writer would say.
            `;
        } else {
            prompt = `
                You are a sophisticated, witty travel agent with a dry sense of humor and excellent vocabulary.
                The user just swiped left (disliked) on a hotel called "${hotelData.name}" in ${hotelData.city || 'this city'}.
                
                Write a clever, funny response (2-3 sentences) that validates their rejection in an amusing way.
                
                Your response should:
                - Use sophisticated humor and wordplay
                - Avoid filler phrases like "eh?" or "huh?"
                - Perhaps make an amusing observation about their standards
                - Maybe invent a humorous fictional flaw about the hotel
                - Be witty without being mean-spirited
                
                Make it sound like something a clever travel writer would say.
            `;
        }
        
        // Show the modal with loading message
        document.getElementById('modal-title').textContent = swipeType === 'like' ? 'Great Match!' : 'Not Your Type?';
        document.getElementById('modal-text').textContent = 'Getting AI thoughts...';
        showElement('humor-modal');
        
        // Fetch humorous response from server
        const response = await fetch('/ai/assistant', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ prompt }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.response) {
            document.getElementById('modal-text').innerHTML = data.response.replace(/\n/g, '<br>');
        } else {
            document.getElementById('modal-text').textContent = swipeType === 'like' 
                ? 'Good choice! This one looks promising.' 
                : 'No problem, plenty more hotels to see!';
        }
    } catch (error) {
        console.error('Error getting humorous response:', error);
        document.getElementById('modal-text').textContent = 'Hmm, my witty remark generator seems to be on vacation.';
    }
}

// Close the humor modal and show next hotel
function closeModal() {
    hideElement('humor-modal');
    displayCurrentHotel();
}

// Reset search
function resetSearch() {
    hideElement('no-hotels');
    document.getElementById('location').value = '';
    document.getElementById('matches-list').innerHTML = '';
    hideElement('matches-container');
    hotels = [];
    currentHotelIndex = 0;
    matchedHotels = [];
} 