const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const liteApi = require("liteapi-node-sdk");
const cors = require("cors");
const path = require("path");
const geminiAI = require("./gemini");
require("dotenv").config();

app.use(
  cors({
    origin: "*",
  })
);

const prod_apiKey = process.env.PROD_API_KEY;
const sandbox_apiKey = process.env.SAND_API_KEY;

app.use(bodyParser.json());

app.get("/search-hotels", async (req, res) => {
  console.log("Search endpoint hit");
  const { checkin, checkout, adults, city, countryCode, environment } = req.query;
  const apiKey = environment == "sandbox" ? sandbox_apiKey : prod_apiKey;
  const sdk = liteApi(apiKey);

  try {
    // Get hotels for the specified city and country
    console.log(`Searching for hotels in ${city}, ${countryCode}`);
    const response = await sdk.getHotels(countryCode, city, 0, 10);
    const data = (await response).data;
    
    if (!data || data.length === 0) {
      console.log("No hotels found for the location");
      return res.json({ rates: [] });
    }
    
    console.log(`Found ${data.length} hotels`);
    const hotelIds = data.map((hotel) => hotel.id);
    
    try {
      // Get rates for the found hotels
      const ratesResponse = await sdk.getFullRates({
        hotelIds: hotelIds,
        occupancies: [{ adults: parseInt(adults, 10) }],
        currency: "USD",
        guestNationality: "US",
        checkin: checkin,
        checkout: checkout,
      });
      
      const rates = ratesResponse.data;
      
      // Only process rates if they exist
      if (rates && rates.length > 0) {
        // Add hotel details to each rate
        rates.forEach((rate) => {
          if (rate && rate.hotelId) {
            rate.hotel = data.find((hotel) => hotel.id === rate.hotelId);
          }
        });
        
        // Filter out any rates without hotel data
        const validRates = rates.filter(rate => rate.hotel);
        res.json({ rates: validRates });
      } else {
        console.log("No rates found for the hotels");
        // Return the basic hotel data without rates
        res.json({ rates: data.map(hotel => ({ hotel })) });
      }
    } catch (ratesError) {
      console.error("Error fetching rates:", ratesError);
      // Return the basic hotel data if rates fetch fails
      res.json({ rates: data.map(hotel => ({ hotel })) });
    }
  } catch (error) {
    console.error("Error searching for hotels:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/search-rates", async (req, res) => {
  console.log("Rate endpoint hit");
  const { checkin, checkout, adults, hotelId, environment } = req.query;
  const apiKey = environment === "sandbox" ? sandbox_apiKey : prod_apiKey;
  const sdk = liteApi(apiKey);

  try {
    // Fetch hotel details first
    console.log(`Fetching details for hotel ID: ${hotelId}`);
    const hotelsResponse = await sdk.getHotelDetails(hotelId);
    const hotelInfo = hotelsResponse.data;
    
    if (!hotelInfo) {
      console.log(`No hotel found with ID: ${hotelId}`);
      return res.status(404).json({ error: "Hotel not found" });
    }
    
    let rateInfo = [];
    
    try {
      // Fetch rates for the specified hotel
      console.log(`Fetching rates for hotel ID: ${hotelId}`);
      const ratesResponse = await sdk.getFullRates({
        hotelIds: [hotelId],
        occupancies: [{ adults: parseInt(adults, 10) }],
        currency: "USD",
        guestNationality: "US",
        checkin: checkin,
        checkout: checkout,
      });
      
      const rates = ratesResponse.data;
      
      // Only process rates if they exist
      if (rates && rates.length > 0) {
        // Prepare the response data
        rateInfo = rates.map((hotel) => {
          if (!hotel.roomTypes || hotel.roomTypes.length === 0) {
            return [];
          }
          
          return hotel.roomTypes.flatMap((roomType) => {
            // Define the board types we're interested in
            const boardTypes = ["RO", "BI"];
            
            if (!roomType.rates || roomType.rates.length === 0) {
              return [];
            }

            // Filter rates by board type and sort by refundable tag
            return boardTypes
              .map((boardType) => {
                const filteredRates = roomType.rates.filter((rate) => rate.boardType === boardType);

                // Sort to prioritize 'RFN' over 'NRFN'
                const sortedRates = filteredRates.sort((a, b) => {
                  if (
                    a.cancellationPolicies && a.cancellationPolicies.refundableTag === "RFN" &&
                    (!b.cancellationPolicies || b.cancellationPolicies.refundableTag !== "RFN")
                  ) {
                    return -1; // a before b
                  } else if (
                    b.cancellationPolicies && b.cancellationPolicies.refundableTag === "RFN" &&
                    (!a.cancellationPolicies || a.cancellationPolicies.refundableTag !== "RFN")
                  ) {
                    return 1; // b before a
                  }
                  return 0; // no change in order
                });

                // Return the first rate meeting the criteria if it exists
                if (sortedRates.length > 0) {
                  const rate = sortedRates[0];
                  
                  // Check if all required properties exist
                  if (rate.retailRate && rate.retailRate.total && rate.retailRate.total.length > 0 &&
                      rate.retailRate.suggestedSellingPrice && rate.retailRate.suggestedSellingPrice.length > 0) {
                    return {
                      rateName: rate.name || "Standard Rate",
                      offerId: roomType.offerId || "",
                      board: rate.boardName || boardType,
                      refundableTag: rate.cancellationPolicies ? rate.cancellationPolicies.refundableTag : "Unknown",
                      retailRate: rate.retailRate.total[0].amount,
                      originalRate: rate.retailRate.suggestedSellingPrice[0].amount,
                    };
                  }
                }
                return null; // or some default object if no rates meet the criteria
              })
              .filter((rate) => rate !== null); // Filter out null values if no rates meet the criteria
          });
        });
      } else {
        console.log("No rates found for the hotel");
      }
    } catch (ratesError) {
      console.error("Error fetching rates:", ratesError);
      // Continue with just the hotel info
    }
    
    res.json({ hotelInfo, rateInfo });
  } catch (error) {
    console.error("Error fetching hotel details:", error);
    res.status(500).json({ error: "No availability found" });
  }
});

app.post("/prebook", async (req, res) => {
  //console.log(req.body);
  const { rateId, environment, voucherCode } = req.body;
  const apiKey = environment === "sandbox" ? sandbox_apiKey : prod_apiKey;
  const sdk = liteApi(apiKey);
  //console.log(apiKey, "apiKey");
  const bodyData = {
    offerId: rateId,
    usePaymentSdk: true,
  };

  // Conditionally add the voucherCode if it exists in the request body
  if (voucherCode) {
    bodyData.voucherCode = voucherCode;
  }

  try {
    // Call the SDK's prebook method and handle the response
    sdk
      .preBook(bodyData)
      .then((response) => {
        res.json({ success: response }); // Send response back to the client
      })
      .catch((err) => {
        console.error("Error:", err); // Print the error if any
        res.status(500).json({ error: "Internal Server Error" }); // Send error response
      });
  } catch (err) {
    console.error(" Prebook error:", err); // Handle errors related to SDK usage
    res.status(500).json({ error: "Internal Server Error" }); // Send error response
  }
});

app.get("/book", (req, res) => {
  console.log(req.query);
  const { prebookId, guestFirstName, guestLastName, guestEmail, transactionId, environment } =
    req.query;

  const apiKey = environment === "sandbox" ? sandbox_apiKey : prod_apiKey;
  const sdk = liteApi(apiKey);

	// Prepare the booking data
  const bodyData = {
    holder: {
      firstName: guestFirstName,
      lastName: guestLastName,
      email: guestEmail,
    },
    payment: {
      method: "TRANSACTION_ID",
      transactionId: transactionId,
    },
    prebookId: prebookId,
    guests: [
      {
        occupancyNumber: 1,
        remarks: "",
        firstName: guestFirstName,
        lastName: guestLastName,
        email: guestEmail,
      },
    ],
  };

  console.log(bodyData);

  sdk
    .book(bodyData)
    .then((data) => {
      if (!data || data.error) {
        // Validate if there's any error in the data
        throw new Error(
          "Error in booking data: " + (data.error ? data.error.message : "Unknown error")
        );
      }

      console.log(data);

      res.send(`
        <!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Booking Confirmation</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 20px;
        }
        h1 {
            color: #333;
        }
        .booking-details, .room-details, .policy-details {
            margin-bottom: 20px;
            padding: 10px;
            border: 1px solid #ccc;
            border-radius: 5px;
        }
        .header {
            font-weight: bold;
            color: #444;
        }
    </style>
</head>
<body>
    <h1>Booking Confirmation</h1>
    <div class="booking-details">
        <div class="header">Booking Information:</div>
        <p>Booking ID: ${data.data.bookingId}</p>
        <p>Supplier Name: ${data.data.supplierBookingName} (${data.data.supplier})</p>
        <p>Status: ${data.data.status}</p>
        <p>Check-in: ${data.data.checkin}</p>
        <p>Check-out: ${data.data.checkout}</p>
        <p>Hotel: ${data.data.hotel.name} (ID: ${data.data.hotel.hotelId})</p>
    </div>

    <div class="room-details">
        <div class="header">Room Details:</div>
        <p>Room Type: ${data.data.bookedRooms[0].roomType.name}</p>
        <p>Rate (Total): $${data.data.bookedRooms[0].rate.retailRate.total.amount} ${
        data.data.bookedRooms[0].rate.retailRate.total.currency
      }</p>
        <p>Occupancy: ${data.data.bookedRooms[0].adults} Adult(s), ${
        data.data.bookedRooms[0].children
      } Child(ren)</p>
        <p>Guest Name: ${data.data.bookedRooms[0].firstName} ${
        data.data.bookedRooms[0].lastName
      }</p>
    </div>
<div class="policy-details">
    <div class="header">Cancellation Policy:</div>
    <p>Cancel By: ${
      data.data.cancellationPolicies &&
      data.data.cancellationPolicies.cancelPolicyInfos &&
      data.data.cancellationPolicies.cancelPolicyInfos[0]
        ? data.data.cancellationPolicies.cancelPolicyInfos[0].cancelTime
        : "Not specified"
    }</p>
    <p>Cancellation Fee: ${
      data.data.cancellationPolicies &&
      data.data.cancellationPolicies.cancelPolicyInfos &&
      data.data.cancellationPolicies.cancelPolicyInfos[0]
        ? `$${data.data.cancellationPolicies.cancelPolicyInfos[0].amount}`
        : "Not specified"
    }</p>
    <p>Remarks: ${data.data.remarks || "No additional remarks."}</p>
</div>

    <a href="/"><button>Back to Hotels</button></a>
</body>
</html>
      `);
    })
    .catch((err) => {
      console.error("Error during booking:", err);
      res.status(500).send(`Failed to book: ${err.message}`);
    });
});

// Serve the client-side application
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/index.html"));
});

app.use(express.static(path.join(__dirname, "../client")));

// New endpoints for Gemini AI integration

// Generate hotel recommendations based on user preferences
app.post("/ai/hotel-recommendations", async (req, res) => {
  try {
    const preferences = req.body;
    
    // Validate required fields
    if (!preferences.location) {
      return res.status(400).json({ error: "Destination location is required" });
    }
    
    const recommendations = await geminiAI.generateHotelRecommendations(preferences);
    res.json({ recommendations });
  } catch (error) {
    console.error("Error generating hotel recommendations:", error);
    const errorMessage = error.message || "Failed to generate recommendations";
    res.status(500).json({ error: errorMessage });
  }
});

// Generate travel itinerary for a specific destination
app.post("/ai/travel-itinerary", async (req, res) => {
  try {
    const tripDetails = req.body;
    
    // Validate required fields
    if (!tripDetails.destination) {
      return res.status(400).json({ error: "Destination is required" });
    }
    
    const itinerary = await geminiAI.generateTravelItinerary(tripDetails);
    res.json({ itinerary });
  } catch (error) {
    console.error("Error generating travel itinerary:", error);
    const errorMessage = error.message || "Failed to generate itinerary";
    res.status(500).json({ error: errorMessage });
  }
});

// General AI assistant endpoint for travel-related queries
app.post("/ai/assistant", async (req, res) => {
  try {
    const { prompt } = req.body;
    
    // Validate required fields
    if (!prompt) {
      return res.status(400).json({ error: "Question prompt is required" });
    }
    
    // Add travel context to the prompt
    const contextualPrompt = `As a travel assistant, please help with the following question: ${prompt}`;
    
    const response = await geminiAI.generateResponse(contextualPrompt);
    res.json({ response });
  } catch (error) {
    console.error("Error generating AI response:", error);
    const errorMessage = error.message || "Failed to generate response";
    res.status(500).json({ error: errorMessage });
  }
});

// New endpoint for humorous hotel search
app.post("/ai/funny-hotel-search", async (req, res) => {
  try {
    const { location, checkIn, checkOut, guests } = req.body;
    
    // Validate required fields
    if (!location) {
      return res.status(400).json({ error: "Location is required" });
    }
    
    // Get actual hotel results from LiteAPI
    const apiKey = process.env.SAND_API_KEY; // Using sandbox key
    const sdk = liteApi(apiKey);
    
    let hotelResults = [];
    try {
      // Improved location parsing
      const locationParts = location.split(',').map(part => part.trim());
      let city = locationParts[0];
      let countryCode = "US"; // Default to US
      
      // Country code mapping for common international destinations
      const countryCodeMap = {
        "morocco": "MA",
        "france": "FR",
        "uk": "GB",
        "united kingdom": "GB",
        "spain": "ES",
        "italy": "IT",
        "germany": "DE",
        "japan": "JP",
        "china": "CN",
        "india": "IN",
        "australia": "AU",
        "canada": "CA",
        "mexico": "MX",
        "brazil": "BR",
        "egypt": "EG",
        "thailand": "TH",
        "turkey": "TR"
      };
      
      // Check if we have a country part
      if (locationParts.length > 1) {
        const countryPart = locationParts[1].toLowerCase();
        
        // Check if it's a 2-letter code already
        if (countryPart.length === 2) {
          countryCode = countryPart.toUpperCase();
        } 
        // Check if it's in our mapping
        else if (countryCodeMap[countryPart]) {
          countryCode = countryCodeMap[countryPart];
        }
        // Special case for Morocco with incorrect "MO" code
        else if (countryPart === "mo" && city.toLowerCase() === "marrakech") {
          countryCode = "MA"; // Correct code for Morocco
        }
      }
      
      // Special case handling for well-known cities
      if (city.toLowerCase() === "marrakech" || city.toLowerCase() === "marrakesh") {
        countryCode = "MA"; // Morocco
      } else if (city.toLowerCase() === "paris") {
        countryCode = "FR"; // France
      } else if (city.toLowerCase() === "london") {
        countryCode = "GB"; // United Kingdom
      } else if (city.toLowerCase() === "rome") {
        countryCode = "IT"; // Italy
      } else if (city.toLowerCase() === "tokyo") {
        countryCode = "JP"; // Japan
      }
      
      console.log(`Searching for hotels in ${city}, ${countryCode}`);
      
      // Get hotels from LiteAPI - increase to 10 hotels
      const response = await sdk.getHotels(countryCode, city, 0, 10);
      let hotels = (await response).data;
      
      if (!hotels || hotels.length === 0) {
        console.log("No hotels found for the location");
        hotelResults = [];
      } else {
        console.log(`Found ${hotels.length} hotels`);
        
        // Get detailed hotel information for each hotel to ensure we have images
        const detailedHotels = [];
        
        // Process hotels in batches to avoid overwhelming the API
        const batchSize = 3;
        for (let i = 0; i < hotels.length; i += batchSize) {
          const batch = hotels.slice(i, i + batchSize);
          const detailPromises = batch.map(hotel => 
            sdk.getHotelDetails(hotel.id)
              .then(response => response.data)
              .catch(error => {
                console.error(`Error fetching details for hotel ${hotel.id}:`, error);
                return hotel; // Return original hotel data if details fetch fails
              })
          );
          
          const batchDetails = await Promise.all(detailPromises);
          detailedHotels.push(...batchDetails);
        }
        
        // Replace hotels array with detailed hotel information
        hotels = detailedHotels.filter(hotel => hotel); // Filter out any nulls
        
        // If we have check-in and check-out dates, get rates too
        if (checkIn && checkOut) {
          const hotelIds = hotels.map(hotel => hotel.id);
          
          try {
            const ratesResponse = await sdk.getFullRates({
              hotelIds: hotelIds,
              occupancies: [{ adults: parseInt(guests || 2, 10) }],
              currency: "USD",
              guestNationality: "US",
              checkin: checkIn,
              checkout: checkOut,
            });
            
            const rates = ratesResponse.data;
            
            // Combine hotel data with rates only if rates is defined and has items
            if (rates && rates.length > 0) {
              rates.forEach(rate => {
                if (rate && rate.hotelId) {
                  // Find the detailed hotel data
                  const hotelDetails = hotels.find(hotel => hotel.id === rate.hotelId);
                  if (hotelDetails) {
                    rate.hotel = hotelDetails;
                  }
                }
              });
              
              hotelResults = rates.filter(rate => rate.hotel); // Only include rates with valid hotel data
              
              // If we got fewer results with rates than we had hotels, add the missing hotels
              if (hotelResults.length < hotels.length) {
                const ratedHotelIds = hotelResults.map(rate => rate.hotelId);
                const missingHotels = hotels.filter(hotel => !ratedHotelIds.includes(hotel.id));
                
                // Add missing hotels to the results
                missingHotels.forEach(hotel => {
                  hotelResults.push({ hotel });
                });
              }
            } else {
              console.log("No rates found, using basic hotel data");
              hotelResults = hotels.map(hotel => ({ hotel }));
            }
          } catch (ratesError) {
            console.error("Error fetching rates:", ratesError);
            hotelResults = hotels.map(hotel => ({ hotel })); // Fallback to just hotels without rates
          }
        } else {
          hotelResults = hotels.map(hotel => ({ hotel }));
        }
      }
    } catch (apiError) {
      console.error("Error fetching hotels from LiteAPI:", apiError);
      // Continue with just the humorous response if hotel fetch fails
    }
    
    // Generate a humorous response using Gemini
    const humorPrompt = `
      You are a sarcastic, witty travel agent with a dry sense of humor. The user is searching for hotels in "${location}"
      ${checkIn ? `from ${checkIn} to ${checkOut}` : ''}
      ${guests ? `for ${guests} guests` : ''}.
      
      Write a funny, slightly sarcastic response (about 3-4 sentences) that gently pokes fun at their destination choice
      or travel plans. Be creative, unexpected and genuinely funny without being mean-spirited.
      Include at least one absurd "fact" about the location that sounds plausible but is clearly made up.
      End with a reluctant admission that you've found some decent hotels anyway.
    `;
    
    const humorousResponse = await geminiAI.generateResponse(humorPrompt, { temperature: 0.9 });
    
    // Send both the humorous response and the actual hotel results
    res.json({
      humorousResponse,
      hotels: hotelResults
    });
  } catch (error) {
    console.error("Error in funny hotel search:", error);
    const errorMessage = error.message || "Failed to process your search";
    res.status(500).json({ error: errorMessage });
  }
});

const port = 3000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
