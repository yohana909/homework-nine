import dotenv from 'dotenv';
import express from 'express';
dotenv.config();

// Import the routes
import routes from './routes/index.js';

const app = express();

const PORT = process.env.PORT || 3001;
// server.js
const express = require('express');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Routes
// Serve index.html for all GET requests not matching API routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
// server.js (continued)

// Path to search history file
const historyFilePath = path.join(__dirname, 'searchHistory.json');

// GET /api/weather/history
app.get('/api/weather/history', (req, res) => {
  fs.readFile(historyFilePath, 'utf8', (err, data) => {
    if (err) {
      console.error('Error reading search history:', err);
      return res.status(500).json({ error: 'Failed to read search history.' });
    }
    let history = [];
    try {
      history = JSON.parse(data);
    } catch (parseErr) {
      console.error('Error parsing search history:', parseErr);
      return res.status(500).json({ error: 'Failed to parse search history.' });
    }
    res.json(history);
  });
});
// server.js (continued)

// Replace with your actual OpenWeatherMap API key
const API_KEY = process.env.OPENWEATHER_API_KEY;

// POST /api/weather
app.post('/api/weather', async (req, res) => {
  const { city } = req.body;

  if (!city) {
    return res.status(400).json({ error: 'City name is required.' });
  }

  try {
    // Step 1: Get geographical coordinates for the city
    const geoResponse = await axios.get(
      `https://api.openweathermap.org/geo/1.0/direct`,
      {
        params: {
          q: city,
          limit: 1,
          appid: API_KEY,
        },
      }
    );

    if (geoResponse.data.length === 0) {
      return res.status(404).json({ error: 'City not found.' });
    }

    const { lat, lon, name } = geoResponse.data[0];

    // Step 2: Get weather data using One Call API
    const weatherResponse = await axios.get(
      `https://api.openweathermap.org/data/2.5/onecall`,
      {
        params: {
          lat,
          lon,
          exclude: 'minutely,hourly,alerts',
          units: 'metric', // or 'imperial' based on preference
          appid: API_KEY,
        },
      }
    );

    const weatherData = weatherResponse.data;

    // Step 3: Prepare data to send to client
    const currentWeather = {
      city: name,
      date: new Date(weatherData.current.dt * 1000).toLocaleDateString(),
      icon: `https://openweathermap.org/img/wn/${weatherData.current.weather[0].icon}@2x.png`,
      description: weatherData.current.weather[0].description,
      temperature: weatherData.current.temp,
      humidity: weatherData.current.humidity,
      windSpeed: weatherData.current.wind_speed,
    };

    const forecast = weatherData.daily.slice(1, 6).map((day) => ({
      date: new Date(day.dt * 1000).toLocaleDateString(),
      icon: `https://openweathermap.org/img/wn/${day.weather[0].icon}@2x.png`,
      temperature: day.temp.day,
      windSpeed: day.wind_speed,
      humidity: day.humidity,
    }));

    // Step 4: Save to search history
    const newCity = {
      id: uuidv4(),
      name: name,
    };

    fs.readFile(historyFilePath, 'utf8', (readErr, data) => {
      let history = [];
      if (!readErr) {
        try {
          history = JSON.parse(data);
        } catch (parseErr) {
          console.error('Error parsing search history:', parseErr);
        }
      }
      // Avoid duplicate entries
      if (!history.find((entry) => entry.name.toLowerCase() === name.toLowerCase())) {
        history.push(newCity);
        fs.writeFile(historyFilePath, JSON.stringify(history, null, 2), (writeErr) => {
          if (writeErr) {
            console.error('Error writing to search history:', writeErr);
            return res.status(500).json({ error: 'Failed to save search history.' });
          }
          res.json({ current: currentWeather, forecast, city: newCity });
        });
      } else {
        res.json({ current: currentWeather, forecast, city: history.find((entry) => entry.name.toLowerCase() === name.toLowerCase()) });
      }
    });
  } catch (error) {
    console.error('Error fetching weather data:', error);
    res.status(500).json({ error: 'Failed to fetch weather data.' });
  }
});
require('dotenv').config();
const API_KEY = process.env.OPENWEATHER_API_KEY;

// server.js (continued)

// DELETE /api/weather/history/:id
app.delete('/api/weather/history/:id', (req, res) => {
    const { id } = req.params;
  
    fs.readFile(historyFilePath, 'utf8', (readErr, data) => {
      if (readErr) {
        console.error('Error reading search history:', readErr);
        return res.status(500).json({ error: 'Failed to read search history.' });
      }
  
      let history = [];
      try {
        history = JSON.parse(data);
      } catch (parseErr) {
        console.error('Error parsing search history:', parseErr);
        return res.status(500).json({ error: 'Failed to parse search history.' });
      }
  
      const updatedHistory = history.filter((city) => city.id !== id);
  
      fs.writeFile(historyFilePath, JSON.stringify(updatedHistory, null, 2), (writeErr) => {
        if (writeErr) {
          console.error('Error writing to search history:', writeErr);
          return res.status(500).json({ error: 'Failed to update search history.' });
        }
        res.json({ message: 'City deleted successfully.' });
      });
    });
  });
  
// TODO: Serve static files of entire client dist folder

// TODO: Implement middleware for parsing JSON and urlencoded form data

// TODO: Implement middleware to connect the routes
app.use(routes);

// Start the server on the port
app.listen(PORT, () => console.log(`Listening on PORT: ${PORT}`));
