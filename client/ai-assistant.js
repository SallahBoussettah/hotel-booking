// Show loading indicator
function showLoader() {
  document.getElementById('loader').classList.remove('hidden');
}

// Hide loading indicator
function hideLoader() {
  document.getElementById('loader').classList.add('hidden');
}

// Format the AI response with proper line breaks and styling
function formatResponse(text) {
  // Replace newlines with HTML line breaks
  return text.replace(/\n/g, '<br>');
}

// Display error message in the appropriate container
function displayError(containerId, message) {
  const container = document.getElementById(containerId);
  container.innerHTML = `<div class="error-message">${message}</div>`;
  document.getElementById(containerId + '-container').style.display = 'block';
}

// Get AI response for general travel questions
async function getAIResponse() {
  const prompt = document.getElementById('ai-prompt').value.trim();
  
  if (!prompt) {
    alert('Please enter a question.');
    return;
  }
  
  showLoader();
  const responseContainer = document.getElementById('ai-response-container');
  const responseElement = document.getElementById('ai-response');
  
  try {
    const response = await fetch('/ai/assistant', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ prompt }),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get AI response');
    }
    
    // Display the formatted response
    responseElement.innerHTML = formatResponse(data.response);
    
    // Show the response container
    responseContainer.style.display = 'block';
  } catch (error) {
    console.error('Error:', error);
    displayError('ai-response', `<strong>Error:</strong> ${error.message || 'Failed to get a response. Please try again later.'}`);
  } finally {
    hideLoader();
  }
}

// Get hotel recommendations based on user preferences
async function getHotelRecommendations() {
  const location = document.getElementById('location').value.trim();
  const budget = document.getElementById('budget').value.trim();
  const purpose = document.getElementById('purpose').value;
  const amenitiesInput = document.getElementById('amenities').value.trim();
  const travelers = document.getElementById('travelers').value;
  const duration = document.getElementById('duration').value;
  
  if (!location) {
    alert('Please enter a destination.');
    return;
  }
  
  // Parse amenities as an array
  const amenities = amenitiesInput ? amenitiesInput.split(',').map(item => item.trim()) : [];
  
  const preferences = {
    location,
    budget,
    purpose,
    amenities,
    travelers,
    duration
  };
  
  showLoader();
  const recommendationsContainer = document.getElementById('recommendations-container');
  const recommendationsElement = document.getElementById('recommendations');
  
  try {
    const response = await fetch('/ai/hotel-recommendations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(preferences),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to get recommendations');
    }
    
    // Display the formatted recommendations
    recommendationsElement.innerHTML = formatResponse(data.recommendations);
    
    // Show the recommendations container
    recommendationsContainer.style.display = 'block';
  } catch (error) {
    console.error('Error:', error);
    displayError('recommendations', `<strong>Error:</strong> ${error.message || 'Failed to get recommendations. Please try again later.'}`);
  } finally {
    hideLoader();
  }
}

// Generate travel itinerary
async function generateItinerary() {
  const destination = document.getElementById('destination').value.trim();
  const duration = document.getElementById('trip-duration').value;
  const travelers = document.getElementById('trip-travelers').value.trim();
  const interestsInput = document.getElementById('interests').value.trim();
  const hotel = document.getElementById('hotel-name').value.trim();
  
  if (!destination) {
    alert('Please enter a destination.');
    return;
  }
  
  // Parse interests as an array
  const interests = interestsInput ? interestsInput.split(',').map(item => item.trim()) : [];
  
  const tripDetails = {
    destination,
    duration,
    travelers,
    interests,
    hotel
  };
  
  showLoader();
  const itineraryContainer = document.getElementById('itinerary-container');
  const itineraryElement = document.getElementById('itinerary');
  
  try {
    const response = await fetch('/ai/travel-itinerary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tripDetails),
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Failed to generate itinerary');
    }
    
    // Display the formatted itinerary
    itineraryElement.innerHTML = formatResponse(data.itinerary);
    
    // Show the itinerary container
    itineraryContainer.style.display = 'block';
  } catch (error) {
    console.error('Error:', error);
    displayError('itinerary', `<strong>Error:</strong> ${error.message || 'Failed to generate itinerary. Please try again later.'}`);
  } finally {
    hideLoader();
  }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', function() {
  // Hide response containers initially
  document.getElementById('ai-response-container').style.display = 'none';
  document.getElementById('recommendations-container').style.display = 'none';
  document.getElementById('itinerary-container').style.display = 'none';
}); 