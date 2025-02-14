const express = require("express");
const axios = require("axios");
const cors = require("cors");

const fs = require("node:fs");
const path = require("node:path");

const app = express();
const port = 4485;
const corsOptions = {
  origin: "*",
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};
app.use(cors(corsOptions));
app.use((req, res, next) => {
  console.log(
    `${new Date().toISOString()} - ${req.headers["x-forwarded-for"] || req.socket.remoteAddress} - ${req.method} ${
      req.originalUrl
    }`
  );
  next();
});
app.use(express.json());

app.get("/", async (request, response) => {
  try {
    const weather_refresh_token = path.join(__dirname, "data", "weather_refresh_token");

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
      const { data: netatmoAuthResponse } = await axios.post(
        "https://api.netatmo.com/oauth2/token",
        `grant_type=refresh_token&refresh_token=${refreshToken}&client_id=${NETATMO_CLIENT_ID}&client_secret=${NETATMO_CLIENT_SECRET}`
      );

      const { access_token: netatmoAccessToken, refresh_token: netatmoRefreshToken } = netatmoAuthResponse;

      fs.writeFileSync(weather_refresh_token, netatmoRefreshToken);

      const { data: netatmoDataResponse } = await axios.get(
        `https://api.netatmo.com/api/getstationsdata?access_token=${netatmoAccessToken}`
      );

      netatmo = netatmoDataResponse.body.devices;
    }

    const location = encodeURIComponent(TOMORROW_IO_LOCATION);

    const { data: forecast } = await axios.get(
      `https://api.tomorrow.io/v4/weather/forecast?location=${location}&timesteps=1d&units=${TOMORROW_IO_UNIT}&apikey=${TOMORROW_IO_API_KEY}`
    );
    const { data: weather } = await axios.get(
      `https://api.tomorrow.io/v4/weather/realtime?location=${location}&units=${TOMORROW_IO_UNIT}&apikey=${TOMORROW_IO_API_KEY}`
    );

    const data = { netatmo, weather, forecast, weatherCodes, weatherCodesFr };

    return response.send(data);
  } catch (e) {
    console.log(e);
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
  }
});

app.get("/healthcheck", async (request, response) => {
  response.send("OK");
});

app.listen(port, () => console.log(`API listening on port ${port}!`));

