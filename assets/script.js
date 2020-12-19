$(document).ready(function() {
	/**
	 * Variable Declaration
	 * todayDate {string} formatted date
	 * next5Dates {array, strings} dates for today + 1 ... 5 days, formatted
	 * apiKey {string} API Key for OpenWeather
	 * cityName {string} defaults to Everett if search val is null/undefined
	 * 		> defaults to last searched city name if local storage is present
	 * queryURL {string} URL for OWM API call
	 */
	var todayDate = dayjs().format("MM/DD/YYYY");
	var next5Dates = [
		dayjs().add(1, 'day').format("MM/DD/YYYY"),
		dayjs().add(2, 'day').format("MM/DD/YYYY"),
		dayjs().add(3, 'day').format("MM/DD/YYYY"),
		dayjs().add(4, 'day').format("MM/DD/YYYY"),
		dayjs().add(5, 'day').format("MM/DD/YYYY")
	];

	var apiKey = "92d3accee7566d3eae267cdb90f96b66";
	var location = "everett";
	var searchList = JSON.parse(localStorage.getItem('weather-search-last')) || ["everett"];
	if(searchList.length > 1) {
		location = searchList[0];
	}
	// adding units=imperial returns temps in Farenheit
	// and wind in MPH, so no conversion math required!
	var queryURL = "https://api.openweathermap.org/data/2.5/weather?appid=" + apiKey + "&units=imperial&q=" + location;

	// add today's date to the page
	$("#todayDate").text(`(${todayDate})`);
	$("#location").text(location);

	function getWeather() {
		$.ajax({
      url: queryURL,
      method: "GET"
    }).then(function(response) {
    	console.log(response);

    	// define variables for data
    	var weatherID = response.weather[0].id;
    	var weatherIcon = null;
    	var tempMax = (response.main.temp_max).toFixed(1);
    	var tempMin = (response.main.temp_min).toFixed(1);
    	var humidity = response.main.humidity + "%";
    	var windSpeed = response.wind.speed + " MPH";
    	var sunrise = dayjs(response.sys.sunrise * 1000).format("h:mm A");
    	var sunset = dayjs(response.sys.sunset * 1000).format("h:mm A");

    	// assign weather icon based on the weatherID
    	if(weatherID == 800) {
    		weatherIcon = "<i class='fad fa-sun has-text-alert fa-2x'></i>";

    	} else if(weatherID == 801) {
    		weatherIcon = "<i class='fad fa-cloud-sun has-text-grey fa-2x'></i>";

    	} else if(weatherID == 802) {
				weatherIcon = "<i class='fad fa-cloud has-text-grey-dark fa-2x'></i>";

    	} else if(weatherID == 803 || weatherID == 804) {
    		weatherIcon = "<i class='fad fa-clouds has-text-grey-darker fa-2x'></i>";

    	} else if(weatherID >= 500 && weatherID <= 504) {
    		weatherIcon = "<i class='fad fa-cloud-showers has-text-info fa-2x'></i>";

    	} else if(weatherID == 511) {
    		weatherIcon = "<i class='fad fa-cloud-sleet has-text-info-dark fa-2x'></i>";

    	} else if(weatherID >= 520 && weatherID <= 531) {
    		weatherIcon = "<i class='fad fa-cloud-sun-rain has-text-info-dark fa-2x'></i>";

    	} else if(weatherID >= 300 && weatherID <= 321) {
    		weatherIcon = "<i class='fad fa-cloud-drizzle has-text-info fa-2x'></i>";

    	} else if(weatherID >= 200 && weatherID <= 232) {
    		weatherIcon = "<i class='fad fa-thunderstorm has-text-black fa-2x'></i>";

    	} else if(weatherID >= 600 && weatherID <= 622) {
    		weatherIcon = "<i class='fad fa-snowflake has-text-info fa-2x'></i>";

    	} else if(weatherID >= 701 && weatherID <= 762) {
    		weatherIcon = "<i class='fad fa-fog has-text-grey fa-2x'></i>";

    	} else if(weatherID == 771) {
    		weatherIcon = "<i class='fad fa-wind has-text-grey fa-2x'></i>";

    	} else if(weatherID == 781) {
    		weatherID = "<i class='fad fa-tornado has-text-danger fa-2x'></i>";

    	} else {
    		weatherIcon = "<i class='fa fa-sun has-text-info fa-2x'></i>";

    	}

    	$("#todayWeather .weather-icon").html(weatherIcon);
    	$("#temp").html(`${tempMax}&deg; F / ${tempMin}&deg; F`);
    	$("#sunrise > p").text(sunrise);
    	$("#sunset > p").text(sunset);

    	// uv index is NOT returned in a weather call,
			// requiring the use of the UVI API
			getUVI(response.coord.lat, response.coord.lon);
    });
	}

	function getUVI(lat, lon) {
		var uviQueryURL = "http://api.openweathermap.org/data/2.5/uvi?lat="+ lat +"&lon="+ lon +"&cnt=1&start="+ todayDate +"&end="+ todayDate +"&appid=" + apiKey;

		$.ajax({
      url: uviQueryURL,
      method: "GET"
    }).then(function(response) {
    	console.log(response);
    	var uvi = $("<p>", {class: "px-4 py-1"});

    	if(response.value >= 0 && response.value <= 2) {
    		uvi.addClass("has-background-success has-text-white");
    		$("#uvi").attr("data-uvi", "low");

    	} else if(response.value >= 3 && response.value <= 5) {
    		uvi.addClass("has-background-warning");
    		$("#uvi").attr("data-uvi", "moderate");

    	} else if(response.value >= 6 && response.value <= 7) {
    		uvi.addClass("has-background-danger has-text-white");
    		$("#uvi").attr("data-uvi", "high");

    	} else {
    		uvi.addClass("has-background-danger-dark has-text-white");
    		$("#uvi").attr("data-uvi", "very high");
    	}

    	uvi.text(response.value);
    	$("#uvi").html(uvi);
    });

	}

	getWeather();
});