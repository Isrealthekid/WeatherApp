"use client"

import { useState } from "react"
import Home from "./compontents/Home/Home"
import Details from "./compontents/Details/Details"

// OpenWeatherMap API key
const API_KEY = "c8a5d660a74ae1c83f1ccd3295806f1a"

function App() {
  const [currentPage, setCurrentPage] = useState("home")
  const [selectedCityId, setSelectedCityId] = useState(null)
  const [cities, setCities] = useState([])

  // Navigate to a page
  const navigate = (page, cityId = null) => {
    setCurrentPage(page)
    if (cityId) {
      setSelectedCityId(cityId)
    }
  }

  // Render the current page
  const renderPage = () => {
    switch (currentPage) {
      case "home":
        return <Home cities={cities} setCities={setCities} navigate={navigate} apiKey={API_KEY} />
      case "details":
        return (
          <Details
            cityId={selectedCityId}
            navigate={navigate}
            cities={cities}
            setCities={setCities}
            apiKey={API_KEY}
          />
        )
      default:
        return <Home navigate={navigate} />
    }
  }

  return <div className="bg-gray-50 min-h-screen">{renderPage()}</div>
}

export default App
