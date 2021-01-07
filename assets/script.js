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

  // dayjs().add($num, 'hour') to test opposite time settings() (e.g. night)
  var currentTime = dayjs().format("h:mm A") +" "+ timezone;

	var previouslySearched = JSON.parse(localStorage.getItem('weather-search-prev')) || ["EVERETT,WA,US"];

	// adding units=imperial returns temps in Farenheit
	// and wind in MPH, so no conversion math required!
	var queryURL = "https://api.openweathermap.org/data/2.5/";

	// add today's date to the page
	$("#todayDate").text(`(${todayDate})`);
	$("#location").text(previouslySearched[0]);
  $("#currentTime").text(currentTime);
	// $("#search").val(startLocation);

	updateNavList(previouslySearched[0]);
	
	$(".location-prev:first").text(titleCase(previouslySearched[0]), null).parents("a.panel-block").attr("data-location", previouslySearched[0]);

	// update the dates for the forecast blocks
	$(".forecast-card").each(function(i,v) {
		var newDate = dayjs().add(i + 1, 'day').format("MM/DD/YYYY");

		$(this).find(".forecast-date").text(newDate);
	});

	// handle clicking on the previously-searched buttons in the nav
	// $("nav").click(".panel-block", function() {
	// 	handleNavClick()
		
	// });

	$(".fa-search").click(function() {
		search();
	});

	$("form").on("submit", function(e) {
		e.preventDefault();

		search();
	});

	function search() {

		var searchLocation = $("#search").val();
		$("#search").val("");

		getWeather(searchLocation);
	}

	// now for the weather ...
	function getWeather(thisLocation) {
    // parsedLocation = parseLocation(thisLocation);
    // console.log(thisLocation);

		$.ajax({
      url: `${queryURL}weather?appid=${apiKey}&units=imperial&q=${parsedLocation}`,
      method: "GET"
    }).then(function(response) {
    	console.log(response);

    	// make sure response is 200 (successfully returned data)
    	if(response.cod === 200) {
        var locationTitle = titleCase(thisLocation, response.sys.country);
        $("#location").text(`${locationTitle}`);

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
				updatePreviouslySearched(locationTitle, response.sys.country);

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
    		if(!icon.hasClass('has-text-white') && !icon.hasClass("has-text-alert") && !icon.hasClass("has-text-moon")) {
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
  	var countryCode;
    // OK, more research has uncovered something:
    // using 2 parameters it's read as City, Country
    // using 3 is City, State, Country
    // if you put in London, KY you get an error - there is no country "KY"
    // you need London, KY, US to NOT get London, GB
    // if you search London, US, you should get a list of all cities in the US
    // named "London"; the API only returns the FIRST result
    // (which happens to be London, OH, US [usually?])
    // all of this means that we can let users input 2 params and
    // check against Alpha-2 Country codes / State codes
    // (start with state codes rather than country codes)
    // and 3 params (and check 2d against state abbreviations)
    // 2020-JAN-06: Added list of 3-digit country codes
    // for an additional check, just because
    // still defaulting to checking (US) state first, if 2nd
    // param is 2 characters
    var stateAbbreviations = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

    if( theLocation.indexOf(",") !== -1 ) {
      // create an array of the pieces
      locationArray = theLocation.split(",");
      
      // set theLocation to just the first part
      theLocation = locationArray[0].trim();

      // quick check to see if the 2nd param is CAN (so we can get
      // Toronto, CANADA instead of Toronto, CALIFORNIA)
      if(locationArray.length === 2 && locationArray[1] === "CAN") {
        theLocation += ", CA"; // we do need an Alpha-2 country code
      }
      // *then* check to see if the length is 3 params
      // and if the 2nd param is in the states list - if true, we're in the US!
      else if( locationArray.length >= 2 && stateAbbreviations.includes(locationArray[1].trim().toUpperCase()) ) {
        theLocation += `,${locationArray[1].trim().toUpperCase()},US`;

      } else if(locationArray.length === 3 && !stateAbbreviations.includes(locationArray[1].trim().toUpperCase())) {
        // if the length is 3 but we couldn't find the state in the states list
        // BUT the 3rd param is US/USA, just cut out the state and default
        // to whatever the 1st result is that OWM is going to return
        if(locationArray[2].trim().toUpperCase() === "US" || locationArray[2].trim().toUpperCase() === "USA") {
          theLocation += ",US";
        }
        // if, however, the 2nd param is NOT in the states list
        // get the country code and drop the middle bit
        else {
        	countryCode = locationArray.length === 3 ? getCountryCode(locationArray[2], true) : getCountryCode(locationArray[1], true);

        	theLocation += `,${countryCode}`;
        }

      }
      // finally, if the length of locationArray is just 2 AND the 2d param is
      // NOT in the states list, it must be a country so we can just use that
      else if(locationArray.length === 2 || !stateAbbreviations.includes(locationArray[1].trim().toUpperCase())) {
      	countryCode = getCountryCode(locationArray[1], true);
        theLocation += `,${countryCode}`;

      }
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
  			iconAndImage.icon = $("<i>", {class: "fad fa-cloud-moon has-text-grey-dark " + iconSize});
  			iconAndImage.image = 'assets/images/801-802-Night--KellySikkema-unsplash.jpg';

  		} else {
  			iconAndImage.icon = $("<i>", {class: 'fad fa-cloud-sun has-text-grey-dark ' + iconSize});
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
  			iconAndImage.image = 'assets/images/803-804-Day--BarrySimon-unsplash.jpg';
  		}
  		
  	} else if(weatherID >= 500 && weatherID <= 504) {
  		iconAndImage.icon = $("<i>", {class: 'fad fa-cloud-showers has-text-grey-dark ' + iconSize});
  		if(night) {
  			iconAndImage.image = 'assets/images/500-504-Night--VVNincic-flickr.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/500-504-Day--JoseFontano-unsplash.jpg';
  		}
  		
  	} else if(weatherID == 511) {
  		iconAndImage.icon = $("<i>", {class: 'fad fa-cloud-sleet has-text-grey-dark ' + iconSize});
  		if(night) {
  			iconAndImage.image = 'assets/images/522-Night--Isengardt-flickr.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/511-Day--ChristianSpuller-unsplash.jpg';
  		}
  		
  	} else if(weatherID >= 520 && weatherID <= 531) {
  		
  		if(night) {
  			iconAndImage.icon = $("<i>", {class: 'fad fa-cloud-moon-rain has-text-grey-dark ' + iconSize});
  			iconAndImage.image = 'assets/images/520-531-Night--min33NY-flickr.jpg';

  		} else {
  			iconAndImage.icon = $("<i>", {class: 'fad fa-cloud-sun-rain has-text-grey-dark ' + iconSize});
  			iconAndImage.image = 'assets/images/520-531-Day--LorenGu-unsplash.jpg';
  		}
  		
  	} else if(weatherID >= 300 && weatherID <= 321) {
  		iconAndImage.icon = $("<i>", {class: 'fad fa-cloud-drizzle has-text-grey-dark ' + iconSize});
  		if(night) {
  			iconAndImage.image = 'assets/images/300-321-Night--CaydenHuang-unsplash.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/300-321-Day--ValentinMuller-unsplash.jpg';
  		}
  		
  	} else if(weatherID >= 200 && weatherID <= 232) {
  		
  		if(night) {
  			iconAndImage.icon = $("<i>", {class: 'fad fa-thunderstorm-moon has-text-grey-dark ' + iconSize});
  			iconAndImage.image = 'assets/images/200-232-Night--LeftyKasdaglis-unsplash.jpg';
  		} else {
  			iconAndImage.icon = $("<i>", {class: 'fad fa-thunderstorm-sun has-text-black ' + iconSize});
  			iconAndImage.image = 'assets/images/200-232-Day--RaychelSanner-unsplash.jpg';
  		}
  		
  	} else if(weatherID >= 600 && weatherID <= 622) {
  		iconAndImage.icon = $("<i>", {class: 'fad fa-snowflake has-text-grey-dark ' + iconSize});
  		if(night) {
  			iconAndImage.image = 'assets/images/600-622-Night--WilliamTopa-unsplash.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/600-622-Day--DamianMccoig-unsplash.jpg';
  		}

  	} else if(weatherID >= 701 && weatherID <= 762) {
  		iconAndImage.icon = $("<i>", {class: 'fad fa-fog has-text-grey-dark ' + iconSize});
  		if(night) {
  			iconAndImage.image = 'assets/images/701-762-Night--ChandlerCruttenden-unsplash.jpg';
  		} else {
  			iconAndImage.image = 'assets/images/701-762-Day--StaffanKjellvestad-unsplash.jpg';
  		}
  		
  	} else if(weatherID == 771) {
  		iconAndImage.icon = $("<i>", {class: 'fad fa-wind has-text-grey-dark ' + iconSize});
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
  			iconAndImage.icon = $("<i>", {class: 'fad fa-moon has-text-moon ' + iconSize});
  			iconAndImage.image = 'assets/images/800-Night--TimotheeDuran-unsplash.jpg';
  			
  		} else {
  			iconAndImage.icon = $("<i>", {class: 'fad fa-sun has-text-alert ' + iconSize});
  			iconAndImage.image = 'assets/images/800-Day--RitamBaishya-unsplash.jpg';
  		}
  	}
  	return iconAndImage;
	}

  function saveSearchList(list) {
    localStorage.setItem( "weather-search-prev", JSON.stringify(list) );
  }

	function updatePreviouslySearched(thisLocation, countryCode) {
    // if the *country code* is CA, we need to replace CA with CAN
    // otherwise the next time the location is parsed it will
    // default to <City>, CA (California!), USA

    thisLocationArr = thisLocation.split(", ");
    if(thisLocationArr.length === 2 && thisLocationArr[1] === "CA" &&countryCode === "CA") {
    	thisLocationArr.splice(1, 1, "CAN");
    }
    thisLocation = thisLocationArr.join(",").toUpperCase();
    // var locationArray = thisLocation.split(",");
    var index = previouslySearched.indexOf(thisLocation);
    
    // if we didn't find the location in the above specific checks,
    // add it to the beginning of the previouslySearched array
    // and then "trim" the array to 10 items before saving/updating
		if(!previouslySearched.includes(thisLocation)) {
			previouslySearched.unshift(thisLocation);

      previouslySearched.splice(10);

      saveSearchList(previouslySearched);

      updateNavList(thisLocation);

		}
    // this assumes we DID find the location in the previouslySearched Array
    // so we just want to move it to the beginning then save the list to localStorage
    // and add the is-active class to the appropriate panel-block
    else {
      // rearrange list to put the currently selected one at the top,
      // but no need to update the nav -- just the saved list
      // the nav list will update on page refresh

      // var newFirstLocation = previouslySearched.slice(index, index + 1)[0];
      var newFirstLocation = previouslySearched[index];
      previouslySearched.splice(index, 1);
      previouslySearched.unshift(newFirstLocation);

      saveSearchList(previouslySearched);

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
      var locationName = previouslySearched[i],
      locationTitle = titleCase(locationName, null);

			var panelBlock = $("<a>", {class: "panel-block is-size-4"});
			panelBlock.attr("data-location", locationName);

			if(currentLocation == previouslySearched[i]) {
				panelBlock.addClass("is-active");
			}

			var panelIconContainer = $("<span>", {class: "panel-icon is-size-4"});
			var panelIcon = $("<i>", {class: "fad fa-search-location"});
			panelIcon.attr("aria-hidden", "true");
			panelIconContainer.html(panelIcon);

			var locationNameSpan = $("<span>", {class: "location-prev"});
			locationNameSpan.html(locationTitle);
      // console.log(locationTitle);

			panelBlock.append(panelIconContainer, locationNameSpan);

      // add click Event Handlers to the panels as they're created
      // otherwise they won't work (b/c they're created dynamically)
      panelBlock.on("click", function() {
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
			
			$("#previouslySearched").append(panelBlock);
		}
	}

  function titleCase(titleString, country=null) {
    var titleArray = [];
    var returnString = "";

    // if there are commas, we need to address each piece separately
    // the first one is going to be title cased, but not the others
    if(titleString.indexOf(",") > -1) {
      titleArray = titleString.split(",");

      // check for spaces in the City Name;
      // if there are spaces, address the words separately!
      if(titleArray[0].indexOf(" ") > -1) {
        // get the 1st item in the array and split it at the spaces
        var titleArraySecondary = titleArray[0].split(" ");
        titleArray[0] = "";
        titleArraySecondary.forEach(function(str, i) {
          str = str.toLowerCase();
          titleArray[0] += " " + str.substring(0,1).toUpperCase() + str.substring(1);
        });

      }
      // if there are no spaces in the City Name,
      // we still need to capitalize the 1st letter and make
      // the rest of the string lowercase!
      else {
        titleArray[0] = titleArray[0].substring(0,1).toUpperCase() + titleArray[0].substring(1).toLowerCase();
      }

      returnString = titleArray.join(", ");

    } 
    // if there are no commas BUT there are spaces
    // handle the separate words separately!
    else if(titleString.indexOf(",") == -1 && titleString.indexOf(" ") > -1) {
      if(titleString.indexOf(" ") > -1) {
        // get the 1st item in the array and split it at the spaces
        titleArray = titleString.split(" ");

        titleArray.forEach(function(str, i) {
          returnString += " " + str.substring(0,1).toUpperCase() + str.substring(1).toLowerCase();
        });

      }
    }
    // if there are no commas AND no spaces
    // it's just a standalone, single string
    else {
      returnString = titleString.substring(0,1).toUpperCase() + titleString.substring(1).toLowerCase();
    }

    if(titleString.indexOf(",") === -1 && country !== null) {
      returnString += `, ${country}`;
    }

    // using .trim() removes any extra space on the ends of the string
    // *without* removing internal spaces (bounded by characters)
    return returnString.trim();
  }

  function getCountryCode(code, alpha2 = true) {
  	var countryCodes = ["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW"];

    var countryCodes3 = ["ABW","AFG","AGO","AIA","ALA","ALB","AND","ARE","ARG","ARM","ASM","ATA","ATF","ATG","AUS","AUT","AZE","BDI","BEL","BEN","BES","BFA","BGD","BGR","BHR","BHS","BIH","BLM","BLR","BLZ","BMU","BOL","BRA","BRB","BRN","BTN","BVT","BWA","CAF","CAN","CCK","CHE","CHL","CHN","CIV","CMR","COD","COG","COK","COL","COM","CPV","CRI","CUB","CUW","CXR","CYM","CYP","CZE","DEU","DJI","DMA","DNK","DOM","DZA","ECU","EGY","ERI","ESH","ESP","EST","ETH","FIN","FJI","FLK","FRA","FRO","FSM","GAB","GBR","GEO","GGY","GHA","GIB","GIN","GLP","GMB","GNB","GNQ","GRC","GRD","GRL","GTM","GUF","GUM","GUY","HKG","HMD","HND","HRV","HTI","HUN","IDN","IMN","IND","IOT","IRL","IRN","IRQ","ISL","ISR","ITA","JAM","JEY","JOR","JPN","KAZ","KEN","KGZ","KHM","KIR","KNA","KOR","KWT","LAO","LBN","LBR","LBY","LCA","LIE","LKA","LSO","LTU","LUX","LVA","MAC","MAF","MAR","MCO","MDA","MDG","MDV","MEX","MHL","MKD","MLI","MLT","MMR","MNE","MNG","MNP","MOZ","MRT","MSR","MTQ","MUS","MWI","MYS","MYT","NAM","NCL","NER","NFK","NGA","NIC","NIU","NLD","NOR","NPL","NRU","NZL","OMN","PAK","PAN","PCN","PER","PHL","PLW","PNG","POL","PRI","PRK","PRT","PRY","PSE","PYF","QAT","REU","ROU","RUS","RWA","SAU","SDN","SEN","SGP","SGS","SHN","SJM","SLB","SLE","SLV","SMR","SOM","SPM","SRB","SSD","STP","SUR","SVK","SVN","SWE","SWZ","SXM","SYC","SYR","TCA","TCD","TGO","THA","TJK","TKL","TKM","TLS","TON","TTO","TUN","TUR","TUV","TWN","TZA","UGA","UKR","UMI","URY","USA","UZB","VAT","VCT","VEN","VGB","VIR","VNM","VUT","WLF","WSM","YEM","ZAF","ZMB","ZWE"];

    // if the code length already matches the required length
    // just return the code (for now); should add a check to make
    // sure the code provided is *actually* a country code, though
    if((alpha2 && code.length == 2) || (!alpha2 && code.length == 3)) {
    	return code;
    }

    if(alpha2 && countryCodes3.includes(code)) {
    	return countryCodes[countryCodes3.indexOf(code)];
    }

    if(!alpha2 && countryCodes.includes(code)) {
    	return countryCodes3[countryCodes.indexOf(code)];
    }
  }

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

  getWeather(previouslySearched[0]);
});