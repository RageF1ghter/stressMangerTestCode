/*
This is to retrieve the device Id and store it in companion's local storage
Once the id is gotten, this code is not needed
*/

import { settingsStorage } from "settings";
import * as messaging from "messaging";
import { localStorage } from "local-storage";

// A user changes Settings
settingsStorage.onchange = evt => {
  if (evt.key === "oauth") {
    // localStorage.setItem("refreshToken", evt.newValue)
    // Settings page sent us an oAuth token
    let data = JSON.parse(evt.newValue);
    restoreSettings();
  }
}


// Restore previously saved settings and send to the device
export function restoreSettings() {
  let device_id;
  for (let index = 0; index < settingsStorage.length; index++) {
    let key = settingsStorage.key(index);
    console.log(key);
    if (key && key === "oauth") {
      // We already have an oauth token
      let data = JSON.parse(settingsStorage.getItem(key))
      fetchProfileData(data.access_token);
    }
  }
}


function fetchProfileData(accessToken){

fetch('https://api.fitbit.com/1/user/-/devices.json', {
  method: "GET",
  headers: {"Authorization": "Bearer " + accessToken}
})
.then(response => response.json())
.then(json => {
  localStorage.setItem('d', json[0]['id']);
  console.log("device id is found!!: " + localStorage.getItem('d'));
  });
}
