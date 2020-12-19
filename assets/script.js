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
	var queryURL = "https://api.openweathermap.org/data/2.5/weather?appid=" + apiKey + "&q=" + location;

	function getWeather() {
		$.ajax({
      url: queryURL,
      method: "GET"
    }).then(function(response) {
    	console.log(response);

    });
	}
	getWeather();
});