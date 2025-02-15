const express = require("express");
const axios = require("axios");
const cors = require("cors");

const fs = require("node:fs");
const path = require("node:path");
const { requestLogger } = require("./src/request_logger");
const { en, fr, icons: weatherIcons } = require("./src/dicts");

const tokenFileFolderPath = path.join(__dirname, "data");
const tokenFilePath = path.join(__dirname, "data", "weather_refresh_token");
if (!fs.existsSync(tokenFileFolderPath)) {
  fs.mkdirSync(tokenFileFolderPath);
}
if (!fs.existsSync(tokenFilePath)) {
  fs.writeFileSync(tokenFilePath, "");
}

const app = express();
const port = 4485;
const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));
app.use(requestLogger);
app.use(express.json());

function tomorrowIoErrorHandler(err) {
  if (err.status === 401) {
    return { data: "Tomorrow.io - Not authorized" };
  }
  return { data: "Tomorrow.io - Unknown error" };
}

app.get("/", async (request, response) => {
  if (
    process.env.AUTHENTICATION_TOKEN &&
    request.headers.authorization !== `Bearer ${process.env.AUTHENTICATION_TOKEN}`
  ) {
    return response.sendStatus(401);
  }

  try {
    const weather_refresh_token = tokenFilePath;

    if (request.query["refresh_token"]) {
      fs.writeFileSync(weather_refresh_token, request.query["refresh_token"]);
      response.redirect("/");
      return;
    }

    const {
      NETATMO_CLIENT_ID,
      NETATMO_CLIENT_SECRET,
      TOMORROW_IO_API_KEY,
      TOMORROW_IO_LOCATION,
      TOMORROW_IO_UNIT
    } = process.env;

    const refreshToken = fs.readFileSync(weather_refresh_token);

    let netatmo;
    if (!NETATMO_CLIENT_ID || !NETATMO_CLIENT_SECRET) {
      netatmo = "NOT CONFIGURED - Refer to README.md file to configure the Netatmo API";
    } else if (!refreshToken) {
      netatmo = "NOT AUTHENTICATED - Refer to README.md file to authenticate yourself on the Netatmo API";
    } else {
      const { data: netatmoAuthResponse } = await axios
        .post(
          "https://api.netatmo.com/oauth2/token",
          `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${NETATMO_CLIENT_ID}&client_secret=${NETATMO_CLIENT_SECRET}`
        )
        .catch(() => {
          netatmo =
            "Error during Netatmo API authentication request - Try calling this page with a valid refresh token: '/?refresh_token=Netatmo API refresh token'";
          return { netatmoAuthResponse: "" };
        });

      if (netatmoAuthResponse && netatmoAuthResponse.access_token) {
        const { access_token: netatmoAccessToken, refresh_token: netatmoRefreshToken } = netatmoAuthResponse;

        fs.writeFileSync(weather_refresh_token, netatmoRefreshToken);

        const { data: netatmoDataResponse } = await axios
          .get(`https://api.netatmo.com/api/getstationsdata?access_token=${netatmoAccessToken}`)
          .catch(() => {
            netatmo = "Error during Netatmo API data request";
            return { netatmoDataResponse: "" };
          });

        netatmo = netatmoDataResponse.body.devices;
      }
    }

    const notConfiguredMessage = "NOT CONFIGURED - Refer to README.md file to configure the Tomorrow.io API";
    let weather = notConfiguredMessage,
      forecast = notConfiguredMessage;

    if (TOMORROW_IO_API_KEY && TOMORROW_IO_LOCATION) {
      const location = encodeURIComponent(TOMORROW_IO_LOCATION);
      const unit = TOMORROW_IO_UNIT ? TOMORROW_IO_UNIT : "metric";

      const { data: forecastData } = await axios
        .get(
          `https://api.tomorrow.io/v4/weather/forecast?location=${location}&timesteps=1d&units=${unit}&apikey=${TOMORROW_IO_API_KEY}`
        )
        .catch(tomorrowIoErrorHandler);
      const { data: weatherData } = await axios
        .get(
          `https://api.tomorrow.io/v4/weather/realtime?location=${location}&units=${unit}&apikey=${TOMORROW_IO_API_KEY}`
        )
        .catch(tomorrowIoErrorHandler);
      weather = weatherData;
      forecast = forecastData;
    }

    const weatherCodes = { en, fr };

    const data = { netatmo, weather, forecast, weatherCodes };

    return response.send(data);
  } catch (e) {
    console.log(e);
    return response.sendStatus(500);
  }
});

app.get("/icon/:code", async (request, response) => {
  try {
    if (
      !weatherIcons[request.params.code] ||
      !fs.existsSync(path.join(__dirname, "weather_icons", weatherIcons[request.params.code]))
    ) {
      return response.sendStatus(404);
    }
    return response.sendFile(path.join(__dirname, "weather_icons", weatherIcons[request.params.code]));
  } catch (e) {
    console.log(e);
    return response.sendStatus(500);
  }
});

app.get("/healthcheck", async (request, response) => {
  response.send("OK");
});

app.listen(port, () => console.log(`API listening on port ${port}!`));