const weatherCodes = {
  "0": "Unknown",
  "1000": "Clear, Sunny",
  "1100": "Mostly Clear",
  "1101": "Partly Cloudy",
  "1102": "Mostly Cloudy",
  "1001": "Cloudy",
  "1103": "Partly Cloudy and Mostly Clear",
  "2100": "Light Fog",
  "2101": "Mostly Clear and Light Fog",
  "2102": "Partly Cloudy and Light Fog",
  "2103": "Mostly Cloudy and Light Fog",
  "2106": "Mostly Clear and Fog",
  "2107": "Partly Cloudy and Fog",
  "2108": "Mostly Cloudy and Fog",
  "2000": "Fog",
  "4204": "Partly Cloudy and Drizzle",
  "4203": "Mostly Clear and Drizzle",
  "4205": "Mostly Cloudy and Drizzle",
  "4000": "Drizzle",
  "4200": "Light Rain",
  "4213": "Mostly Clear and Light Rain",
  "4214": "Partly Cloudy and Light Rain",
  "4215": "Mostly Cloudy and Light Rain",
  "4209": "Mostly Clear and Rain",
  "4208": "Partly Cloudy and Rain",
  "4210": "Mostly Cloudy and Rain",
  "4001": "Rain",
  "4211": "Mostly Clear and Heavy Rain",
  "4202": "Partly Cloudy and Heavy Rain",
  "4212": "Mostly Cloudy and Heavy Rain",
  "4201": "Heavy Rain",
  "5115": "Mostly Clear and Flurries",
  "5116": "Partly Cloudy and Flurries",
  "5117": "Mostly Cloudy and Flurries",
  "5001": "Flurries",
  "5100": "Light Snow",
  "5102": "Mostly Clear and Light Snow",
  "5103": "Partly Cloudy and Light Snow",
  "5104": "Mostly Cloudy and Light Snow",
  "5122": "Drizzle and Light Snow",
  "5105": "Mostly Clear and Snow",
  "5106": "Partly Cloudy and Snow",
  "5107": "Mostly Cloudy and Snow",
  "5000": "Snow",
  "5101": "Heavy Snow",
  "5119": "Mostly Clear and Heavy Snow",
  "5120": "Partly Cloudy and Heavy Snow",
  "5121": "Mostly Cloudy and Heavy Snow",
  "5110": "Drizzle and Snow",
  "5108": "Rain and Snow",
  "5114": "Snow and Freezing Rain",
  "5112": "Snow and Ice Pellets",
  "6000": "Freezing Drizzle",
  "6003": "Mostly Clear and Freezing drizzle",
  "6002": "Partly Cloudy and Freezing drizzle",
  "6004": "Mostly Cloudy and Freezing drizzle",
  "6204": "Drizzle and Freezing Drizzle",
  "6206": "Light Rain and Freezing Drizzle",
  "6205": "Mostly Clear and Light Freezing Rain",
  "6203": "Partly Cloudy and Light Freezing Rain",
  "6209": "Mostly Cloudy and Light Freezing Rain",
  "6200": "Light Freezing Rain",
  "6213": "Mostly Clear and Freezing Rain",
  "6214": "Partly Cloudy and Freezing Rain",
  "6215": "Mostly Cloudy and Freezing Rain",
  "6001": "Freezing Rain",
  "6212": "Drizzle and Freezing Rain",
  "6220": "Light Rain and Freezing Rain",
  "6222": "Rain and Freezing Rain",
  "6207": "Mostly Clear and Heavy Freezing Rain",
  "6202": "Partly Cloudy and Heavy Freezing Rain",
  "6208": "Mostly Cloudy and Heavy Freezing Rain",
  "6201": "Heavy Freezing Rain",
  "7110": "Mostly Clear and Light Ice Pellets",
  "7111": "Partly Cloudy and Light Ice Pellets",
  "7112": "Mostly Cloudy and Light Ice Pellets",
  "7102": "Light Ice Pellets",
  "7108": "Mostly Clear and Ice Pellets",
  "7107": "Partly Cloudy and Ice Pellets",
  "7109": "Mostly Cloudy and Ice Pellets",
  "7000": "Ice Pellets",
  "7105": "Drizzle and Ice Pellets",
  "7106": "Freezing Rain and Ice Pellets",
  "7115": "Light Rain and Ice Pellets",
  "7117": "Rain and Ice Pellets",
  "7103": "Freezing Rain and Heavy Ice Pellets",
  "7113": "Mostly Clear and Heavy Ice Pellets",
  "7114": "Partly Cloudy and Heavy Ice Pellets",
  "7116": "Mostly Cloudy and Heavy Ice Pellets",
  "7101": "Heavy Ice Pellets",
  "8001": "Mostly Clear and Thunderstorm",
  "8003": "Partly Cloudy and Thunderstorm",
  "8002": "Mostly Cloudy and Thunderstorm",
  "8000": "Thunderstorm"
};

