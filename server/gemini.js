const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Access the API key from environment variables
const apiKey = process.env.GEMINI_API_KEY;

// Initialize the Gemini API client
const genAI = new GoogleGenerativeAI(apiKey);

/**
 * Generate a response from Gemini AI
 * @param {string} prompt - The user prompt to send to Gemini
 * @param {object} options - Additional options for the model
 * @returns {Promise<string>} - The generated response text
 */
async function generateResponse(prompt, options = {}) {
  try {
    // Use gemini-1.0-pro instead of gemini-pro
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    // Set default generation config
    const generationConfig = {
      temperature: options.temperature || 0.7,
      topK: options.topK || 40,
      topP: options.topP || 0.95,
      maxOutputTokens: options.maxOutputTokens || 1024,
      ...options
    };

    // Generate content
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig
    });

    const response = result.response;
    return response.text();
  } catch (error) {
    console.error("Error generating content with Gemini:", error);
    throw error;
  }
}

/**
 * Generate hotel recommendations based on user preferences
 * @param {object} preferences - User preferences for hotel recommendations
 * @returns {Promise<string>} - AI-generated hotel recommendations
 */
async function generateHotelRecommendations(preferences) {
  const prompt = `
    As a travel expert, please provide personalized hotel recommendations based on the following preferences:
    
    Location: ${preferences.location || 'Not specified'}
    Budget per night: ${preferences.budget || 'Not specified'}
    Trip purpose: ${preferences.purpose || 'Not specified'}
    Amenities desired: ${preferences.amenities?.join(', ') || 'Not specified'}
    Number of travelers: ${preferences.travelers || 'Not specified'}
    Trip duration: ${preferences.duration || 'Not specified'}
    
    Please provide 2-3 specific recommendations with brief explanations of why they would be suitable.
  `;
  
  return generateResponse(prompt, { temperature: 0.8 });
}

/**
 * Generate a travel itinerary for a specific destination
 * @param {object} tripDetails - Details about the trip
 * @returns {Promise<string>} - AI-generated travel itinerary
 */
async function generateTravelItinerary(tripDetails) {
  const prompt = `
    Create a detailed ${tripDetails.duration || '3-day'} travel itinerary for ${tripDetails.destination || 'the destination'}.
    The travelers are ${tripDetails.travelers || 'a couple'} and they are interested in ${tripDetails.interests?.join(', ') || 'general sightseeing'}.
    Their accommodation will be at ${tripDetails.hotel || 'a local hotel'}.
    
    Please include:
    - Day-by-day schedule with morning, afternoon, and evening activities
    - Recommended local restaurants for each day
    - Transportation tips between attractions
    - Estimated costs where relevant
    - Any local customs or etiquette to be aware of
  `;
  
  return generateResponse(prompt, { temperature: 0.7, maxOutputTokens: 2048 });
}

module.exports = {
  generateResponse,
  generateHotelRecommendations,
  generateTravelItinerary
}; 