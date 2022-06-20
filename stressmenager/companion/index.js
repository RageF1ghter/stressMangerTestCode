//import statements to enable functionality
import { inbox } from "file-transfer";
import { decode, encode } from "cbor";
import { localStorage } from "local-storage";
import { me as device } from "device";
import { me as companion } from "companion";
import * as messaging from "messaging";
import * as GU from "./getUser.js";
import { app } from "peer";



// Awake companion every 60 minutes
const MINUTE = 1000 * 60;
companion.wakeInterval = 5 * MINUTE;
companion.onwakeinterval = evt => {
  console.log("Companion was already awake - onwakeinterval");
}
if (companion.launchReasons.wokenUp) { 
   // The companion started due to a periodic timer
   console.log("Started due to wake interval!");
}

/*
// Pulling device Id
var uniqueId_;
setInterval(() => {
    if (localStorage.getItem("d") == undefined){
        GU.restoreSettings(); // To populate device id periodically
        console.log("device Id is retrieved: " + localStorage.getItem("d"));
        uniqueId_ = localStorage.getItem("d")
      } else {
        uniqueId_ = localStorage.getItem("d")
        console.log("device Id had already been found " + uniqueId_)
        //uploadToDdb(parseInt(uniqueId_), JSON.parse(localStorage.getItem("str_data")))
      }
}, MINUTE*60);
var file_prefix;


/**
processes files from the app to the companion 
stores the file in companion local storage
*/
/*
var uniqueId = localStorage.getItem('d');
if (localStorage.getItem("d") == undefined){
    GU.restoreSettings(); // To populate device id periodically
    console.log("device Id is retrieved: " + localStorage.getItem("d"));
    uniqueId_ = localStorage.getItem("d");
}
console.log("uniqueId: " + uniqueId);
//console.log("data: " + localStorage.getItem("str_data"));*/

async function processAllFiles() {
  messaging.peerSocket.addEventListener("message", (evt) => {
    console.log("receive something");
    if (evt.data) {
      console.log("hrtime: " + evt.data.hrtime + " strtime: " + evt.data.strtime + " strLv: " + evt.data.strLv);
      //let strfilename = '{evt.data.strtime}.txt';
      //fs.writeFileSync(filename, ascii_data, "ascii");
    }
  });
   
}


// Upload stress data to DynamoDB
function uploadToDdb(deviceId, obj){
  var url = "https://rfhxmnw503.execute-api.us-west-1.amazonaws.com/dev/entries";
  fetch(url, {
      method: "POST",
      headers: {
          "Content-Type": "application/json",
      },
      body: JSON.stringify({
          "device_id": deviceId,
          "str_data": obj
      }),
  })
  .then( response => console.log("response: ", JSON.stringify(response)))
  .catch( error => console.log("error: ", error))
}

//creates an event listener
inbox.addEventListener("newfile", processAllFiles);
//calls processAllFiles
processAllFiles();
//uploadToDdb(parseInt(localStorage.getItem('d')), JSON.parse(localStorage.getItem(storage_name)))
/*setInterval(() => {
  console.log("Device Id from local storage: " + localStorage.getItem('d'));
  uploadToDdb(parseInt(localStorage.getItem('d')), JSON.parse(localStorage.getItem(storage_name)))
}, 1000*60*12);*/
