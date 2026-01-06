// ==================== 設定區 ====================
// 請將此 URL 替換為您部署的 GAS Web App URL
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbxaYadZ1TmgcTvF2KeKX3xUTZhXcx4-vnFz3kLTQ4DaJP_DQfdjfQ6ZTcKR_bvzVll1Bg/exec";
const CWB_API_URL = "https://opendata.cwa.gov.tw/api/v1/rest/queryField/Weather";
const CWB_API_KEY = "CWA-1A978612-32DB-496D-B286-CA939138D942";

// 縣市名稱映射（中央氣象署使用的正確名稱）
const cityNameMap = {
    "基隆市": "基隆市",
    "台北市": "臺北市",
    "新北市": "新北市",
    "桃園市": "桃園市",
    "新竹市": "新竹市",
    "新竹縣": "新竹縣",
    "苗栗縣": "苗栗縣",
    "台中市": "臺中市",
    "南投縣": "南投縣",
    "彰化縣": "彰化縣",
    "雲林縣": "雲林縣",
    "嘉義市": "嘉義市",
    "嘉義縣": "嘉義縣",
    "台南市": "臺南市",
    "高雄市": "高雄市",
    "屏東縣": "屏東縣",
    "宜蘭縣": "宜蘭縣",
    "花蓮縣": "花蓮縣",
    "台東縣": "臺東縣",
    "澎湖縣": "澎湖縣",
    "金門縣": "金門縣",
    "連江縣": "連江縣"
};

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
        console.log(`🔍 開始查詢: ${locationName}`);
        
        // 轉換縣市名稱
        const correctName = cityNameMap[locationName] || locationName;
        console.log(`📝 轉換為: ${correctName}`);
        
        const url = `${CWB_API_URL}?locationName=${encodeURIComponent(correctName)}&Authorization=${CWB_API_KEY}`;
        console.log(`📡 API 網址: ${url}`);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error(`❌ HTTP 錯誤: ${response.status}`);
            return null;
        }
        
        const data = await response.json();
        
        console.log(`📦 API 回應:`, data);
        
        if (data.success && data.records && data.records.locations && data.records.locations.length > 0) {
            const location = data.records.locations[0];
            const weatherData = parseWeatherData(location);
            console.log(`✅ 解析成功:`, weatherData);
            return weatherData;
        }
        
        console.warn(`⚠️ 找不到位置: ${correctName}`);
        console.warn(`📋 回應數據:`, data);
        return null;
    } catch (error) {
        console.error(`❌ API 查詢失敗:`, error);
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
    
    console.log(`📊 解析的天氣元素:`, weatherElements);
    
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
