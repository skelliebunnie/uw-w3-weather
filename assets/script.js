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
  
  // https://stackoverflow.com/a/34405528
  var timezone = new Date().toLocaleTimeString('en-us', {timeZoneName: 'short'}).split(' ')[2];

  var currentTime = dayjs().format("h:mm A") +" "+ timezone;

	var startLocation = "everett";
	var previouslySearched = JSON.parse(localStorage.getItem('weather-search-prev')) || [startLocation, "San Francisco"];
	if(previouslySearched.length > 1) {
		startLocation = previouslySearched[0];
	}

	// adding units=imperial returns temps in Farenheit
	// and wind in MPH, so no conversion math required!
	var queryURL = "https://api.openweathermap.org/data/2.5/";

	// add today's date to the page
	$("#todayDate").text(`(${todayDate})`);
	$("#location").text(startLocation);
  $("#currentTime").text(currentTime);
	// $("#search").val(startLocation);

	updateNavList(startLocation);
	
	$(".location-prev:first").text(startLocation).parents("a.panel-block").attr("data-location", startLocation);

	// update the dates for the forecast blocks
	$(".forecast-card").each(function(i,v) {
		var newDate = dayjs().add(i + 1, 'day').format("MM/DD/YYYY");

		$(this).find(".forecast-date").text(newDate);
	});

	// handle clicking on the previously-searched buttons in the nav
	// $("nav").click(".panel-block", function() {
	// 	handleNavClick()
		
	// });

	$("form").on("submit", function(e) {
		e.preventDefault();

		var searchLocation = $("#search").val();
		$("#search").val("");

		getWeather(searchLocation);
	});

	// now for the weather ...
	function getWeather(thisLocation) {
    thisLocation = parseLocation(thisLocation);

		$.ajax({
      url: `${queryURL}weather?appid=${apiKey}&units=imperial&q=${thisLocation}`,
      method: "GET"
    }).then(function(response) {
    	console.log(response);
    	// make sure response is 200 (successfully returned data)
    	if(response.cod === 200) {
    		// $("#location").text(thisLocation);

	    	// define variables for data
	    	var weatherID = response.weather[0].id;
	    	var tempMax = (response.main.temp_max).toFixed(1);
	    	var tempMin = (response.main.temp_min).toFixed(1);
	    	var humidity = response.main.humidity + "%";
	    	var windSpeed = response.wind.speed + " MPH";
	    	var sunrise = response.sys.sunrise;
	    	var sunset = response.sys.sunset;
	    	var sunriseFormatted = dayjs(sunrise * 1000).format("h:mm A");
	  		var sunsetFormatted = dayjs(sunset * 1000).format("h:mm A");

	    	var night = isNight(sunrise, sunset);
	    	if(night && response['weather'].length > 1) {
	  			weatherID = response.weather[1].id;
	  		}
	    	var iconAndImage = getIconsAndImages(weatherID, night);

	    	$("main").css({"background-image": "linear-gradient(to bottom, rgba(0,0,0,0.5), rgba(0,0,0,0.5)), url("+ iconAndImage.image +")"});

	    	$("#todayWeather .weather-icon").html(iconAndImage.icon);
	    	$("#temp").html(`${tempMax}&deg; F / ${tempMin}&deg; F`);
	    	$("#humidity").text(humidity);
	    	$("#wind").text(windSpeed);
	    	$("#sunrise > p").text(sunriseFormatted);
	    	$("#sunset > p").text(sunsetFormatted);

	    	// uv index is NOT returned in a weather call,
				// requiring the use of the UVI API
				getUVI(response.coord.lat, response.coord.lon);
				getForecast(response.coord.lat, response.coord.lon);
				updatePreviouslySearched(thisLocation);

    	}
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

    	var uviValue = Math.ceil(response.value);

    	if(uviValue >= 0 && uviValue <= 2) {
    		uvi.addClass("has-background-success has-text-white");
    		$("#uvi").attr("data-uvi", "low");

    	} else if(uviValue >= 3 && uviValue <= 5) {
    		uvi.addClass("has-background-warning");
    		$("#uvi").attr("data-uvi", "moderate");

    	} else if(uviValue >= 6 && uviValue <= 7) {
    		uvi.addClass("has-background-danger has-text-white");
    		$("#uvi").attr("data-uvi", "high");

    	} else if(uviValue >= 8 && uviValue <= 10) {
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
    	var forecasts = [
    		response.list[3],
    		response.list[11],
    		response.list[19],
    		response.list[27],
    		response.list[35]
    	];

    	var night = isNight(response.city.sunrise, response.city.sunset);

    	for(var i = 0; i < forecasts.length; i++) {
    		// console.log(forecasts[i]);
    		var index = i + 1;

    		var iconAndImage = getIconsAndImages(forecasts[i].weather[0].id, night);
    		var icon = iconAndImage.icon;
    		icon.removeClass('fa-2x has-text-primary has-text-info has-text-grey has-text-grey-dark has-text-grey-darker');
    		if(!icon.hasClass('has-text-white')) {
    			icon.addClass('has-text-white');
    		}
    		
    		var temp = forecasts[i].main.temp;
    		var humidity = forecasts[i].main.humidity + "%";

    		var card = $(`.forecast-columns .column:nth-child(${index}) .forecast-card`);
    		if(night) { card.addClass("night"); } else { card.removeClass("night"); }
    		card.find(".forecast-icon").html(icon);
    		card.find(".card-image img").attr("src", iconAndImage.image);
    		card.find("#temp").html(`${temp} &deg;F`);
    		card.find("#humidity").text(humidity);
    	}

    });
	}

  function parseLocation(theLocation) {
    // if there's a comma, remove everything after it
    // even though this means you can't search for "London,CAN"
    // or "Aurora,CO" (errors out anyway), OWM is apparently
    // *VERY* opinionated and strips things anyway.
    // EX// London,KY,USA returns London,GB ...
    if( theLocation.indexOf(",") !== -1 ) {
      theLocation = theLocation.substring(0, theLocation.indexOf(","));
    }

    return theLocation;
  }

	function isNight(sunrise, sunset) {
  	// for calculating whether or not the current time
  	// is after sunset (and before midnight)
  	// or before sunrise (and after midnight)
  	var nightCalcSunset = dayjs(sunset * 1000).unix();
  	var nightCalcSunrise = dayjs(sunrise * 1000).unix();
  	var nightCalcTime = dayjs().unix();

  	// to simplify the if/else statements below
  	var night = false;
  	if( nightCalcSunset < nightCalcTime || nightCalcTime < nightCalcSunrise ) {
  		night = true;
  	}

  	return night;
	}

	function getIconsAndImages(weatherID, night) {
		var iconAndImage = {
			icon: '',
			image: ''
		};

    var iconSize = "fa-lg";

		// assign weather icon based on the weatherID
  	// also assign background image to <main>
  	if(weatherID == 801) {
  		if(night) {
  			iconAndImage.icon = $("<i>", {class: "fad fa-cloud-moon has-text-moon has-text-grey " + iconSize});
  			iconAndImage.image = 'assets/images/801-802-Night--KellySikkema-unsplash.jpg';

  		} else {
  			iconAndImage.icon = $("<i>", {class: 'fad fa-cloud-sun has-text-grey ' + iconSize});
  			iconAndImage.image = 'assets/images/801-Day--EthanMedrano-unsplash.jpg';
  		}

  	} else if(weatherID == 802) {
			if(night) {
				iconAndImage.icon = $("<i>", {class: 'fad fa-clouds-moon has-text-grey-dark ' + iconSize});
				iconAndImage.image = 'assets/images/801-802-Night--KellySikkema-unsplash.jpg';

			} else {
				iconAndImage.icon = $("<i>", {class: 'fad fa-clouds-sun has-text-grey-dark ' + iconSize});
				iconAndImage.image = 'assets/images/802-Day--MarcWieland-unsplash.jpg';
			}

  	} else if(weatherID == 803 || weatherID == 804) {
  		iconAndImage.icon = $("<i>", {class: 'fad fa-clouds has-text-grey-darker ' + iconSize});
  		if(night) {
  			iconAndImage.image = 'assets/images/803-804-Night--Swaminathan-flickr.jpg';

  		} else {
  			iconAndImage.image = 'assets/images/803-804-Day--MatthewPaulArgall-flickr.jpg';
  		}
  		
  	} else if(weatherID >= 500 && weatherID <= 504) {
  		iconAndImage.icon = $("<i>", {class: 'fad fa-cloud-showers has-text-info ' + iconSize});
  		if(night) {
  			iconAndImage.image = 'assets/images/500-504-Night--VVNincic-flickr.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/500-504-Day--JoseFontano-unsplash.jpg';
  		}
  		
  	} else if(weatherID == 511) {
  		iconAndImage.icon = $("<i>", {class: 'fad fa-cloud-sleet has-text-info-dark ' + iconSize});
  		if(night) {
  			iconAndImage.image = 'assets/images/522-Night--Isengardt-flickr.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/511-Day--ChristianSpuller-unsplash.jpg';
  		}
  		
  	} else if(weatherID >= 520 && weatherID <= 531) {
  		
  		if(night) {
  			iconAndImage.icon = $("<i>", {class: 'fad fa-cloud-moon-rain has-text-info-dark ' + iconSize});
  			iconAndImage.image = 'assets/images/520-531-Night--min33NY-flickr.jpg';

  		} else {
  			iconAndImage.icon = $("<i>", {class: 'fad fa-cloud-sun-rain has-text-info-dark ' + iconSize});
  			iconAndImage.image = 'assets/images/520-531-Day--LorenGu-unsplash.jpg';
  		}
  		
  	} else if(weatherID >= 300 && weatherID <= 321) {
  		iconAndImage.icon = $("<i>", {class: 'fad fa-cloud-drizzle has-text-info ' + iconSize});
  		if(night) {
  			iconAndImage.image = 'assets/images/300-321-Night--CaydenHuang-unsplash.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/300-321-Day--ValentinMuller-unsplash.jpg';
  		}
  		
  	} else if(weatherID >= 200 && weatherID <= 232) {
  		
  		if(night) {
  			iconAndImage.icon = $("<i>", {class: 'fad fa-thunderstorm-moon has-text-black ' + iconSize});
  			iconAndImage.image = 'assets/images/200-232-Night--LeftyKasdaglis-unsplash.jpg';
  		} else {
  			iconAndImage.icon = $("<i>", {class: 'fad fa-thunderstorm-sun has-text-black ' + iconSize});
  			iconAndImage.image = 'assets/images/200-232-Day--RaychelSanner-unsplash.jpg';
  		}
  		
  	} else if(weatherID >= 600 && weatherID <= 622) {
  		iconAndImage.icon = $("<i>", {class: 'fad fa-snowflake has-text-info ' + iconSize});
  		if(night) {
  			iconAndImage.image = 'assets/images/600-622-Night--WilliamTopa-unsplash.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/600-622-Day--DamianMccoig-unsplash.jpg';
  		}

  	} else if(weatherID >= 701 && weatherID <= 762) {
  		iconAndImage.icon = $("<i>", {class: 'fad fa-fog has-text-grey ' + iconSize});
  		if(night) {
  			iconAndImage.image = 'assets/images/701-762-Night--ChandlerCruttenden-unsplash.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/701-762-Day--StaffanKjellvestad-unsplash.jpg';
  		}
  		
  	} else if(weatherID == 771) {
  		iconAndImage.icon = $("<i>", {class: 'fad fa-wind has-text-grey ' + iconSize});
  		if(night) {
  			iconAndImage.image = 'assets/images/771-Night--NathanAnderson-unsplash.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/771-Day--LucyChian-unsplash.jpg';
  		}
  		
  	} else if(weatherID == 781) {
  		iconAndImage.icon = $("<i>", {class: 'fad fa-tornado has-text-danger ' + iconSize});
  		iconAndImage.image = 'assets/images/781-Both--NikolasNoonan-unsplash.jpg';

  	} else {
  		// this will also apply to anything
  		// with weather ID 800 (clear skies)
  		if( night ) {
  			iconAndImage.icon = $("<i>", {class: 'fad fa-moon has-text-alert fa-x1'});
  			iconAndImage.image = 'assets/images/800-Night--TimotheeDuran-unsplash.jpg';
  			
  		} else {
  			iconAndImage.icon = $("<i>", {class: 'fad fa-sun has-text-alert ' + iconSize});
  			iconAndImage.image = 'assets/images/800-Day--RitamBaishya-unsplash.jpg';
  		}
  	}
  	return iconAndImage;
	}

	function updatePreviouslySearched(thisLocation) {
		if(!previouslySearched.includes(thisLocation)) {
			previouslySearched.unshift(thisLocation);

      previouslySearched.splice(10);

      localStorage.setItem( "weather-search-prev", JSON.stringify(previouslySearched) );

      updateNavList(thisLocation);

		} else {
      $(".panel-block").each(function() {
        if($(this).attr("data-location") == thisLocation) {
          $(this).addClass("is-active");
        } else {
          $(this).removeClass("is-active");
        }
      });

    }
	}

	function updateNavList(currentLocation) {
		$("#previouslySearched").empty();
		// loop through the previouslySearched array
		// and build a "panel-block" for each
		for(var i = 0; i < previouslySearched.length; i++) {
			var panelBlock = $("<a>", {class: "panel-block is-size-4"});
			panelBlock.attr("data-location", previouslySearched[i]);

			if(currentLocation == previouslySearched[i]) {
				panelBlock.addClass("is-active");
			}

			var panelIconContainer = $("<span>", {class: "panel-icon is-size-4"});
			var panelIcon = $("<i>", {class: "fad fa-search-location"});
			panelIcon.attr("aria-hidden", "true");
			panelIconContainer.html(panelIcon);

			var locationName = $("<span>", {class: "location-prev"});
			locationName.text(previouslySearched[i]);

			panelBlock.append(panelIconContainer, locationName);
      panelBlock.on("click", function() {
        // get the new location to search
        var newLocation = $(this).attr("data-location");
        console.log(newLocation);

        // remove active class from all the other links
        $(".panel-block").each(function() {
          $(this).removeClass("is-active");
        });
        // make this (the clicked on) link active
        $(this).addClass("is-active");

        // actually get the weather for the location!
        getWeather(newLocation);
      });
			
			$("#previouslySearched").append(panelBlock);
		}
	}

	getWeather(startLocation);

  $(".modal, body").click(function() {
    $(".modal").removeClass("is-active");
  });

  // https://stackoverflow.com/a/14934355
  // settings has the URL, xhr has the statusText
  $(document).ajaxError(function(e, xhr, settings, exception) {
    var url = settings["url"];
    var searchTerm = url.substring(url.indexOf("q=") + 2);
    var errorMsg = xhr.statusText;
    
    $("#errorMessage").html(`"${searchTerm}"<br>${errorMsg}`);
    $(".modal").addClass("is-active");
  });
});