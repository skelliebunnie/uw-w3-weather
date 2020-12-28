# uw-w3-weather
UW Bootcamp Weather Dashboard assigment


## Assignment
Create a "Weather Dashboard" that displays the current weather including UV-Index and a 5-day forecast (just temp/humidity for those days).

A user should be able to search for a city, and previous searches should be saved in a list (recent -> least-recent). The list should be limited to 10 items, and should persist on page reload. Weather info for the last-searched-for city should automatically display on page reload.

I also made the decision that while a user could select something from the list, the selection would *not* move to the top of the nav list until the page was reloaded, just to avoid the appearance of links "jumping around" on the page. I also added the time (on page load only) in the header, on the right.

I'm particularly proud of the (completely unecessary) check for whether or not the current time is after sunset and (or before dawn) to determine if the sun or moon specific icons should be used. The result also determines which photo is used for both the background and the forecast cards in most cases.

## Screenshot
![Weather Dashboard Screenshot](/assets/screenshot.png?raw=true "Weather Dashboard Screenshot")

### Gitpages
https://skelliebunnie.github.io/uw-w3-weather/

#### Photo Credits
Images are mostly from https://unsplash.com; photographers: Kelly Sikkema, Ethan Medrano, Marc Wieland, Barry Simon, JoseFontano, Christian Spuller, Loren Gu, Cayden Huang, Valentin Muller, Lefty Kasdaglis, Raychel Sanner, William Topa, Damian McCoig, Chandler Cruttenden, Staffan Kjellvestad, Nathan Anderson, Lucy Chian, Nikolas Noonan, Timothee Duran, and Ritam Baishya.
A few are from https://flickr.com; photographers: Swaminathan, VVNincic, Isengardt, and min33NY.
