"use client"

import { useState, useEffect } from "react"
import ConnectionStatus from "../ConnectionStatus"
// Initial cities to load
const initialCityNames = [
  "Bangkok",
  "Beijing",
  "Cairo",
  "Delhi",
  "Dhaka",
  "Istanbul",
  "Jakarta",
  "Karachi",
  "Kinshasa",
  "Lagos",
  "London",
  "Mexico City",
  "Mumbai",
  "New York",
  "Tokyo",
]

function Home({ navigate, cities, setCities, apiKey }) {
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load cities from localStorage or fetch initial data
  useEffect(() => {
    const loadCities = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Check if we have saved cities in localStorage
        const savedCities = localStorage.getItem("cities")

        if (savedCities) {
          setCities(JSON.parse(savedCities))
          setIsLoading(false)
          return
        }

        // If no saved cities, fetch the initial list
        const cityPromises = initialCityNames.map(async (cityName, index) => {
          try {
            const response = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?q=${cityName}&units=Metric&appid=${apiKey}`,
            )

            if (!response.ok) {
              throw new Error(`Failed to fetch data for ${cityName}`)
            }

            const data = await response.json()

            // Store the complete API response
            return {
              id: data.id,
              name: data.name,
              country: data.sys.country,
              coord: data.coord,
              temp: Math.round(data.main.temp),
              main: data.main,
              weather: data.weather[0],
              wind: data.wind,
              clouds: data.clouds,
              visibility: data.visibility,
              dt: data.dt,
              sys: data.sys,
              timezone: data.timezone,
              isFavorite: false,
              // Store the complete raw data for future reference
              rawData: data,
            }
          } catch (err) {
            console.error(`Error fetching ${cityName}:`, err)
            // Return a placeholder for failed cities
            return {
              id: index + 1000,
              name: cityName,
              country: "Unknown",
              temp: 0,
              weather: {
                main: "Unknown",
                description: "Data unavailable",
                icon: "50d",
              },
              isFavorite: false,
            }
          }
        })

        const fetchedCities = await Promise.all(cityPromises)
        setCities(fetchedCities)
        localStorage.setItem("cities", JSON.stringify(fetchedCities))
      } catch (err) {
        console.error("Error loading cities:", err)
        setError("Failed to load cities. Please try again later.")
      } finally {
        setIsLoading(false)
      }
    }

    loadCities()
  }, [apiKey, setCities])

  // Save cities to localStorage whenever they change
  useEffect(() => {
    if (cities && cities.length > 0) {
      localStorage.setItem("cities", JSON.stringify(cities))
    }
  }, [cities])

  // Handle search
  // const handleSearch = async () => {
  //   if (!searchTerm.trim()) {
  //     setSearchResults([])
  //     return
  //   }

  //   try {
  //     // Check if city already exists in our list
  //     const cityExists = cities.find((city) => city.name.toLowerCase() === searchTerm.toLowerCase())

  //     if (cityExists) {
  //       setSearchResults([cityExists])
  //       return
  //     }

  //     // Fetch from API
  //     const response = await fetch(
  //       `https://api.openweathermap.org/data/2.5/weather?q=${searchTerm}&units=Metric&appid=${apiKey}`,
  //     )

  //     if (!response.ok) {
  //       throw new Error(`City "${searchTerm}" not found`)
  //     }

  //     const data = await response.json()

  //     const newCity = {
  //       id: data.id,
  //       name: data.name,
  //       country: data.sys?.country || "Unknown",
  //       coord: data.coord || { lat: 0, lon: 0 },
  //       temp: Math.round(data.main?.temp || 0),
  //       main: data.main || {
  //         temp: 0,
  //         feels_like: 0,
  //         temp_min: 0,
  //         temp_max: 0,
  //         pressure: 1013,
  //         humidity: 70,
  //       },
  //       weather: data.weather?.[0] || {
  //         main: "Unknown",
  //         description: "No data available",
  //         icon: "50d",
  //       },
  //       wind: data.wind || { speed: 0, deg: 0 },
  //       clouds: data.clouds || { all: 0 },
  //       visibility: data.visibility || 10000,
  //       dt: data.dt || Math.floor(Date.now() / 1000),
  //       sys: data.sys || {
  //         country: "Unknown",
  //         sunrise: Math.floor(Date.now() / 1000) - 21600,
  //         sunset: Math.floor(Date.now() / 1000) + 21600,
  //       },
  //       timezone: data.timezone || 0,
  //       isFavorite: false,
  //       // Store the complete raw data for future reference
  //       rawData: data,
  //     }

  //     setSearchResults([newCity])

  //     // Log the complete data to console for debugging
  //     console.log("API Response:", data)
  //   } catch (err) {
  //     console.error("Search error:", err)
  //     setSearchResults([])
  //     setError(`City "${searchTerm}" not found. Please check the spelling and try again.`)

  //     // Clear error after 3 seconds
  //     setTimeout(() => setError(null), 3000)
  //   }
  // }


  // Handle search
const handleSearch = async () => {
  if (!searchTerm.trim()) {
    setSearchResults([])
    return
  }
  
  try {
    // First check if cities already exist in our list
    const matchingCities = cities.filter((city) => 
      city.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
    
    if (matchingCities.length > 0) {
      setSearchResults(matchingCities)
      return
    }
    
    // Use the geocoding API to get multiple cities
    const geoResponse = await fetch(
      `https://api.openweathermap.org/geo/1.0/direct?q=${searchTerm}&limit=5&appid=${apiKey}`
    )
    
    if (!geoResponse.ok) {
      throw new Error(`Search for "${searchTerm}" failed`)
    }
    
    const geoData = await geoResponse.json()
    
    if (geoData.length === 0) {
      throw new Error(`No cities matching "${searchTerm}" found`)
    }
    
    // Fetch weather data for each city found
    const weatherPromises = geoData.map(async (location) => {
      const weatherResponse = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${location.lat}&lon=${location.lon}&units=Metric&appid=${apiKey}`
      )
      
      if (!weatherResponse.ok) {
        console.error(`Failed to fetch weather for ${location.name}`)
        return null
      }
      
      const data = await weatherResponse.json()
      
      return {
        id: data.id,
        name: data.name,
        country: data.sys?.country || location.country || "Unknown",
        coord: data.coord || { lat: location.lat, lon: location.lon },
        temp: Math.round(data.main?.temp || 0),
        main: data.main || {
          temp: 0,
          feels_like: 0,
          temp_min: 0,
          temp_max: 0,
          pressure: 1013,
          humidity: 70,
        },
        weather: data.weather?.[0] || {
          main: "Unknown",
          description: "No data available",
          icon: "50d",
        },
        wind: data.wind || { speed: 0, deg: 0 },
        clouds: data.clouds || { all: 0 },
        visibility: data.visibility || 10000,
        dt: data.dt || Math.floor(Date.now() / 1000),
        sys: data.sys || {
          country: location.country || "Unknown",
          sunrise: Math.floor(Date.now() / 1000) - 21600,
          sunset: Math.floor(Date.now() / 1000) + 21600,
        },
        timezone: data.timezone || 0,
        isFavorite: false,
        rawData: data,
      }
    })
    
    const results = await Promise.all(weatherPromises)
    const validResults = results.filter(result => result !== null)
    
    setSearchResults(validResults)
    
    if (validResults.length === 0) {
      setError(`No weather data available for "${searchTerm}".`)
      setTimeout(() => setError(null), 3000)
    }
    
  } catch (err) {
    console.error("Search error:", err)
    setSearchResults([])
    setError(err.message || `Search for "${searchTerm}" failed.`)
    setTimeout(() => setError(null), 3000)
  }
}

  // Add city to favorites
  const addToFavorites = (city) => {
    // Check if city already exists
    const existingCity = cities.find((c) => c.id === city.id)

    if (existingCity) {
      // Update existing city
      setCities(cities.map((c) => (c.id === city.id ? { ...c, isFavorite: true } : c)))
    } else {
      // Add new city with favorite flag
      setCities([...cities, { ...city, isFavorite: true }])
    }

    setSearchResults([])
    setSearchTerm("")
  }

  // Remove city from list
  const removeCity = (cityId) => {
    setCities(cities.filter((city) => city.id !== cityId))
  }

  // Toggle favorite status
  const toggleFavorite = (cityId) => {
    setCities(cities.map((city) => (city.id === cityId ? { ...city, isFavorite: !city.isFavorite } : city)))
  }

  // Sort cities: favorites first, then alphabetically
  const sortedCities = [...cities].sort((a, b) => {
    if (a.isFavorite && !b.isFavorite) return -1
    if (!a.isFavorite && b.isFavorite) return 1
    return a.name.localeCompare(b.name)
  })

  // Get weather icon URL
  const getWeatherIconUrl = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">

      <ConnectionStatus/>
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-center mb-2">Weather Tracker</h1>
        <p className="text-center text-gray-600 mb-6">Track weather conditions for cities around the world</p>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="Search for a city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <button
            onClick={handleSearch}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 mr-2"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            Search
          </button>
        </div>

        {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

        {searchResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-4 mb-6">
            <h2 className="text-lg font-semibold mb-2">Search Results</h2>
            {searchResults.map((city) => (
              <div
                key={city.id}
                className="flex items-center justify-between p-3 border-b last:border-0 hover:bg-gray-50 cursor-pointer rounded"
                onClick={() => navigate("details", city.id)}
              >
                <div className="flex items-center">
                  <img
                    src={getWeatherIconUrl(city.weather.icon) || "/placeholder.svg"}
                    alt={city.weather.description}
                    className="w-10 h-10 mr-2"
                  />
                  <div>
                    <p className="font-medium">
                      {city.name}, {city.country}
                    </p>
                    <p className="text-sm text-gray-600">
                      {city.temp}°C - {city.weather.description}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 text-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate("details", city.id)
                    }}
                  >
                    View Details
                  </button>
                  <button
                    className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 text-sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      addToFavorites(city)
                    }}
                  >
                    Add to Favorites
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </header>

      <main>
        <h2 className="text-xl font-semibold mb-4">Cities</h2>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, index) => (
              <div key={index} className="bg-white rounded-lg shadow-md p-4">
                <div className="h-6 w-3/4 mb-2 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-4 w-1/2 mb-4 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex justify-between items-center">
                  <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse"></div>
                  <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCities.map((city) => (
              <div
                key={city.id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">{city.name}</h3>
                      <p className="text-gray-600">{city.country}</p>
                    </div>
                    <div className="flex items-center">
                      <img
                        src={getWeatherIconUrl(city.weather.icon) || "/placeholder.svg"}
                        alt={city.weather.description}
                        className="w-10 h-10 mr-1"
                      />
                      <span className="text-2xl font-bold">{city.temp}°C</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 capitalize">{city.weather.description}</p>

                  <div className="flex justify-between items-center mt-4">
                    <button className="text-red-500 hover:text-red-600 p-2" onClick={() => removeCity(city.id)}>
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                    <div className="flex gap-2">
                      <button
                        className="text-yellow-400 hover:text-yellow-500 p-2"
                        onClick={() => toggleFavorite(city.id)}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill={city.isFavorite ? "currentColor" : "none"}
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                          />
                        </svg>
                      </button>
                      <button
                        className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 text-sm"
                        onClick={() => navigate("details", city.id)}
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export default Home