const weatherCodesFr = {
  "0": "Inconnu",
  "1000": "Clair, Ensoleillé",
  "1100": "Presque Clair",
  "1101": "Partiellement Nuageux",
  "1102": "Presque Nuageux",
  "1001": "Nuageux",
  "1103": "Partiellement Nuageux et Presque Clair",
  "2100": "Brouillard Léger",
  "2101": "Presque Clair et Brouillard Léger",
  "2102": "Partiellement Nuageux et Brouillard Léger",
  "2103": "Presque Nuageux et Brouillard Léger",
  "2106": "Presque Clair et Brouillard",
  "2107": "Partiellement Nuageux et Brouillard",
  "2108": "Presque Nuageux et Brouillard",
  "2000": "Brouillard",
  "4204": "Partiellement Nuageux et Bruine",
  "4203": "Presque Clair et Bruine",
  "4205": "Presque Nuageux et Bruine",
  "4000": "Bruine",
  "4200": "Pluie Légère",
  "4213": "Presque Clair et Pluie Légère",
  "4214": "Partiellement Nuageux et Pluie Légère",
  "4215": "Presque Nuageux et Pluie Légère",
  "4209": "Presque Clair et Pluie",
  "4208": "Partiellement Nuageux et Pluie",
  "4210": "Presque Nuageux et Pluie",
  "4001": "Pluie",
  "4211": "Presque Clair et Pluie Forte",
  "4202": "Partiellement Nuageux et Pluie Forte",
  "4212": "Presque Nuageux et Pluie Forte",
  "4201": "Pluie Forte",
  "5115": "Presque Clair et Averses de Neige",
  "5116": "Partiellement Nuageux et Averses de Neige",
  "5117": "Presque Nuageux et Averses de Neige",
  "5001": "Averses de Neige",
  "5100": "Neige Légère",
  "5102": "Presque Clair et Neige Légère",
  "5103": "Partiellement Nuageux et Neige Légère",
  "5104": "Presque Nuageux et Neige Légère",
  "5122": "Bruine et Neige Légère",
  "5105": "Presque Clair et Neige",
  "5106": "Partiellement Nuageux et Neige",
  "5107": "Presque Nuageux et Neige",
  "5000": "Neige",
  "5101": "Neige Forte",
  "5119": "Presque Clair et Neige Forte",
  "5120": "Partiellement Nuageux et Neige Forte",
  "5121": "Presque Nuageux et Neige Forte",
  "5110": "Bruine et Neige",
  "5108": "Pluie et Neige",
  "5114": "Neige et Pluie Verglaçante",
  "5112": "Neige et Grêlons",
  "6000": "Bruine Verglaçante",
  "6003": "Presque Clair et Bruine Verglaçante",
  "6002": "Partiellement Nuageux et Bruine Verglaçante",
  "6004": "Presque Nuageux et Bruine Verglaçante",
  "6204": "Bruine et Bruine Verglaçante",
  "6206": "Pluie Légère et Bruine Verglaçante",
  "6205": "Presque Clair et Légère Pluie Verglaçante",
  "6203": "Partiellement Nuageux et Légère Pluie Verglaçante",
  "6209": "Presque Nuageux et Légère Pluie Verglaçante",
  "6200": "Légère Pluie Verglaçante",
  "6213": "Presque Clair et Pluie Verglaçante",
  "6214": "Partiellement Nuageux et Pluie Verglaçante",
  "6215": "Presque Nuageux et Pluie Verglaçante",
  "6001": "Pluie Verglaçante",
  "6212": "Bruine et Pluie Verglaçante",
  "6220": "Pluie Légère et Pluie Verglaçante",
  "6222": "Pluie et Pluie Verglaçante",
  "6207": "Presque Clair et Forte Pluie Verglaçante",
  "6202": "Partiellement Nuageux et Forte Pluie Verglaçante",
  "6208": "Presque Nuageux et Forte Pluie Verglaçante",
  "6201": "Forte Pluie Verglaçante",
  "7110": "Presque Clair et Légers Grêlons",
  "7111": "Partiellement Nuageux et Légers Grêlons",
  "7112": "Presque Nuageux et Légers Grêlons",
  "7102": "Légers Grêlons",
  "7108": "Presque Clair et Grêlons",
  "7107": "Partiellement Nuageux et Grêlons",
  "7109": "Presque Nuageux et Grêlons",
  "7000": "Grêlons",
  "7105": "Bruine et Grêlons",
  "7106": "Pluie Verglaçante et Grêlons",
  "7115": "Pluie Légère et Grêlons",
  "7117": "Pluie et Grêlons",
  "7103": "Pluie Verglaçante et Forts Grêlons",
  "7113": "Presque Clair et Forts Grêlons",
  "7114": "Partiellement Nuageux et Forts Grêlons",
  "7116": "Presque Nuageux et Forts Grêlons",
  "7101": "Forts Grêlons",
  "8001": "Presque Clair et Orage",
  "8003": "Partiellement Nuageux et Orage",
  "8002": "Presque Nuageux et Orage",
  "8000": "Orage"
};

