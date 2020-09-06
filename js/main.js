if ("serviceWorker" in navigator) {
  navigator.serviceWorker
    .register("sw.js")
    .catch((e) => console.log("Could not install serviceWorker", e));
}

(() => {
  /********************
   * Application Logic*
   ********************/
  let state = {
    currentLocation: {
      userLocation: false,
    },
    weather: {
      ready: false,
    },
    daily: {},
    searchString: "",
    searchResult: [],
    locations: {},
  };
  const callBacks = [];

  const setState = (func) => {
    const oldState = state;
    state = func(state);
    callBacks.forEach((elem) => {
      try {
        elem(oldState, state);
      } catch (error) {
        //  some error that shouldn't block anything occurred
      }
    });
  };
  const register = (func) => {
    const key = callBacks.length;
    callBacks[key] = func;
    return key;
  };

  /****************
   * Display Logic*
   ****************/
  const timePicker = (data) => {
    const d = new Date();
    const hours = d.getHours();
    if (hours >= 6 && hours <= 11) {
      return data.morn;
    }
    if (hours >= 12 && hours <= 19) {
      return data.day;
    }
    if (hours >= 19 && hours <= 23) {
      return data.eve;
    }
    return data.night;
  };
  const debouce = (func, timeout) => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(func, timeout, ...args);
    };
  };
  const shoutOutError = (message) => {
    const box = document.querySelector(".alert");
    const text = document.querySelector(".alert .message");
    text.innerHTML = message;
    box.classList.add("show");
    setTimeout(() => {
      text.innerHTML = "";
      box.classList.remove("show");
    }, 3000);
  };
  const handleFetchError = (e, customMessage) => {
    if (e.message.indexOf("Failed to fetch") !== -1) {
      shoutOutError(
        customMessage || "Could not complete operation because you're offline"
      );
    }
  };
  const trapFocusSidebar = (e) => {
    const KEYCODE_TAB = 9;
    const isTabPressed = e.key === "TAB" || e.keyCode === KEYCODE_TAB;
    if (!isTabPressed) return;
    const firstFocusableEl = document.querySelector(
      ".sidebar button:not(.dont-focus-please)"
    );
    const lastFocusableEl = document.querySelector(".sidebar .close-btn");

    if (e.shiftKey) {
      if (document.activeElement === firstFocusableEl) {
        lastFocusableEl.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastFocusableEl) {
        firstFocusableEl.focus();
        e.preventDefault();
      }
    }
  };
  const closeSidebar = () => {
    window.removeEventListener("keydown", trapFocusSidebar);
    document.body.classList.remove("side-toggled");
    document.querySelector(".top-ribbon button").focus();
  };
  const closeSearchScreen = () => {
    document.body.classList.remove("display-search-screen");
  };
  const openSidebar = () => {
    window.addEventListener("keydown", trapFocusSidebar);
    document.body.classList.add("side-toggled");
    document.querySelector(".sidebar button:not(.dont-focus-please)").focus();
  };
  const openSearchscreen = () => {
    document.body.classList.add("display-search-screen");
  };

  document
    .querySelector(".add-location-button")
    .addEventListener("click", openSearchscreen);

  const noop = () => {};
  const createElement = ({ element, props, children, reg }) => {
    props = props || {};
    children = children || null;
    reg = reg || noop;
    const ele = document.createElement(element);
    Object.keys(props).forEach((key) => {
      if (key.match(/\bon/)) {
        ele.addEventListener(key.replace(/\bon/, ""), props[key]);
        return;
      }
      ele.setAttribute(key, props[key]);
    });
    register((o, n) => reg(n, ele));
    if (children === null) return ele;
    if (Array.isArray(children)) {
      children.forEach((elem) => {
        ele.append(createElement(elem));
      });
    } else if (typeof children === "object") {
      ele.append(createElement(children));
    } else {
      ele.append(children);
    }
    return ele;
  };

  /*************
   * Components*
   *************/

  const divComponent = ({ props, children, reg, class: className }) => ({
    element: "div",
    children,
    reg,
    props: {
      class: className || "",
      ...props,
    },
  });
  const buttonComponent = (data) => ({
    ...divComponent(data),
    element: "button",
  });
  const screenReader = (text) => {
    if (typeof text === "object") {
      return {
        ...divComponent({ class: "sr-only" }),
        element: "p",
        ...text,
      };
    }
    return {
      element: "p",
      children: text,
      props: { class: "sr-only" },
    };
  };
  const imageComponent = ({ alt, src, props, reg }) => ({
    element: "img",
    reg,
    props: { ...(props || {}), alt: alt || "page icon", src },
  });
  const paragraphComponent = (data) => ({
    ...divComponent(data),
    element: "p",
  });
  const spanComponent = (data) => ({
    ...divComponent(data),
    element: "span",
  });
  const listComponent = (data) => ({
    ...divComponent(data),
    element: "ul",
  });

  const headerComponent = () => {
    const topRibbon = divComponent({
      class: "top-ribbon",
      children: [
        buttonComponent({
          children: [
            imageComponent({ alt: "menu-toggler", src: "./img/hambuger.svg" }),
            { ...screenReader("toggle sidebar navigation"), element: "span" },
          ],
          props: {
            onclick: openSidebar,
          },
        }),
        paragraphComponent({
          children: [
            spanComponent({
              children: imageComponent({
                alt: "map marker",
                src: "./img/map-marker.svg",
              }),
              class: "mr-1",
            }),
            spanComponent({ children: state.currentLocation.address }),
          ],
          reg: (state, el) => {
            if (state.currentLocation.userLocation) {
              el.firstChild.classList.remove("fade-out");
            } else {
              el.firstChild.classList.add("fade-out");
            }
            el.lastChild.innerHTML = state.currentLocation.address;
          },
        }),
      ],
    });

    const headerContent = divComponent({
      class: "header-content",
      children: state.weather.ready
        ? [
            paragraphComponent({
              class: "header-date",
              children: state.weather.date,
              reg: (state, el) => (el.innerHTML = state.weather.date),
            }),
            divComponent({
              class: "header-weather",
              children: [
                divComponent({
                  class: "header-weather-thumbnail",
                  children: imageComponent({
                    alt: "weather icon",
                    src: state.weather.icon,
                    reg: (state, el) => (el.src = state.weather.icon),
                  }),
                }),
                paragraphComponent({
                  class: "header-weather-temperature",
                  children: [
                    spanComponent({
                      class: "mr-1",
                      children: state.weather.temperature,
                      reg: (state, el) =>
                        (el.innerHTML = state.weather.temperature),
                    }),
                    spanComponent({
                      class: "feel",
                      children: state.weather.feel,
                      reg: (state, el) => (el.innerHTML = state.weather.feel),
                    }),
                    {
                      ...screenReader({
                        children: `temperature is ${state.weather.temperature} degrees and feels like ${state.weather.feel} degrees`,
                        reg: (state, el) =>
                          (el.innerHTML = `temperature is ${state.weather.temperature} degrees and feels like ${state.weather.feel} degrees`),
                      }),
                      element: "i",
                    },
                  ],
                }),
              ],
            }),
            paragraphComponent({
              class: "header-description",
              children: state.weather.description,
              reg: (state, el) => (el.innerHTML = state.weather.description),
            }),
          ]
        : divComponent({
            class: "content-notfound",
            children: [
              imageComponent({
                src: "./img/weather-icon.svg",
                alt: "not found icon",
              }),
              paragraphComponent({
                children: "Nothing here, use the + icon to add a location",
              }),
            ],
          }),
    });

    const header = {
      element: "header",
      children: divComponent({
        class: "header",
        children: [topRibbon, headerContent],
      }),
    };
    return createElement(header);
  };

  const mainContent = () => {
    const main = {
      ...divComponent({
        class: "main-content",
        children: [
          divComponent({
            class: "main-screen",
            children: divComponent({
              class: "wrapper",
              children: [
                listComponent({
                  class: "days",
                  children: Object.keys(state.daily).map((elem) => {
                    return {
                      ...divComponent({
                        class: state.daily[elem].active ? "active" : "",
                      }),
                      children: buttonComponent({
                        children: [
                          spanComponent({
                            class: "text",
                            children: elem,
                          }),
                          spanComponent({
                            class: "temperature",
                            children: [
                              spanComponent({
                                children: state.daily[elem].temperature,
                                reg: (state, el) =>
                                  (el.innerHTML =
                                    state.daily[elem].temperature),
                              }),
                              imageComponent({
                                alt: "weather icon",
                                src: state.daily[elem].icon,
                                reg: (state, el) =>
                                  (el.src = state.daily[elem].icon),
                              }),
                              screenReader({
                                children: `temperature: ${state.daily[elem].temperature} degree celcius`,
                                reg: (state, el) =>
                                  (el.innerHTML = `temperature: ${state.daily[elem].temperature} degree celcius`),
                              }),
                            ],
                          }),
                        ],
                        props: {
                          onclick: () => selectDay(elem),
                        },
                      }),
                      element: "li",
                      reg: (state, el) =>
                        state.daily[elem].active
                          ? el.classList.add("active")
                          : el.classList.remove("active"),
                    };
                  }),
                }),
                listComponent({
                  class: "bottom-ribbon",
                  children: state.weather.ready
                    ? [
                        {
                          ...divComponent({
                            children: [
                              imageComponent({
                                src: "./img/rain.svg",
                                alt: "rain icon",
                              }),
                              spanComponent({
                                children: state.weather.pop,
                                reg: (state, el) =>
                                  (el.innerHTML = state.weather.pop),
                              }),
                              screenReader({
                                children: `probability of precipitation ${state.weather.pop}`,
                                reg: (state, el) =>
                                  (el.innerHTML = `probability of precipitation ${state.weather.pop}`),
                              }),
                            ],
                          }),
                          element: "li",
                        },
                        {
                          ...divComponent({
                            children: [
                              imageComponent({
                                src: "./img/humid.svg",
                                alt: "rain icon",
                              }),
                              spanComponent({
                                children: `${state.weather.humidity}%`,
                                reg: (state, el) =>
                                  (el.innerHTML = `${state.weather.humidity}%`),
                              }),
                              screenReader({
                                children: `humidity ${state.weather.humidity} %`,
                                reg: (state, el) =>
                                  (el.innerHTML = `humidity ${state.weather.humidity} %`),
                              }),
                            ],
                          }),
                          element: "li",
                        },
                        {
                          ...divComponent({
                            children: [
                              imageComponent({
                                src: "./img/wind.svg",
                                alt: "wind icon",
                              }),
                              spanComponent({
                                children: `${state.weather.wind} Mps`,
                                reg: (state, el) =>
                                  (el.innerHTML = `${state.weather.wind} Mps`),
                              }),
                              screenReader({
                                children: `wind speed ${state.weather.wind} Mps`,
                                reg: (state, el) =>
                                  (el.innerHTML = `wind speed ${state.weather.wind} Mps`),
                              }),
                            ],
                          }),
                          element: "li",
                        },
                        {
                          ...divComponent({
                            children: [
                              imageComponent({
                                src: "./img/sun.svg",
                                alt: "sun icon",
                              }),
                              spanComponent({
                                children: state.weather.uvi,
                                reg: (state, el) =>
                                  (el.innerHTML = state.weather.uvi),
                              }),
                              screenReader({
                                children: `uv index ${state.weather.uvi}`,
                                reg: (state, el) =>
                                  (el.innerHTML = `uv index ${state.weather.uvi}`),
                              }),
                            ],
                          }),
                          element: "li",
                        },
                      ]
                    : [],
                }),
              ],
            }),
          }),
          divComponent({
            class: "search-screen",
            children: divComponent({
              class: "wrapper",
              children: [
                divComponent({
                  class: "top",
                  children: [
                    {
                      element: "form",
                      props: {
                        onsubmit: (e) => {
                          e.preventDefault();
                          performSearch();
                        },
                      },
                      children: [
                        imageComponent({
                          src: "./img/search.svg",
                          alt: "search icon",
                        }),
                        {
                          element: "input",
                          props: {
                            type: "search",
                            placeholder: "Search a location",
                            value: state.searchString,
                            oninput: (e) => {
                              setState((i) => ({
                                ...i,
                                searchString: e.target.value,
                              }));
                              performSearch();
                            },
                          },
                          reg: (state, el) => (el.value = state.searchString),
                        },
                      ],
                    },
                    buttonComponent({
                      class: "close-btn",
                      children: [
                        imageComponent({
                          src: "./img/close-btn-dark.svg",
                          alt: "back to app",
                        }),
                        screenReader("back to app"),
                      ],
                      props: {
                        onclick: closeSearchScreen,
                      },
                    }),
                  ],
                }),
                listComponent({
                  class: "search-results",
                  children: state.searchResult.map((elem) => {
                    return {
                      ...divComponent({}),
                      element: "li",
                      children: buttonComponent({
                        children: elem.location,
                        props: {
                          onclick: () => {
                            getWeatherData(elem.lon, elem.lat, false);
                            closeSearchScreen();
                          },
                        },
                      }),
                    };
                  }),
                  reg: (state, el) => {
                    el.innerHTML = "";
                    state.searchResult.forEach((elem) => {
                      el.append(
                        createElement({
                          ...divComponent({}),
                          element: "li",
                          children: buttonComponent({
                            children: elem.location,
                            props: {
                              onclick: () => {
                                getWeatherData(elem.lon, elem.lat, false);
                                closeSearchScreen();
                              },
                            },
                          }),
                        })
                      );
                    });
                  },
                }),
              ],
            }),
          }),
        ],
      }),
      element: "main",
    };
    return createElement(main);
  };

  const sidebarComponent = () => {
    const sidebar = divComponent({
      class: "sidebar",
      children: [
        divComponent({ class: "overlay", props: { onclick: closeSidebar } }),
        listComponent({
          class: "content",
          children: {
            ...divComponent({
              class: "wrapper",
              children: [
                {
                  ...divComponent({
                    class: "active d-sm-none add-location-side-btn",
                    children: [
                      buttonComponent({
                        props: {
                          title: "add location",
                          class: "dont-focus-please",
                          onclick: openSearchscreen,
                        },
                        children: [
                          spanComponent({ children: "+" }),
                          screenReader("add a new location"),
                        ],
                      }),
                    ],
                  }),
                  element: "li",
                },
                ...Object.keys(state.locations)
                  .sort((a) => (state.locations[a].userLocation ? -1 : 1))
                  .map((elem) => {
                    return {
                      ...divComponent({
                        class: state.locations[elem].isActive ? "active" : "",
                        reg: (state, el) => {
                          if (state.locations[elem].isActive) {
                            el.classList.add("active");
                          } else {
                            el.classList.remove("active");
                          }
                        },
                        children: buttonComponent({
                          children: [
                            divComponent({
                              class: "top",
                              children: [
                                paragraphComponent({
                                  children: spanComponent({
                                    children: state.locations[elem].userLocation
                                      ? [
                                          spanComponent({
                                            children: [
                                              imageComponent({
                                                src: "./img/map-marker.svg",
                                                alt: "map marker",
                                                props: {
                                                  class: "mr-1",
                                                },
                                              }),
                                              screenReader(
                                                "your current location"
                                              ),
                                            ],
                                          }),
                                          spanComponent({
                                            children:
                                              state.locations[elem].location,
                                          }),
                                        ]
                                      : spanComponent({
                                          children:
                                            state.locations[elem].location,
                                        }),
                                  }),
                                }),
                                spanComponent({
                                  class: "temperature",
                                  children: [
                                    spanComponent({
                                      children:
                                        state.locations[elem].temperature,
                                      reg: (state, el) =>
                                        (el.innerHTML =
                                          state.locations[elem].temperature),
                                    }),
                                    imageComponent({
                                      src: state.locations[elem].icon,
                                      alt: "weather icon",
                                      reg: (state, el) =>
                                        (el.src = state.locations[elem].icon),
                                    }),
                                    screenReader({
                                      children: `temperature: ${state.locations[elem].temperature} degree celcius`,
                                      reg: (state, el) =>
                                        (el.innerHTML = `temperature: ${state.locations[elem].temperature} degree celcius`),
                                    }),
                                  ],
                                }),
                              ],
                            }),
                            paragraphComponent({
                              class: "bottom",
                              children: state.locations[elem].description,
                              reg: (state, el) =>
                                (el.innerHTML =
                                  state.locations[elem].description),
                            }),
                          ],
                          props: {
                            onclick: () => {
                              const {
                                longitude,
                                latitude,
                                userLocation,
                              } = state.locations[elem];
                              getWeatherData(latitude, longitude, userLocation);
                              closeSidebar();
                            },
                          },
                        }),
                      }),
                      element: "li",
                    };
                  }),
              ],
              reg: (state, el) => {
                Array.prototype.forEach.call(
                  el.querySelectorAll("li:not(.add-location-side-btn)"),
                  (elem) => elem.remove()
                );
                Object.keys(state.locations)
                  .sort((a) => (state.locations[a].userLocation ? -1 : 1))
                  .forEach((elem) => {
                    el.append(
                      createElement({
                        ...divComponent({
                          class: state.locations[elem].isActive ? "active" : "",
                          reg: (state, el) => {
                            if (state.locations[elem].isActive) {
                              el.classList.add("active");
                            } else {
                              el.classList.remove("active");
                            }
                          },
                          children: buttonComponent({
                            props: {
                              onclick: () => {
                                const {
                                  longitude,
                                  latitude,
                                  userLocation,
                                } = state.locations[elem];
                                getWeatherData(
                                  latitude,
                                  longitude,
                                  userLocation
                                );
                                closeSidebar();
                              },
                            },
                            children: [
                              divComponent({
                                class: "top",
                                children: [
                                  paragraphComponent({
                                    children: spanComponent({
                                      children: state.locations[elem]
                                        .userLocation
                                        ? [
                                            spanComponent({
                                              children: [
                                                imageComponent({
                                                  src: "./img/map-marker.svg",
                                                  alt: "map marker",
                                                  props: {
                                                    class: "mr-1",
                                                  },
                                                }),
                                                screenReader(
                                                  "your current location"
                                                ),
                                              ],
                                            }),
                                            spanComponent({
                                              children:
                                                state.locations[elem].location,
                                            }),
                                          ]
                                        : spanComponent({
                                            children:
                                              state.locations[elem].location,
                                          }),
                                    }),
                                  }),
                                  spanComponent({
                                    class: "temperature",
                                    children: [
                                      spanComponent({
                                        children:
                                          state.locations[elem].temperature,
                                        reg: (state, el) =>
                                          (el.innerHTML =
                                            state.locations[elem].temperature),
                                      }),
                                      imageComponent({
                                        src: state.locations[elem].icon,
                                        alt: "weather icon",
                                        reg: (state, el) =>
                                          (el.src = state.locations[elem].icon),
                                      }),
                                      screenReader({
                                        children: `temperature: ${state.locations[elem].temperature} degree celcius`,
                                        reg: (state, el) =>
                                          (el.innerHTML = `temperature: ${state.locations[elem].temperature} degree celcius`),
                                      }),
                                    ],
                                  }),
                                ],
                              }),
                              paragraphComponent({
                                class: "bottom",
                                children: state.locations[elem].description,
                                reg: (state, el) =>
                                  (el.innerHTML =
                                    state.locations[elem].description),
                              }),
                            ],
                          }),
                        }),
                        element: "li",
                      })
                    );
                  });
              },
            }),
            element: "li",
          },
        }),
        buttonComponent({
          class: "close-btn",
          children: [
            imageComponent({
              alt: "close-button",
              src: "./img/close-btn.svg",
            }),
            screenReader("close menu"),
          ],
          props: {
            onclick: closeSidebar,
          },
        }),
      ],
    });

    return createElement(sidebar);
  };
  const startApp = () => {
    try {
      //  Clean up
      document.querySelector("header").remove();
      document.querySelector("main").remove();
      document.querySelector(".sidebar").remove();
    } catch (error) {}
    document.querySelector("#root").append(headerComponent());
    document.querySelector("#root").append(mainContent());
    document.body.append(sidebarComponent());
  };
  startApp();

  const getTimeZone = async (lat, lon) => {
    const req = await fetch(
      `https://api.locationiq.com/v1/reverse.php?key=392d8674e3f217&lat=${lat}&lon=${lon}&format=json`
    );
    const res = await req.json();
    if (req.status < 400) {
      return `${res.address.state}, ${res.address.country}`;
    }
    return null;
  };
  const getWeatherData = async (latitude, longitude, userLocation = false) => {
    const weekDays = [
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    try {
      const concurrent = [
        () =>
          fetch(
            `https://api.openweathermap.org/data/2.5/onecall?lat=${latitude}&lon=${longitude}&&appid=b3c2a3e185aae6c966741c0d9ba4ca5b`
          ),
        () => getTimeZone(latitude, longitude),
      ];
      const [req, timezone] = await Promise.all(
        concurrent.map((func) => func())
      );
      const data = await req.json();
      if (req.status >= 400) {
        shoutOutError(
          "Sorry, can't complete your request at the time because we are having issues with out service provider."
        );
        return;
      }
      const weatherData = data;
      const daily = data.daily.reduce((acc, cur) => {
        let d = new Date(cur.dt * 1000);
        let t = new Date(Date.now());
        return {
          ...acc,
          [t.getDate() === d.getDate() ? "Today" : weekDays[d.getDay()]]: {
            temperature: (timePicker(cur.temp) - 273).toFixed(0),
            active: t.getDate() === d.getDate(),
            icon: `https://openweathermap.org/img/wn/${cur.weather[0].icon}@2x.png`,
            date: `${weekDays[d.getDay()]} ${
              months[d.getMonth()]
            } ${d.getDate()} ${d.getFullYear()}`,
            feel: (timePicker(cur.feels_like) - 273).toFixed(0),
            description: cur.weather[0].description,
            pop: cur.pop,
            humidity: cur.humidity,
            wind: cur.wind_speed,
            uvi: cur.uvi,
            ready: true,
          },
        };
      }, {});
      const weather = daily["Today"];
      const currentLocation = {
        address: timezone,
        userLocation,
      };
      const locations = Object.values(state.locations).reduce((acc, cur) => {
        return { ...acc, [cur.location]: { ...cur, isActive: false } };
      }, {});
      locations[timezone] = {
        location: timezone,
        temperature: weather.temperature,
        icon: weather.icon,
        description: weather.description,
        userLocation,
        isActive: true,
        latitude,
        longitude,
        weatherData: data,
      };

      setState((i) => ({ ...i, daily, weather, currentLocation, locations }));
    } catch (error) {
      handleFetchError(
        error,
        "Can't get weather information for location because you're offline"
      );
      console.log("GetWeatherData Error: ", error);
    }
  };
  const addressLookup = async (address) => {
    try {
      const req = await fetch(
        `https://api.locationiq.com/v1/autocomplete.php?key=392d8674e3f217&q=${address}&format=json`
      );
      const res = await req.json();
      if (req.status !== 200) {
        shoutOutError(
          "Sorry, can't complete your request at the time because we are having issues with out service provider."
        );
        return;
      }
      const searchResult = res.map((elem) => {
        return {
          location: `${elem.display_place}, ${elem.address.country}`,
          lat: elem.lat,
          lon: elem.lon,
        };
      });
      setState((i) => ({ ...i, searchResult }));
    } catch (error) {
      //  Couldn't search for some reason
      handleFetchError(error);
    }
  };
  const performSearch = debouce(() => {
    if (state.searchString) {
      addressLookup(state.searchString);
    }
  }, 800);

  const selectDay = (day) => {
    const data = state.daily[day];
    if (!data) {
      return;
    }
    data.active = true;
    const daily = Object.keys(state.daily).reduce((acc, cur) => {
      const item = state.daily[cur];
      item.active = day === cur;
      return { ...acc, [cur]: item };
    }, {});
    setState((i) => ({ ...i, weather: data, daily }));
  };

  //  Let's save locations to localstorage anytime the sucker changes
  register((o, n) => {
    const locations = Object.values(n.locations).reduce((acc, cur) => {
      return {
        ...acc,
        [cur.location]: {
          location: cur.location,
          temperature: cur.temperature,
          icon: cur.icon,
          description: cur.description,
          userLocation: cur.userLocation,
          isActive: cur.isActive,
          latitude: cur.latitude,
          longitude: cur.longitude,
        },
      };
    }, {});
    localStorage["locations1"] = JSON.stringify(locations);
    if (o.weather.ready === false && n.weather.ready === true) {
      startApp();
    }
  });

  const localLocations = JSON.parse(localStorage["locations1"] || "{}");
  const currentLocation = {
    address: "",
    userLocation: false,
  };
  const localLocationsArr = Object.keys(localLocations);
  if (localLocationsArr.length > 0) {
    const tmp =
      localLocationsArr.find((e) => localLocations[e].isActive) ||
      localLocationsArr[0];
    if (tmp) {
      getWeatherData(
        localLocations[tmp].latitude,
        localLocations[tmp].longitude,
        localLocations[tmp].userLocation
      );
    }
  }
  setState((i) => ({
    ...i,
    locations: localLocations,
    currentLocation,
  }));
  if (!localLocationsArr.find((e) => localLocations[e].userLocation)) {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (data) => {
          getWeatherData(data.coords.latitude, data.coords.longitude, true);
        },
        (e) => {
          console.log(e);
          //  That's just sad. Why will anyone deny a nice app
          //  like yourself their location?
        }
      );
    }
  }
  register((o, n) => {
    const locations = Object.keys(n.locations);
    if (locations.length > 0) {
      const currentLocation = locations.find((e) => n.locations[e].active);
      if (currentLocation) {
        const location = n.locations[currentLocation];
        if (!location.weatherData) {
          getWeatherData(
            location.latitude,
            location.longitude,
            location.userLocation
          );
        }
      }
    }
  });
})();
