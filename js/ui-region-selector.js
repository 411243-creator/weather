// ==================== 區域與縣市映射 ====================
const regionCityMap = {
    "北部": ["基隆市", "台北市", "新北市", "桃園市", "新竹市", "新竹縣"],
    "中部": ["苗栗縣", "台中市", "南投縣"],
    "南部": ["彰化縣", "雲林縣", "嘉義市", "嘉義縣", "台南市", "高雄市", "屏東縣"],
    "東部": ["宜蘭縣", "花蓮縣", "台東縣"],
    "外島": ["澎湖縣", "金門縣", "連江縣"]
};

let selectedRegion = null;
let selectedCity = null;

// ==================== 初始化 ====================
document.addEventListener("DOMContentLoaded", function() {
    initRegionButtons();
    initCityButtons();
    initSearchButton();
});

// ==================== 區域按鈕初始化 ====================
function initRegionButtons() {
    const regionBtns = document.querySelectorAll(".region-btn");
    
    regionBtns.forEach(btn => {
        btn.addEventListener("click", function() {
            // 移除之前選擇的按鈕樣式
            regionBtns.forEach(b => b.classList.remove("active"));
            
            // 新增目前選擇的按鈕樣式
            this.classList.add("active");
            
            selectedRegion = this.dataset.region;
            selectedCity = null; // 重設縣市選擇
            
            // 顯示縣市選擇容器並更新縣市按鈕
            updateCityButtons(selectedRegion);
            document.getElementById("citySelectorContainer").classList.add("show");
            
            // 更新搜尋按鈕狀態
            updateSearchButtonState();
        });
    });
}

// ==================== 縣市按鈕更新 ====================
function updateCityButtons(region) {
    const citiesInRegion = regionCityMap[region] || [];
    const cityButtonsContainer = document.getElementById("cityButtonsContainer");
    
    // 清空舊按鈕
    cityButtonsContainer.innerHTML = "";
    
    // 創建新按鈕
    citiesInRegion.forEach(city => {
        const btn = document.createElement("button");
        btn.className = "city-btn";
        btn.textContent = city;
        btn.dataset.city = city;
        
        btn.addEventListener("click", function() {
            // 移除之前選擇的樣式
            document.querySelectorAll(".city-btn").forEach(b => {
                b.classList.remove("selected");
            });
            
            // 新增目前選擇的樣式
            this.classList.add("selected");
            selectedCity = city;
            
            // 更新搜尋按鈕狀態
            updateSearchButtonState();
        });
        
        cityButtonsContainer.appendChild(btn);
    });
}

// ==================== 初始化縣市按鈕 ====================
function initCityButtons() {
    // 縣市按鈕由 updateCityButtons 動態生成
}

// ==================== 搜尋按鈕初始化 ====================
function initSearchButton() {
    const searchBtn = document.getElementById("searchBtn");
    
    searchBtn.addEventListener("click", async function() {
        if (!selectedCity) {
            alert("請先選擇縣市");
            return;
        }
        
        searchBtn.disabled = true;
        searchBtn.textContent = "查詢中...";
        
        try {
            // 呼叫後端 API 查詢天氣
            const weatherData = await fetchWeatherFromCWB(selectedCity);
            
            if (weatherData) {
                // 顯示天氣資訊和卡片
                displayWeatherUI(selectedCity, weatherData);
                
                // 儲存查詢紀錄
                const userId = getUserId();
                saveUserCity(userId, selectedCity);
            } else {
                alert(`找不到【${selectedCity}】的天氣資訊`);
            }
        } catch (error) {
            console.error("查詢天氣時出錯:", error);
            alert("查詢失敗，請稍後再試");
        } finally {
            searchBtn.disabled = false;
            searchBtn.textContent = "查詢天氣";
        }
    });
}

// ==================== 更新搜尋按鈕狀態 ====================
function updateSearchButtonState() {
    const searchBtn = document.getElementById("searchBtn");
    searchBtn.disabled = !selectedCity;
}

// ==================== UI 顯示天氣資訊（卡片格式） ====================
function displayWeatherUI(locationName, weatherData) {
    const weatherDisplay = document.getElementById("weatherDisplay");
    const weatherLocation = document.getElementById("weatherLocation");
    const weatherCardsContainer = document.getElementById("weatherCardsContainer");
    
    console.log(`🎨 準備顯示天氣UI:`, { locationName, weatherData });
    
    if (!weatherData) {
        console.warn(`⚠️ 無天氣資料`);
        weatherLocation.textContent = `${locationName} - 無資料`;
        weatherCardsContainer.innerHTML = `<p style="grid-column: 1/-1; color: #d32f2f;">無法取得天氣資訊</p>`;
        weatherDisplay.classList.add("show");
        return;
    }
    
    const updateTime = new Date(weatherData.updateTime).toLocaleString('zh-TW');
    
    const cardsHTML = `
        <div class="weather-card orange-top">
            <div class="card-label">現在溫度</div>
            <div class="card-value">${weatherData.currentTemp}°C</div>
            <div class="card-desc">戶外量測</div>
        </div>
        
        <div class="weather-card orange-top">
            <div class="card-label">體感溫度</div>
            <div class="card-value">${weatherData.feelsLikeTemp}°C</div>
            <div class="card-desc">感受溫度</div>
        </div>
        
        <div class="weather-card gray-top">
            <div class="card-label">相對濕度</div>
            <div class="card-value">${weatherData.humidity}%</div>
            <div class="card-desc">空氣濕度</div>
        </div>
        
        <div class="weather-card blue-top">
            <div class="card-label">累積雨量</div>
            <div class="card-value">${weatherData.rainfall} mm</div>
            <div class="card-desc">今日降雨</div>
        </div>
        
        <div class="weather-card yellow-top">
            <div class="card-label">風速</div>
            <div class="card-value">${weatherData.windSpeed} m/s</div>
            <div class="card-desc">${weatherData.windDirection}</div>
        </div>
        
        <div class="weather-card gray-top">
            <div class="card-label">氣壓</div>
            <div class="card-value">${weatherData.pressure} hPa</div>
            <div class="card-desc">海平面氣壓</div>
        </div>
        
        <div class="weather-update-time" style="grid-column: 1/-1;">更新時間: ${updateTime}</div>
    `;
    
    weatherLocation.textContent = `${locationName} 的天氣`;
    weatherCardsContainer.innerHTML = cardsHTML;
    weatherDisplay.classList.add("show");
    
    console.log(`✅ UI 顯示完成`);
}
