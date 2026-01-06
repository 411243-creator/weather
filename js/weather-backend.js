// ==================== 設定區 ====================
// 請將此 URL 替換為您部署的 GAS Web App URL
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxaYadZ1TmgcTvF2KeKX3xUTZhXcx4-vnFz3kLTQ4DaJP_DQfdjfQ6ZTcKR_bvzVll1Bg/exec";
const CWB_API_URL = "https://opendata.cwa.gov.tw/api/v1/rest/queryField/Weather";
const CWB_API_KEY = "CWA-1A978612-32DB-496D-B286-CA939138D942";

// ==================== 1. UUID 管理 ====================
function getUserId() {
    let id = localStorage.getItem("weatherApp_uid");
    if (!id) {
        id = 'user_' + generateShortUUID();
        localStorage.setItem("weatherApp_uid", id);
    }
    return id;
}

function generateShortUUID() {
    return Math.random().toString(36).substr(2, 9) + 
           Date.now().toString(36).substr(2, 5);
}

// ==================== 2. 後端 API 呼叫 ====================
async function fetchLastCity(userId) {
    try {
        const response = await fetch(
            `${GAS_API_URL}?action=get&userId=${encodeURIComponent(userId)}`
        );
        const data = await response.json();
        
        if (data.status === "success") {
            return data.lastCity;
        }
        return null;
    } catch (error) {
        console.error("無法從後端取得資料:", error);
        return null;
    }
}

async function saveUserCity(userId, cityName) {
    try {
        await fetch(GAS_API_URL, {
            method: "POST",
            mode: "no-cors",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `action=set&userId=${encodeURIComponent(userId)}&city=${encodeURIComponent(cityName)}`
        });
        console.log(`已儲存查詢紀錄: ${cityName}`);
    } catch (error) {
        console.error("無法儲存資料到後端:", error);
    }
}

// ==================== 3. 中央氣象署天氣查詢 ====================
async function fetchWeatherFromCWB(locationName) {
    try {
        const url = `${CWB_API_URL}?locationName=${encodeURIComponent(locationName)}&Authorization=${CWB_API_KEY}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.success && data.records && data.records.locations.length > 0) {
            const location = data.records.locations[0];
            return parseWeatherData(location);
        }
        return null;
    } catch (error) {
        console.error("無法從中央氣象署取得天氣資料:", error);
        return null;
    }
}

// ==================== 3.5 解析天氣資料 ====================
function parseWeatherData(location) {
    const weatherElements = {};
    
    if (location.weatherElement && Array.isArray(location.weatherElement)) {
        location.weatherElement.forEach(element => {
            const name = element.elementName;
            const value = element.elementValue && element.elementValue.length > 0 
                ? element.elementValue[0].value 
                : "N/A";
            weatherElements[name] = value;
        });
    }
    
    return {
        locationName: location.locationName,
        updateTime: location.time.obsTime || new Date().toISOString(),
        currentTemp: weatherElements["T"] || "N/A",
        feelsLikeTemp: weatherElements["AT"] || "N/A",
        dewPoint: weatherElements["Td"] || "N/A",
        rainfall: weatherElements["Precp"] || "0.0",
        humidity: weatherElements["RH"] || "N/A",
        windSpeed: weatherElements["WS"] || "N/A",
        windDirection: weatherElements["WD"] || "N/A",
        pressure: weatherElements["P"] || "N/A",
        visibility: weatherElements["VV"] || "N/A",
        sunrise: weatherElements["Sunrise"] || "N/A",
        sunset: weatherElements["Sunset"] || "N/A",
        rawData: location
    };
}

// ==================== 4. 顯示天氣資訊 ====================
function displayWeather(weatherData, locationName) {
    if (!weatherData) {
        alert(`找不到【${locationName}】的天氣資訊`);
        return;
    }
    
    console.log(`${locationName} 的天氣資訊:`, weatherData);
    displayWeatherUI(locationName, weatherData);
}

// ==================== 5. 初始化：頁面載入時檢查舊城市 ====================
document.addEventListener("DOMContentLoaded", async function() {
    const userId = getUserId();
    const hasAsked = sessionStorage.getItem("weatherApp_hasAsked");
    
    if (!hasAsked) {
        const lastCity = await fetchLastCity(userId);
        
        if (lastCity) {
            const shouldLoadLast = confirm(
                `您上次查詢的是【${lastCity}】，是否再次查詢該縣市？`
            );
            
            if (shouldLoadLast) {
                const weatherData = await fetchWeatherFromCWB(lastCity);
                displayWeather(weatherData, lastCity);
            }
        }
        
        sessionStorage.setItem("weatherApp_hasAsked", "true");
    }
});

// ==================== 6. 當使用者查詢天氣時調用 ====================
async function onUserSearchCity(cityName) {
    if (!cityName || cityName.trim() === "") {
        alert("請輸入縣市名稱");
        return;
    }
    
    // 1. 從中央氣象署取得天氣資料
    const weatherData = await fetchWeatherFromCWB(cityName);
    displayWeather(weatherData, cityName);
    
    // 2. 在背景儲存查詢紀錄到 GAS
    const userId = getUserId();
    saveUserCity(userId, cityName);
}
