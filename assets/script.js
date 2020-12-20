$(document).ready(function() {
	/**
	 * VARIABLES
	 * apiKey {string} API Key for OpenWeather
	 * 
	 * todayDate {string} formatted date
	 * next5Dates {array, strings} dates for today + 1 ... 5 days, formatted
	 * cityName {string} defaults to Everett if search val is null/undefined
	 * 		> defaults to last searched city name if local storage is present
	 * queryURL {string} URL for OWM API call
	 */
	var apiKey = "92d3accee7566d3eae267cdb90f96b66";

	var todayDate = dayjs().format("MM/DD/YYYY");

	var startLocation = "everett";
	var previouslySearched = JSON.parse(localStorage.getItem('weather-search-last')) || [startLocation, "San Francisco"];
	if(previouslySearched.length > 1) {
		startLocation = previouslySearched[0];
	}

	// adding units=imperial returns temps in Farenheit
	// and wind in MPH, so no conversion math required!
	var queryURL = "https://api.openweathermap.org/data/2.5/";

	// add today's date to the page
	$("#todayDate").text(`(${todayDate})`);
	$("#location").text(startLocation);
	
	$(".location-prev:first").text(startLocation).parents("a.panel-block").attr("data-location", startLocation);

	// loop through the previouslySearched array
	// starting from index 1 since 0 is in the first
	// ".location-prev" block and create new blocks
	// for each of the previously searched locations
	for(var i = 1; i < previouslySearched.length; i++) {
		// clone the first block so we don't have to rebuild
		// all the HTML
		var original = $("#previouslySearched a:first-child");
		// this is a "deep clone", otherwise the 
		// icon in the a.panel-block won't copy
		// having 'true' in .clone() ensures that bound event handlers
		// also copy over, so clicking on the new block will work
		var newBlock = original.clone(true).data("arr", $.extend([], original.data("arr")));
		// remove the active class, and set the text 
		// and data-location to this location
		newBlock.removeClass("is-active").attr("data-location", previouslySearched[i]);
		newBlock.children(".location-prev").text(previouslySearched[i]);
		// append the newly cloned element
		$("#previouslySearched").append(newBlock);
	}

	// update the dates for the forecast blocks
	$(".forecast-card").each(function(i,v) {
		var newDate = dayjs().add(i + 1, 'day').format("MM/DD/YYYY");

		$(this).find(".forecast-date").text(newDate);
	});

	// handle clicking on the previously-searched buttons in the nav
	$(".panel-block").on("click", function(e) {
		e.preventDefault();
		// get the new location to search
		var newLocation = $(this).attr("data-location");
		// console.log(newLocation);

		// remove active class from all the other links
		$(".panel-block").each(function() {
			$(this).removeClass("is-active");
		});
		// make this (the clicked on) link active
		$(this).addClass("is-active");

		// actually get the weather for the location!
		getWeather(newLocation);
	});

	// now for the weather ...
	function getWeather(thisLocation) {
		$.ajax({
      url: `${queryURL}weather?appid=${apiKey}&units=imperial&q=${thisLocation}`,
      method: "GET"
    }).then(function(response) {
    	// console.log(response);
    	$("#location").text(thisLocation);

    	// define variables for data
    	var weatherID = response.weather[0].id;
    	var tempMax = (response.main.temp_max).toFixed(1);
    	var tempMin = (response.main.temp_min).toFixed(1);
    	var humidity = response.main.humidity + "%";
    	var windSpeed = response.wind.speed + " MPH";
    	var sunrise = dayjs(response.sys.sunrise * 1000).format("h:mm A");
    	var sunset = dayjs(response.sys.sunset * 1000).format("h:mm A");

    	// for calculating whether or not the current time
    	// is after sunset (and before midnight)
    	// or before sunrise (and after midnight)
    	var nightCalcSunset = dayjs(response.sys.sunset * 1000).unix();
    	var nightCalcSunrise = dayjs(response.sys.sunrise * 1000).unix();
    	var nightCalcTime = dayjs().unix();

    	// to simplify the if/else statements below
    	var night = false;
    	if( nightCalcSunset < nightCalcTime || nightCalcTime < nightCalcSunrise ) {
    		night = true;
    		if(response['weather'].length > 1) {
    			weatherID = response.weather[1].id;
    		}
    	}

    	var iconAndImage = getIconsAndImages(weatherID, night);

    	$("main").css({"background-image": "url("+ iconAndImage.image +")"});

    	$("#todayWeather .weather-icon").html(iconAndImage.icon);
    	$("#temp").html(`${tempMax}&deg; F / ${tempMin}&deg; F`);
    	$("#humidity").text(humidity);
    	$("#wind").text(windSpeed);
    	$("#sunrise > p").text(sunrise);
    	$("#sunset > p").text(sunset);

    	// uv index is NOT returned in a weather call,
			// requiring the use of the UVI API
			getUVI(response.coord.lat, response.coord.lon);
			getForecast(response.coord.lat, response.coord.lon);
    });
	}

	// how murderous does the sun feel today?
	function getUVI(lat, lon) {

		// var uviQueryURL = "http://api.openweathermap.org/data/2.5/uvi?lat="+ lat +"&lon="+ lon +"&cnt=1&start="+ todayDate +"&end="+ todayDate +"&appid=" + apiKey;

		$.ajax({
      url: `${queryURL}uvi?lat=${lat}&lon=${lon}&cnt=1&start=${todayDate}&end=${todayDate}&appid=${apiKey}`,
      method: "GET"
    }).then(function(response) {
    	// console.log(response);
    	$("#uvi").empty();

    	var uvi = $("<p>", {class: "px-4 py-1 is-relative"});

    	if(response.value >= 0 && response.value <= 2) {
    		uvi.addClass("has-background-success has-text-white");
    		$("#uvi").attr("data-uvi", "low");

    	} else if(response.value >= 3 && response.value <= 5) {
    		uvi.addClass("has-background-warning");
    		$("#uvi").attr("data-uvi", "moderate");

    	} else if(response.value >= 6 && response.value <= 7) {
    		uvi.addClass("has-background-danger has-text-white");
    		$("#uvi").attr("data-uvi", "high");

    	} else if(response.value >= 8 && response.value <= 10) {
    		uvi.addClass("has-background-danger-dark has-text-white");
    		$("#uvi").attr("data-uvi", "very high");

    	} else {
    		var warningIcon = $("<i>", {class: "fad fa-exclamation-triangle is-pulled-right mt-1"});
    		uvi.addClass("has-background-violet has-text-white");
    		$("#uvi").attr("data-uvi", "extreme");
    		$(uvi).append(warningIcon);
    	}

    	uvi.prepend(response.value);
    	$("#uvi").html(uvi);
    });
	}

	// what kind of weather can we look forward too this week?
	function getForecast(lat, lon) {
		$.ajax({
      url: `${queryURL}forecast?lat=${lat}&lon=${lon}&cnt=36&units=imperial&appid=${apiKey}`,
      method: "GET"
    }).then(function(response) {
    	// console.log(response);
    	/**
    	 * ! no way to specify number of timestamps *per day*
    	 * Limiting the returned forecasts to 36 gets through noon 5 days
    	 * from now, though, and reduces the number of results to wade through
    	 * response.list[3] is forecast for noon tomorrow
    	 * response.list[11] is forecast for noon 2 days from now
    	 * response.list[19] is forecast for noon 3 days from now
    	 * response.list[27] is forecast for noon 4 days from now
    	 * response.list[35] is forecast for noon 5 days from now
    	 */
    	var day1 = response.list[3];
    	var day2 = response.list[11];
    	var day3 = response.list[19];
    	var day4 = response.list[27];
    	var day5 = response.list[35];

    	console.log(day1);
    });
	}

	function getIconsAndImages(weatherID, night) {
		var iconAndImage = {
			icon: '',
			image: ''
		};

		// assign weather icon based on the weatherID
  	// also assign background image to <main>
  	if(weatherID == 801) {
  		if(night) {
  			iconAndImage.icon = "<i class='fad fa-cloud-moon has-text-grey fa-2x'></i>";
  			iconAndImage.image = 'assets/images/kelly-sikkema--unsplash--801-804-night.jpg';

  		} else {
  			iconAndImage.icon = "<i class='fad fa-cloud-sun has-text-grey fa-2x'></i>";
  			iconAndImage.image = 'assets/images/ethan-medrano--unsplash--801.jpg';
  		}

  	} else if(weatherID == 802) {
			if(night) {
				iconAndImage.icon = "<i class='fad fa-clouds-moon has-text-grey-dark fa-2x'></i>";
				iconAndImage.image = 'assets/images/kelly-sikkema--unsplash--801-804-night.jpg';

			} else {
				iconAndImage.icon = "<i class='fad fa-clouds-sun has-text-grey-dark fa-2x'></i>";
				iconAndImage.image = 'assets/images/marc-wieland--unsplash--802.jpg';
			}

  	} else if(weatherID == 803 || weatherID == 804) {
  		iconAndImage.icon = "<i class='fad fa-clouds has-text-grey-darker fa-2x'></i>";
  		if(night) {
  			iconAndImage.image = 'assets/images/kelly-sikkema--unsplash--801-804-night.jpg';

  		} else {
  			iconAndImage.image = 'assets/images/barry-simon--unsplash--803-804.jpg';
  		}
  		
  	} else if(weatherID >= 500 && weatherID <= 504) {
  		iconAndImage.icon = "<i class='fad fa-cloud-showers has-text-info fa-2x'></i>";
  		if(night) {
  			iconAndImage.image = 'assets/images/eric-zhu--unsplash--500-531-night.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/jose-fontano--unsplash--500-504.jpg';
  		}
  		
  	} else if(weatherID == 511) {
  		iconAndImage.icon = "<i class='fad fa-cloud-sleet has-text-info-dark fa-2x'></i>";
  		if(night) {
  			iconAndImage.image = 'assets/images/eric-zhu--unsplash--500-531-night.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/christian-spuller--unsplash--511.jpg';
  		}
  		
  	} else if(weatherID >= 520 && weatherID <= 531) {
  		
  		if(night) {
  			iconAndImage.icon = "<i class='fad fa-cloud-moon-rain has-text-info-dark fa-2x'></i>";
  			iconAndImage.image = 'assets/images/eric-zhu--unsplash--500-531-night.jpg';

  		} else {
  			iconAndImage.icon = "<i class='fad fa-cloud-sun-rain has-text-info-dark fa-2x'></i>";
  			iconAndImage.image = 'assets/images/loren-gu--unsplash--520-531.jpg';
  		}
  		
  	} else if(weatherID >= 300 && weatherID <= 321) {
  		iconAndImage.icon = "<i class='fad fa-cloud-drizzle has-text-info fa-2x'></i>";
  		if(night) {
  			iconAndImage.image = 'assets/images/cayden-huang--unsplash--300-321-night.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/valentin-muller--unsplash--300-321.jpg';
  		}
  		
  	} else if(weatherID >= 200 && weatherID <= 232) {
  		
  		if(night) {
  			iconAndImage.icon = "<i class='fad fa-thunderstorm-moon has-text-black fa-2x'></i>";
  			iconAndImage.image = 'assets/images/lefty-kasdaglis--unsplash--200-232-night.jpg';
  		} else {
  			iconAndImage.icon = "<i class='fad fa-thunderstorm-sun has-text-black fa-2x'></i>";
  			iconAndImage.image = 'assets/images/raychel-sanner--unsplash--200-232.jpg';
  		}
  		
  	} else if(weatherID >= 600 && weatherID <= 622) {
  		iconAndImage.icon = "<i class='fad fa-snowflake has-text-info fa-2x'></i>";
  		if(night) {
  			iconAndImage.image = 'assets/images/william-topa--unsplash--600-622-night.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/damian-mccoig--unsplash--600-622.jpg';
  		}

  	} else if(weatherID >= 701 && weatherID <= 762) {
  		iconAndImage.icon = "<i class='fad fa-fog has-text-grey fa-2x'></i>";
  		if(night) {
  			iconAndImage.image = 'assets/images/chandler-cruttenden--unsplash--701-762-night';
  		} else {
  			iconAndImage.image = 'assets/images/staffan-kjellvestad--unsplash--701-762.jpg';
  		}
  		
  	} else if(weatherID == 771) {
  		iconAndImage.icon = "<i class='fad fa-wind has-text-grey fa-2x'></i>";
  		if(night) {
  			iconAndImage.image = 'assets/images/nathan-anderson--unsplash--771-night.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/lucy-chian--unsplash--771.jpg';
  		}
  		
  	} else if(weatherID == 781) {
  		iconAndImage.icon = "<i class='fad fa-tornado has-text-danger fa-2x'></i>";
  		iconAndImage.image = 'assets/images/nikolas-noonan--unsplash--781.jpg';

  	} else {
  		// this will also apply to anything
  		// with weather ID 800 (clear skies)
  		if( night ) {
  			iconAndImage.icon = "<i class='fad fa-moon has-text-alert fa-x1'></i>";
  			iconAndImage.image = 'assets/images/timothee-duran--unsplash--800-night.jpg';
  			
  		} else {
  			iconAndImage.icon = "<i class='fad fa-sun has-text-alert fa-2x'></i>";
  			iconAndImage.image = 'assets/images/ritam-baishya--unsplash--800.jpg';
  		}
  	}
  	return iconAndImage;
	}

	getWeather(startLocation);

	// getForecast();
});