const weatherIcons = {
  "1000": "10000_clear_large.png",
  "1001": "10010_cloudy_large.png",
  "1100": "11000_mostly_clear_large.png",
  "1101": "11010_partly_cloudy_large.png",
  "1102": "11020_mostly_cloudy_large.png",
  "1103": "11030_mostly_clear_large.png",
  "2000": "20000_fog_large.png",
  "2100": "21020_fog_light_partly_cloudy_large.png",
  "2101": "21011_fog_light_mostly_clear_large.png",
  "2102": "21021_fog_light_partly_cloudy_large.png",
  "2103": "21031_fog_light_mostly_cloudy_large.png",
  "2106": "21061_fog_mostly_clear_large.png",
  "2107": "21071_fog_partly_cloudy_large.png",
  "2108": "21081_fog_mostly_cloudy_large.png",
  "4000": "40000_drizzle_large.png",
  "4001": "40010_rain_large.png",
  "4200": "42000_rain_light_large.png",
  "4201": "42010_rain_heavy_large.png",
  "4202": "42020_rain_heavy_partly_cloudy_large.png",
  "4203": "42030_drizzle_mostly_clear_large.png",
  "4204": "42040_drizzle_partly_cloudy_large.png",
  "4205": "42050_drizzle_mostly_cloudy_large.png",
  "4208": "42080_rain_partly_cloudy_large.png",
  "4209": "42090_rain_mostly_clear_large.png",
  "4210": "42100_rain_mostly_cloudy_large.png",
  "4211": "42110_rain_heavy_mostly_clear_large.png",
  "4212": "42120_rain_heavy_mostly_cloudy_large.png",
  "4213": "42130_rain_light_mostly_clear_large.png",
  "4214": "42140_rain_light_partly_cloudy_large.png",
  "4215": "42150_rain_light_mostly_cloudy_large.png",
  "5000": "50000_snow_large.png",
  "5001": "50010_flurries_large.png",
  "5100": "51000_snow_light_large.png",
  "5101": "51010_snow_heavy_large.png",
  "5102": "51020_snow_light_mostly_clear_large.png",
  "5103": "51030_snow_light_partly_cloudy_large.png",
  "5104": "51040_snow_light_mostly_cloudy_large.png",
  "5105": "51050_snow_mostly_clear_large.png",
  "5106": "51060_snow_partly_cloudy_large.png",
  "5107": "51070_snow_mostly_cloudy_large.png",
  "5108": "51080_wintry_mix_large.png",
  "5110": "51100_wintry_mix_large.png",
  "5112": "51120_wintry_mix_large.png",
  "5114": "51140_wintry_mix_large.png",
  "5115": "51150_flurries_mostly_clear_large.png",
  "5116": "51160_flurries_partly_cloudy_large.png",
  "5117": "51170_flurries_mostly_cloudy_large.png",
  "5119": "51190_snow_heavy_mostly_clear_large.png",
  "5120": "51200_snow_heavy_partly_cloudy_large.png",
  "5121": "51210_snow_heavy_mostly_cloudy_large.png",
  "5122": "51220_wintry_mix_large.png",
  "6000": "60000_freezing_rain_drizzle_large.png",
  "6001": "60010_freezing_rain_large.png",
  "6002": "60020_freezing_rain_drizzle_partly_cloudy_large.png",
  "6003": "60030_freezing_rain_drizzle_mostly_clear_large.png",
  "6004": "60040_freezing_rain_drizzle_mostly_cloudy_large.png",
  "6200": "62000_freezing_rain_light_large.png",
  "6201": "62010_freezing_rain_heavy_large.png",
  "6202": "62020_freezing_rain_heavy_partly_cloudy_large.png",
  "6203": "62030_freezing_rain_light_partly_cloudy_large.png",
  "6204": "62040_wintry_mix_large.png",
  "6205": "62050_freezing_rain_light_mostly_clear_large.png",
  "6206": "62060_wintry_mix_large.png",
  "6207": "62070_freezing_rain_heavy_mostly_clear_large.png",
  "6208": "62080_freezing_rain_heavy_mostly_cloudy_large.png",
  "6209": "62090_freezing_rain_light_mostly_cloudy_large.png",
  "6212": "62120_wintry_mix_large.png",
  "6213": "62130_freezing_rain_mostly_clear_large.png",
  "6214": "62140_freezing_rain_partly_cloudy_large.png",
  "6215": "62150_freezing_rain_mostly_cloudy_large.png",
  "6220": "62200_wintry_mix_large.png",
  "6222": "62220_wintry_mix_large.png",
  "7000": "70000_ice_pellets_large.png",
  "7101": "71010_ice_pellets_heavy_large.png",
  "7102": "71020_ice_pellets_light_large.png",
  "7103": "71030_wintry_mix_large.png",
  "7105": "71050_wintry_mix_large.png",
  "7106": "71060_wintry_mix_large.png",
  "7107": "71070_ice_pellets_partly_cloudy_large.png",
  "7108": "71080_ice_pellets_mostly_clear_large.png",
  "7109": "71090_ice_pellets_mostly_cloudy_large.png",
  "7110": "71100_ice_pellets_light_mostly_clear_large.png",
  "7111": "71110_ice_pellets_light_partly_cloudy_large.png",
  "7112": "71120_ice_pellets_light_mostly_cloudy_large.png",
  "7113": "71130_ice_pellets_heavy_mostly_clear_large.png",
  "7114": "71140_ice_pellets_heavy_partly_cloudy_large.png",
  "7115": "71150_wintry_mix_large.png",
  "7116": "71160_ice_pellets_heavy_mostly_cloudy_large.png",
  "7117": "71170_wintry_mix_large.png",
  "8000": "80000_tstorm_large.png",
  "8001": "80010_tstorm_mostly_clear_large.png",
  "8002": "80020_tstorm_mostly_cloudy_large.png",
  "8003": "80030_tstorm_partly_cloudy_large.png"
};
