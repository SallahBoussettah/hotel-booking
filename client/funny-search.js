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

// Format the AI response with proper line breaks and styling
function formatResponse(text) {
    // Replace newlines with HTML line breaks
    return text.replace(/\n/g, '<br>');
}

// Display error message
function displayError(message) {
    const humorContainer = document.getElementById('humor-response');
    const humorContent = document.getElementById('humor-content');
    
    humorContent.innerHTML = `<div class="error-message"><strong>Error:</strong> ${message}</div>`;
    humorContainer.classList.remove('hidden');
}

// Search for hotels with humorous response
async function searchHotelsWithHumor() {
    const location = document.getElementById('location').value.trim();
    const checkIn = document.getElementById('check-in').value;
    const checkOut = document.getElementById('check-out').value;
    const guests = document.getElementById('guests').value;
    
    if (!location) {
        alert('Please enter a destination.');
        return;
    }
    
    // Hide previous results
    hideElement('humor-response');
    hideElement('hotel-results');
    
    // Show loader
    showLoader();
    
    try {
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
        
        // Display the humorous response
        document.getElementById('humor-content').innerHTML = formatResponse(data.humorousResponse);
        showElement('humor-response');
        
        // Display hotel results if available
        if (data.hotels && data.hotels.length > 0) {
            renderHotelResults(data.hotels);
            showElement('hotel-results');
        }
    } catch (error) {
        console.error('Error:', error);
        displayError(error.message || 'Failed to search for hotels. Please try again later.');
    } finally {
        hideLoader();
    }
}

// Render hotel results
function renderHotelResults(hotels) {
    const container = document.getElementById('hotels-container');
    container.innerHTML = '';
    
    if (!hotels || hotels.length === 0) {
        container.innerHTML = '<div class="no-results">No hotels found for this location. Try another destination!</div>';
        return;
    }
    
    hotels.forEach(hotel => {
        try {
            // Handle different data structures (direct hotel object or rate object with hotel property)
            const hotelData = hotel.hotel || hotel;
            
            if (!hotelData || !hotelData.name) {
                console.error('Invalid hotel data:', hotel);
                return; // Skip this hotel
            }
            
            const hotelCard = document.createElement('div');
            hotelCard.className = 'hotel-card';
            
            // Enhanced image handling - check all possible image locations in the data structure
            let imageUrl = 'https://via.placeholder.com/300x200?text=No+Image+Available';
            
            // Try to get image from different possible structures with more thorough checking
            if (hotelData.images && hotelData.images.length > 0) {
                // Check for different image formats in the images array
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
                // Direct image property
                imageUrl = hotelData.image;
            } else if (hotelData.thumbnail) {
                // Thumbnail property
                imageUrl = hotelData.thumbnail;
            } else if (hotelData.photos && hotelData.photos.length > 0) {
                // Photos array
                imageUrl = hotelData.photos[0].url || hotelData.photos[0];
            }
            
            // More robust price display logic
            let priceDisplay = '';
            try {
                // Try different price structures
                if (hotel.roomTypes && hotel.roomTypes.length > 0) {
                    // Get the lowest price from available room types
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
                        priceDisplay = `<div class="hotel-price">From $${lowestPrice.toFixed(2)} per night</div>`;
                    }
                } else if (hotel.price) {
                    // Direct price property on hotel object
                    priceDisplay = `<div class="hotel-price">From $${parseFloat(hotel.price).toFixed(2)} per night</div>`;
                } else if (hotelData.price) {
                    // Direct price property on hotelData
                    priceDisplay = `<div class="hotel-price">From $${parseFloat(hotelData.price).toFixed(2)} per night</div>`;
                } else if (hotel.rates && hotel.rates.length > 0) {
                    // Check rates array
                    const rate = hotel.rates[0];
                    if (rate.price) {
                        priceDisplay = `<div class="hotel-price">From $${parseFloat(rate.price).toFixed(2)} per night</div>`;
                    }
                }
            } catch (priceError) {
                console.error('Error calculating price:', priceError);
                // If there's an error calculating the price, don't show any price
            }
            
            // Enhanced address extraction
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
            
            // Better rating extraction
            let rating = 3; // Default rating
            if (hotelData.rating) {
                rating = parseFloat(hotelData.rating);
            } else if (hotelData.starRating) {
                rating = parseFloat(hotelData.starRating);
            } else if (hotelData.stars) {
                rating = parseFloat(hotelData.stars);
            }
            
            // Ensure rating is within bounds
            rating = Math.max(1, Math.min(5, Math.round(rating)));
            
            // Safely get hotel ID
            const hotelId = hotelData.id || '';
            
            hotelCard.innerHTML = `
                <div class="hotel-image">
                    <img src="${imageUrl}" alt="${hotelData.name}" onerror="this.src='https://via.placeholder.com/300x200?text=No+Image+Available'">
                </div>
                <div class="hotel-info">
                    <h3 class="hotel-name">${hotelData.name}</h3>
                    <div class="hotel-address">${address || 'Address not available'}</div>
                    <div class="hotel-rating">${'★'.repeat(rating)}</div>
                    ${priceDisplay}
                    ${hotelId ? `<button class="price-btn mt-0" onclick="viewHotelDetails('${hotelId}')">View Details</button>` : ''}
                </div>
            `;
            
            container.appendChild(hotelCard);
        } catch (renderError) {
            console.error('Error rendering hotel card:', renderError, hotel);
            // Continue to the next hotel if there's an error with this one
        }
    });
    
    // If no hotels were successfully rendered, show a message
    if (container.children.length === 0) {
        container.innerHTML = '<div class="no-results">Sorry, we couldn\'t display any hotels. Try adjusting your search.</div>';
    }
}

// View hotel details (placeholder function)
function viewHotelDetails(hotelId) {
    // For now, just redirect to the details page with the hotel ID
    window.location.href = `details.html?hotelId=${hotelId}`;
} 