"use client"

import { useState, useEffect, useRef, useCallback } from "react"

function CityDetails({ cityId, navigate, cities, setCities, apiKey }) {
  const [city, setCity] = useState(null)
  const [weatherData, setWeatherData] = useState(null)
  const [note, setNote] = useState("")
  const [isEditingNote, setIsEditingNote] = useState(false)
  const [hasNote, setHasNote] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [lastUpdated, setLastUpdated] = useState(null)
  const [nextUpdateIn, setNextUpdateIn] = useState(180) // 3 minutes in seconds
  const refreshTimerRef = useRef(null)
  const countdownTimerRef = useRef(null)
  const [isFetching, setIsFetching] = useState(false)

  // Function to fetch weather data
  // Modify the fetchWeatherData function:

  const fetchWeatherData = useCallback(async () => {
    if (isFetching) return

    try {
      setIsFetching(true)

      // Check if cityId is valid
      if (!cityId) {
        throw new Error("Invalid city ID")
      }

      // First try to fetch by ID if available
      let url = `https://api.openweathermap.org/data/2.5/weather?id=${cityId}&units=Metric&appid=${apiKey}`

      // If cityId is not a number (might be a string from search), try to fetch by name
      if (isNaN(Number.parseInt(cityId))) {
        const foundCity = cities.find((c) => c.id && c.id.toString() === cityId.toString())
        if (foundCity && foundCity.name) {
          url = `https://api.openweathermap.org/data/2.5/weather?q=${foundCity.name}&units=Metric&appid=${apiKey}`
        }
      }

      const response = await fetch(url)

      if (!response.ok) {
        throw new Error("Failed to fetch weather data")
      }

      const data = await response.json()
      console.log("API Response for city details:", data)

      // Store the complete API response
      setWeatherData(data)
      setLastUpdated(new Date().toLocaleTimeString())
      setNextUpdateIn(180) // Reset countdown to 3 minutes

      // Update city with latest data
      const updatedCity = {
        ...city,
        id: data.id,
        name: data.name,
        country: data.sys?.country || "Unknown",
        coord: data.coord || { lat: 0, lon: 0 },
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
          country: "Unknown",
          sunrise: Math.floor(Date.now() / 1000) - 21600,
          sunset: Math.floor(Date.now() / 1000) + 21600,
        },
        timezone: data.timezone || 0,
        rawData: data,
      }

      setCity(updatedCity)

      // Update the city in the cities array if it exists
      if (cities && Array.isArray(cities)) {
        const cityExists = cities.some((c) => c.id && data.id && c.id.toString() === data.id.toString())

        if (cityExists) {
          // Update existing city
          const updatedCities = cities.map((c) =>
            c.id && data.id && c.id.toString() === data.id.toString() ? updatedCity : c,
          )
          setCities(updatedCities)
          localStorage.setItem("cities", JSON.stringify(updatedCities))
        } else {
          // Add as a new city if it doesn't exist
          const newCities = [...cities, updatedCity]
          setCities(newCities)
          localStorage.setItem("cities", JSON.stringify(newCities))
        }
      }
    } catch (err) {
      console.error("Error fetching fresh weather data:", err)
      // If we can't get fresh data, use the stored data
      if (!weatherData && city?.rawData) {
        setWeatherData(city.rawData)
        setLastUpdated("Using cached data")
      } else if (city) {
        // Create a fallback weather data object from the city data
        setWeatherData({
          id: city.id,
          name: city.name,
          main: city.main || {
            temp: city.temp || 0,
            feels_like: (city.temp || 0) - 2,
            temp_min: (city.temp || 0) - 3,
            temp_max: (city.temp || 0) + 3,
            pressure: 1013,
            humidity: 70,
          },
          weather: [
            city.weather || {
              main: "Unknown",
              description: "Data unavailable",
              icon: "50d",
            },
          ],
          wind: city.wind || { speed: 5, deg: 180 },
          clouds: city.clouds || { all: 40 },
          visibility: city.visibility || 10000,
          sys: city.sys || {
            country: city.country || "Unknown",
            sunrise: Math.floor(Date.now() / 1000) - 21600,
            sunset: Math.floor(Date.now() / 1000) + 21600,
          },
          coord: city.coord || { lat: 0, lon: 0 },
          timezone: city.timezone || 0,
        })
        setLastUpdated("Using cached data")
      }
    } finally {
      setIsFetching(false)
    }
  }, [cityId, apiKey, cities, city, isFetching, setCities, weatherData])

  // Initial data load
  // Fix the main useEffect to properly use the memoized fetchWeatherData function
  // Update the loadCityData function inside useEffect:

  useEffect(() => {
    let isMounted = true

    const loadCityData = async () => {
      if (!isMounted) return

      setIsLoading(true)
      setError(null)

      try {
        // Check if cityId is valid
        if (!cityId) {
          throw new Error("Invalid city ID")
        }

        // Check if cities array is valid
        if (!cities || !Array.isArray(cities)) {
          throw new Error("Cities data is not available")
        }

        // Find city in the cities array
        const foundCity = cities.find((c) => c.id && cityId && c.id.toString() === cityId.toString())

        if (foundCity) {
          setCity(foundCity)

          // Load notes for this city
          const savedNotes = localStorage.getItem(`note-${cityId}`)
          if (savedNotes) {
            setNote(savedNotes)
            setHasNote(true)
          }

          // Fetch fresh weather data after setting the city
          setTimeout(() => {
            if (isMounted) fetchWeatherData()
          }, 100)
        } else {
          // City not found in cities array, try to fetch it directly
          try {
            const response = await fetch(
              `https://api.openweathermap.org/data/2.5/weather?id=${cityId}&units=Metric&appid=${apiKey}`,
            )

            if (!response.ok) {
              throw new Error("City not found")
            }

            const data = await response.json()

            // Create a city object from the API response
            const newCity = {
              id: data.id,
              name: data.name,
              country: data.sys?.country || "Unknown",
              coord: data.coord || { lat: 0, lon: 0 },
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
                country: "Unknown",
                sunrise: Math.floor(Date.now() / 1000) - 21600,
                sunset: Math.floor(Date.now() / 1000) + 21600,
              },
              timezone: data.timezone || 0,
              isFavorite: false,
              rawData: data,
            }

            if (isMounted) {
              setCity(newCity)
              setWeatherData(data)
              setLastUpdated(new Date().toLocaleTimeString())

              // Add this city to the cities array
              const updatedCities = [...cities, newCity]
              setCities(updatedCities)
              localStorage.setItem("cities", JSON.stringify(updatedCities))

              // Load notes for this city
              const savedNotes = localStorage.getItem(`note-${cityId}`)
              if (savedNotes) {
                setNote(savedNotes)
                setHasNote(true)
              }
            }
          } catch (err) {
            if (isMounted) {
              console.error("Error fetching city:", err)
              setError("City not found. Please return to the home page and try again.")
              // Redirect to home after 3 seconds
              setTimeout(() => navigate("home"), 3000)
            }
          }
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error loading city data:", err)
          setError("Failed to load city data. Please try again later.")
          // Redirect to home after 3 seconds
          setTimeout(() => navigate("home"), 3000)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadCityData()

    // Set up refresh timer (every 3 minutes)
    refreshTimerRef.current = setInterval(
      () => {
        if (isMounted) fetchWeatherData()
      },
      3 * 60 * 1000,
    ) // 3 minutes in milliseconds

    // Set up countdown timer (updates every second)
    countdownTimerRef.current = setInterval(() => {
      if (isMounted) {
        setNextUpdateIn((prev) => (prev > 0 ? prev - 1 : 0))
      }
    }, 1000)

    // Clean up timers on unmount
    return () => {
      isMounted = false
      if (refreshTimerRef.current) clearInterval(refreshTimerRef.current)
      if (countdownTimerRef.current) clearInterval(countdownTimerRef.current)
    }
  }, [cityId, navigate, cities, apiKey, fetchWeatherData])

  // Format the countdown time
  const formatCountdown = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`
  }

  const saveNote = () => {
    if (note.trim()) {
      localStorage.setItem(`note-${cityId}`, note)
      setIsEditingNote(false)
      setHasNote(true)
    }
  }

  const deleteNote = () => {
    localStorage.removeItem(`note-${cityId}`)
    setNote("")
    setHasNote(false)
    setIsEditingNote(false)
  }

  const toggleFavorite = () => {
    if (!city) return

    // Update city in the cities array
    const updatedCities = cities.map((c) => {
      if (c.id && city.id && c.id.toString() === city.id.toString()) {
        return { ...c, isFavorite: !c.isFavorite }
      }
      return c
    })

    setCities(updatedCities)
    localStorage.setItem("cities", JSON.stringify(updatedCities))
    setCity({ ...city, isFavorite: !city.isFavorite })
  }

  // Manual refresh button handler
  const handleManualRefresh = () => {
    fetchWeatherData()
  }

  // Get weather icon URL
  const getWeatherIconUrl = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@4x.png`
  }

  // Get wind direction from degrees
  const getWindDirection = (degrees) => {
    if (degrees === undefined) return "N/A"
    const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
    const index = Math.round(degrees / 45) % 8
    return directions[index]
  }

  // Format timestamp to local time
  const formatTime = useCallback((timestamp, timezone) => {
    if (!timestamp) return "N/A"

    try {
      // Convert to milliseconds and adjust for timezone
      const date = new Date((timestamp + (timezone || 0)) * 1000)
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    } catch (err) {
      console.error("Error formatting time:", err)
      return "N/A"
    }
  }, [])

  // Safe access to nested properties
  const safeGet = useCallback((obj, path, fallback) => {
    try {
      if (!obj) return fallback

      const keys = path.split(".")
      let result = obj

      for (const key of keys) {
        if (result === undefined || result === null) return fallback

        // Handle array access with [index] notation
        if (key.includes("[") && key.includes("]")) {
          const arrayName = key.substring(0, key.indexOf("["))
          const index = Number.parseInt(key.substring(key.indexOf("[") + 1, key.indexOf("]")))

          if (!result[arrayName] || !Array.isArray(result[arrayName]) || !result[arrayName][index]) {
            return fallback
          }

          result = result[arrayName][index]
        } else {
          result = result[key]
        }
      }

      return result !== undefined && result !== null ? result : fallback
    } catch (err) {
      console.error("Error in safeGet:", err)
      return fallback
    }
  }, [])

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button onClick={() => navigate("home")} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Cities
        </button>

        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 mb-6">
          <div className="h-10 w-1/3 bg-white/20 rounded animate-pulse"></div>
          <div className="h-6 w-1/4 mt-2 bg-white/20 rounded animate-pulse"></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {[...Array(2)].map((_, index) => (
            <div key={index} className="bg-white rounded-lg shadow-md p-6">
              <div className="h-6 w-1/2 mb-4 bg-gray-200 rounded animate-pulse"></div>
              <div className="grid grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center">
                    <div className="h-8 w-8 rounded-full bg-gray-200 animate-pulse mr-2"></div>
                    <div>
                      <div className="h-4 w-20 mb-1 bg-gray-200 rounded animate-pulse"></div>
                      <div className="h-4 w-12 bg-gray-200 rounded animate-pulse"></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <button onClick={() => navigate("home")} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4 mr-2"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          Back to Cities
        </button>
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">{error}</div>
      </div>
    )
  }

  if (!city || !weatherData) {
    return (
      <div className="container mx-auto px-4 py-8 flex justify-center items-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p>Loading city data...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <button onClick={() => navigate("home")} className="flex items-center text-gray-600 hover:text-gray-900 mb-6">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Back to Cities
      </button>

      <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg p-6 mb-6">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <div>
              <h1 className="text-3xl font-bold">{city.name}</h1>
              <p className="text-xl">{safeGet(weatherData, "sys.country", "Unknown")}</p>
              {/* <div className="text-sm mt-1 flex items-center justify-between">
                <span className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Last updated: {lastUpdated}
                </span>
                <span className="ml-4 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Next update in: {formatCountdown(nextUpdateIn)}
                </span>
                <button
                  onClick={handleManualRefresh}
                  className="ml-2 text-xs bg-white/20 hover:bg-white/30 rounded px-2 py-1 flex items-center"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-3 w-3 mr-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Refresh Now
                </button>
              </div> */}
            </div>
            <button onClick={toggleFavorite} className="ml-2 text-yellow-400 hover:text-yellow-500 p-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-6 w-6"
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
          </div>
          <div className="flex items-center">
            <img
              src={getWeatherIconUrl(safeGet(weatherData, "weather[0].icon", "50d")) || "/placeholder.svg"}
              alt={safeGet(weatherData, "weather[0].description", "Weather")}
              className="w-20 h-20"
            />
            <div className="text-center ml-2">
              <div className="text-5xl font-bold">{Math.round(safeGet(weatherData, "main.temp", 0))}°C</div>
              <p className="text-lg capitalize">{safeGet(weatherData, "weather[0].description", "No data")}</p>
            </div>
          </div>
        </div>
        <div className="mt-4 text-sm">
          <p>
            <span className="inline-flex items-center mr-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              Feels like: {Math.round(safeGet(weatherData, "main.feels_like", 0))}°C
            </span>
            <span className="inline-flex items-center mr-4">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              Wind: {safeGet(weatherData, "wind.speed", 0)} m/s
            </span>
            <span className="inline-flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3 w-3 mr-1"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              Humidity: {safeGet(weatherData, "main.humidity", 0)}%
            </span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
                />
              </svg>
              Current Conditions
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Feels Like</p>
                  <p className="font-medium">{Math.round(safeGet(weatherData, "main.feels_like", 0))}°C</p>
                </div>
              </div>
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Humidity</p>
                  <p className="font-medium">{safeGet(weatherData, "main.humidity", 0)}%</p>
                </div>
              </div>
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Wind</p>
                  <p className="font-medium">{safeGet(weatherData, "wind.speed", 0)} m/s</p>
                </div>
              </div>
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Direction</p>
                  <p className="font-medium">{getWindDirection(safeGet(weatherData, "wind.deg", undefined))}</p>
                </div>
              </div>
              <div className="flex items-center">
                <div className="mr-2 h-4 w-4 flex items-center justify-center text-blue-500">
                  <span className="text-xs">hPa</span>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Pressure</p>
                  <p className="font-medium">{safeGet(weatherData, "main.pressure", 1013)} hPa</p>
                </div>
              </div>
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2 text-blue-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Visibility</p>
                  <p className="font-medium">{(safeGet(weatherData, "visibility", 10000) / 1000).toFixed(1)} km</p>
                </div>
              </div>
              {safeGet(weatherData, "main.sea_level", null) !== null && (
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 flex items-center justify-center text-blue-500">
                    <span className="text-xs">SEA</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Sea Level</p>
                    <p className="font-medium">{safeGet(weatherData, "main.sea_level", "N/A")} hPa</p>
                  </div>
                </div>
              )}
              {safeGet(weatherData, "main.grnd_level", null) !== null && (
                <div className="flex items-center">
                  <div className="mr-2 h-4 w-4 flex items-center justify-center text-blue-500">
                    <span className="text-xs">GND</span>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Ground Level</p>
                    <p className="font-medium">{safeGet(weatherData, "main.grnd_level", "N/A")} hPa</p>
                  </div>
                </div>
              )}
              {safeGet(weatherData, "wind.gust", null) !== null && (
                <div className="flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 mr-2 text-blue-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-500">Wind Gust</p>
                    <p className="font-medium">{safeGet(weatherData, "wind.gust", "N/A")} m/s</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4 flex items-center">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              Daily Information
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Min Temperature</p>
                <p className="font-medium">{Math.round(safeGet(weatherData, "main.temp_min", 0))}°C</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Max Temperature</p>
                <p className="font-medium">{Math.round(safeGet(weatherData, "main.temp_max", 0))}°C</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Cloudiness</p>
                <p className="font-medium">{safeGet(weatherData, "clouds.all", 0)}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Weather</p>
                <p className="font-medium capitalize">{safeGet(weatherData, "weather[0].main", "Unknown")}</p>
              </div>
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2 text-orange-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Sunrise</p>
                  <p className="font-medium">
                    {formatTime(safeGet(weatherData, "sys.sunrise", null), safeGet(weatherData, "timezone", 0))}
                  </p>
                </div>
              </div>
              <div className="flex items-center">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-4 w-4 mr-2 text-red-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm text-gray-500">Sunset</p>
                  <p className="font-medium">
                    {formatTime(safeGet(weatherData, "sys.sunset", null), safeGet(weatherData, "timezone", 0))}
                  </p>
                </div>
              </div>
              <div>
                <p className="text-sm text-gray-500">Coordinates</p>
                <p className="font-medium">
                  {safeGet(weatherData, "coord.lat", 0).toFixed(2)}, {safeGet(weatherData, "coord.lon", 0).toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Local Time</p>
                <p className="font-medium">
                  {new Date((Date.now() / 1000 + safeGet(weatherData, "timezone", 0)) * 1000).toLocaleTimeString()}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Personal Notes</h2>
          <div className="flex gap-2">
            {hasNote && !isEditingNote && (
              <>
                <button
                  className="flex items-center px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100 text-sm"
                  onClick={() => setIsEditingNote(true)}
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
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </button>
                <button
                  className="flex items-center px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 text-sm"
                  onClick={deleteNote}
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
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete
                </button>
              </>
            )}
            {isEditingNote && (
              <button
                className="flex items-center px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 text-sm"
                onClick={saveNote}
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
                    d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"
                  />
                </svg>
                Save
              </button>
            )}
          </div>
        </div>

        {isEditingNote ? (
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Write your notes about this city here..."
            className="w-full min-h-[150px] p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        ) : (
          <div>
            {hasNote ? (
              <div className="bg-gray-50 p-4 rounded-md whitespace-pre-wrap">{note}</div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-500 mb-4">Click to add a note</p>
                <button
                  className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                  onClick={() => setIsEditingNote(true)}
                >
                  Add a Note
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default CityDetails
