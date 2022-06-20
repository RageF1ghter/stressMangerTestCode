//add import statements to enable functionality
import { display } from "display";
import document from "document";
import { HeartRateSensor } from "heart-rate";
import * as messaging from "messaging";
import * as fs from "fs";
import { listDirSync } from "fs";
import { vibration } from "haptics";
import { inbox } from "file-transfer";
import { outbox } from "file-transfer";
import { encode } from "cbor";
import { me } from "appbit";
import clock from "clock";
import { today as myData } from "user-activity";
import { charger, battery } from "power";
import { user } from "user-profile";

me.appTimeoutEnabled = false; // Disable timeout

//Declare labels for data
const hrmData = document.getElementById("hrm-data");
const myPromptButton = document.getElementById("promptButton");
const syncText = document.getElementById("myText");
const stepData = document.getElementById("steps-data");
const calorieData = document.getElementById("calorie-data");
const batteryData = document.getElementById("battery-data");
const clockLabel = document.getElementById("clock-label");
const dayLabel = document.getElementById("dayLabel");
const monthLabel = document.getElementById("monthLabel");
const dateLabel = document.getElementById("dateLabel");
const promptLabel = document.getElementById("myPrompt");
const promptDescription = document.getElementById("myPromptDescription");
const shoeImg = document.getElementById("shoe_img");
const heartImg = document.getElementById("heart_img");
const fireImg = document.getElementById("fire_img");
const batteryImg = document.getElementById("battery_img");

const stress1 = document.getElementById("stress1");
const stress2 = document.getElementById("stress2");
const stress3 = document.getElementById("stress3");
const stress4 = document.getElementById("stress4");

const s1Label = document.getElementById("notstressed");
const s2Label = document.getElementById("littlestressed");
const s3Label = document.getElementById("modstressed");
const s4Label = document.getElementById("verystressed");

//Set the visibility of the cycleview and button to "none" at compile time
syncText.style.display = "none";
promptLabel.style.display = "none";
promptDescription.style.display = "none";
myPromptButton.style.display = "none";
stress1.style.display = "none";
stress2.style.display = "none";
stress3.style.display = "none";
stress4.style.display = "none";

s1Label.style.display = "none";
s2Label.style.display = "none";
s3Label.style.display = "none";
s4Label.style.display = "none";

var promptTimeout;

//define data constants
const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEPT", "OCT", "NOV", "DEC"];

//define the notification times
var current_time = new Date();
var splited = String(current_time).split(" ");
var a = new Date(splited[3], current_time.getMonth(), splited[2], 7, 30); // Example result : Mon Aug 23 2021 07:30:00 GMT-07:00
var b = new Date(splited[3], current_time.getMonth(), splited[2], 10, 0);
var c = new Date(splited[3], current_time.getMonth(), splited[2], 15, 30);//15, 30
var d = new Date(splited[3], current_time.getMonth(), splited[2], 19, 30);
var notif = [a,b,c,d];

//define the intervals
const intervals = [9000000, 19800000, 14400000, 43200000];
var nextPrompt = 100000000000000;
var index;

//find the next possible time
for (var i=0; i<notif.length; i++){
  if (parseInt(notif[i] - current_time) <= nextPrompt && parseInt(notif[i] - current_time) > 0) {
    nextPrompt = parseInt(notif[i] - current_time);
    index = i;
  }
  //If current time is after the last notification time, get tomorrow's first notification time
  if (i==3 && parseInt(notif[i] - current_time) < 0){
    const tomorrow = new Date(a)
    tomorrow.setDate(tomorrow.getDate() + 1)
    nextPrompt = parseInt(tomorrow - current_time)
    index = 0;
  }  
}

promptTimeout = setTimeout(promptForSurvey, nextPrompt);



//get step + calorie data 
clock.granularity = "minutes"; // seconds, minutes, hours
var prompted = false;
clock.addEventListener("tick", (evt) => {
  //set time value
  let now = evt.date;
  let hours = now.getHours();
  let minutes = ("0" + now.getMinutes()).slice(-2);
  clockLabel.text = `${hours}:${minutes}`;
  
  //set step, calorie, and battery data
  stepData.text = myData.adjusted.steps;
  calorieData.text = myData.adjusted.calories;
  batteryData.text = battery.chargeLevel + "%";
  let thisDay = new Date();
  let monthnum = thisDay.getMonth();
  let dayName = days[thisDay.getDay()];
  let monthName = months[monthnum];
  dateLabel.text = thisDay.getDate();
  monthLabel.text = monthName;
  dayLabel.text = dayName;
});



function promptForSurvey(){
  //kick off the next timeout
  display.poke();
  promptTimeout = setTimeout(promptForSurvey, intervals[index]);
  console.log(" / nextPrompt: " + intervals[index]);
  index = (index + 1) % 4;
  console.log("index: " + i);
  vibration.start("ping");
  hideClockface();
  hideUserPrompt();
  promptLabel.style.display = "inline";
  promptDescription.style.display = "inline";
  myPromptButton.text = "Dismiss";
  myPromptButton.style.display = "inline";
  
}

function hidePromptForSurvey(){
  promptLabel.style.display = "none";
  promptDescription.style.display = "none";
  myPromptButton.style.display = "none";
  if(immediateTimeout){
    showButton();
  }
  else{
    showClockface();
  }
  
}

var timestamp;
var heartRate;
var restingHR;
var threshold;
var percentageIncrease = .10;
var timeout30set = false;
var promptingTimeout;
var immediateTimeout = false;

if (HeartRateSensor) {
  console.log("This device has a HeartRateSensor!");
  //create an HRM object
  const hrm = new HeartRateSensor();
  //add an event listener to write the file whenever there is a change in heartrate
  hrm.addEventListener("reading", () => {
    updateThreshold();
    
    hrmData.text = hrm.heartRate;
    heartRate = hrm.heartRate;
    timestamp =+ new Date();
    
    if(!timeout30set){

      //if the hr exceeds threshold and is valid to prompt, and inital countdown hasn't been set
      if (hrm.heartRate >= threshold) {
         timeout30set = true;
         console.log("initial timeout set");
         promptingTimeout = setTimeout(checkIfThresholdExceededStill, 60000, 1);
      }
    }
  });
  //start the hrm
  hrm.start();
} else {
  console.log("This device does NOT have a HeartRateSensor!");
}


/*
This function is called if the HR is sustained above the threshold for 2 min.
This function shows the prompt and sets the second countdown to get input.
*/
function checkIfThresholdExceededStill(type){
      if(type == 1){
        if (heartRate >= threshold){
          immediateTimeout = true;
          vibration.start("ping");
          if(myPromptButton.style.display == "none"){
             showButton();
          }
          clearTimeout(promptingTimeout);
          console.log("Timer1 is restarted");
          promptingTimeout = setTimeout(checkIfThresholdExceededStill, 120000, 2);
        }
        else{
          clearTimeout(promptingTimeout);
          timeout30set = false;
        }
      }
      if (type == 2){
        vibration.start("ping");
        clearTimeout(promptingTimeout);
        console.log("Timer2 is restarted");
        promptingTimeout = setTimeout(missedTimeInterval, 300000);
      }    
}


/*
This function is responsible for hiding the stress level prompt
*/
function hideUserPrompt(){
  stress1.style.display = "none";
  stress2.style.display = "none";
  stress3.style.display = "none";
  stress4.style.display = "none";
  s1Label.style.display = "none";
  s2Label.style.display = "none";
  s3Label.style.display = "none";
  s4Label.style.display = "none";
}

/*
This function is called when the Timeout is executed.
If this function is called, a stress level trigger was missed.
We will get rid of the prompt and send a stress level of "0" to s3
to indicate a missed stress level.
*/
function missedTimeInterval(){
  clearTimeout(promptingTimeout);
  hideUserPrompt();
  getUserInput(0);
}

function hideClockface(){
  clockLabel.style.display = "none";
  dayLabel.style.display = "none";
  monthLabel.style.display = "none";
  dateLabel.style.display = "none";
  stepData.style.display = "none";
  batteryData.style.display = "none";
  calorieData.style.display = "none";
  hrmData.style.display = "none";
  shoeImg.style.display = "none";
  fireImg.style.display = "none";
  batteryImg.style.display = "none";
  heartImg.style.display = "none";
}

function showClockface(){
  clockLabel.style.display = "inline";
  dayLabel.style.display = "inline";
  monthLabel.style.display = "inline";
  dateLabel.style.display = "inline";
  stepData.style.display = "inline";
  batteryData.style.display = "inline";
  calorieData.style.display = "inline";
  hrmData.style.display = "inline";
  shoeImg.style.display = "inline";
  fireImg.style.display = "inline";
  batteryImg.style.display = "inline";
  heartImg.style.display = "inline";
}

/*
Show button to record stresslevel.
Called when heart-rate is over 150
*/
function showButton(){
    timestamp =+ new Date();
    vibration.start("ping");
    //display the button and cycleview for user input
    stress1.style.display = "inline";
    stress2.style.display = "inline";
    stress3.style.display = "inline";
    stress4.style.display = "inline";
    s1Label.style.display = "inline";
    s2Label.style.display = "inline";
    s3Label.style.display = "inline";
    s4Label.style.display = "inline";
    stress1.removeEventListener("click", (evt) => {});
    stress2.removeEventListener("click", (evt) => {});
    stress3.removeEventListener("click", (evt) => {});
    stress4.removeEventListener("click", (evt) => {});
    hideClockface();
}

/*
Updates the threshold value by querying the user profile. If the resting HR does not
exist, we set the default value (resting HR for 25M).
We then update the overall threshold value to 70% increase of resting HR.
*/
function updateThreshold(){
  if (me.permissions.granted("access_user_profile")) {
    var fitbitRestingHR = (user.restingHeartRate || "Unknown");
    if(fitbitRestingHR == "Unknown"){
      //Avg resting HR for 25M
      restingHR = 58;
    }
    else{
      restingHR = fitbitRestingHR;
    }
  }
  else{
    //Avg resting HR for 25M
    restingHR = 58;
  }
  
  threshold = Math.round(restingHR + (restingHR * percentageIncrease));
}

stress1.addEventListener("click", (evt) => {
  console.log("stress1 clicked");
  clearTimeout(promptingTimeout);
  console.log("timeout disabled");
  getUserInput(1);
});

stress2.addEventListener("click", (evt) =>{
  console.log("stress2 clicked");
  clearTimeout(promptingTimeout);
  console.log("timeout disabled");
  getUserInput(2);
});

stress3.addEventListener("click", (evt) =>{
  console.log("stress3 clicked");
  clearTimeout(promptingTimeout);
  console.log("timeout disabled");
  getUserInput(3);
});

stress4.addEventListener("click", (evt) =>{
  console.log("stress4 clicked");
  clearTimeout(promptingTimeout);
  console.log("timeout disabled");
  getUserInput(4);
});

myPromptButton.addEventListener("click", (evt) => {
   hidePromptForSurvey();
});

function cancelThirtyTimeout(){
  clearTimeout(promptingTimeout);
  timeout30set = false;
  console.log("30 s cancelled")
}

/**
Gets the current hrm and the user input from the user
Stores it in a cbor file titled "hrm.txt"
This function is called when heartRate is over 150
@param stressLevel:Int - This is a default parameter, 
       if unspecified, null, otherwise specified value
*/
var strArray = new Array();
let strfilename;
let name_tag;
function getUserInput(stressLevel = null){
  immediateTimeout = false;
  console.log("starting timeout for 30 min")
  promptingTimeout = setTimeout(cancelThirtyTimeout, 1800000);
  //promptingTimeout = setTimeout(cancelThirtyTimeout, 30000);
  
  var documentedStressLevel;
  var documentedStrTimestamp;
  
  documentedStressLevel = stressLevel;
  
  console.log(documentedStressLevel);
  //store the value of the cycleview
  hideUserPrompt();
  if(myPromptButton.style.display == "none"){
   showClockface();
  }
  
  var strJSON = new Object();
  strJSON.hrtime =+ timestamp;
  strJSON.strtime =+ timestamp;
  strJSON.strLv = documentedStressLevel;
  console.log(strJSON.hrtime + " " + strJSON.strtime + " " + strJSON.strLv);
  var name_tag;
  if(strJSON.strtime == 0){
    name_tag = "_unspecified";
  }
  else{
    name_tag = strJSON.strtime;
  }
  
  strfilename = `str${name_tag}.txt`;
  fs.writeFileSync(strfilename, strJSON, "json");
  console.log("file name is " + strfilename);
  hideUserPrompt();
  transferFile();
}

function tryFileTransfer(){
  console.log("trying file transfer now")
  var dirArr = searchFiles();
  
  console.log("files in the directory :" + dirArr)
      let tryAgain = true;
      let currentTry = 0;
      const maxTries = 5;
      while (tryAgain && currentTry < maxTries) {
        try{
          transferFile();
          tryAgain = false;
          currentTry = 0;
        } catch(err) {
          console.log(err, 'retrying in 5 seconds');
          sleep(5000).then(() => { 
            tryAgain = true;
            currentTry++;
           });
        }
      }

      // if all retries failed
      if (currentTry == maxTries) {
        console.warn('File Trasfer Retries Failed.');
      }   

}

//setInterval( , 60000);


/**
Converts the string passed in to a buffer to write to the file in CBOR
@param string
*/
function convertToBuffer(str) {
  var buf = new ArrayBuffer(str.length*2);
  var bufView = new Uint16Array(buf);
  for (var i=0, strLen=str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
}


function searchFiles(){
  var dirArr = new Array();
  // File name lookup through directory and store in an array\
  try {
    const listDir = listDirSync("/private/data");
    var dirIter;
    while ((dirIter = listDir.next()) && !dirIter.done) {
      dirArr.push(dirIter.value);
    }
    return dirArr;
  } catch (err) {
    console.log('No files');
  }
}


function transferFile(){
  var dirArr = searchFiles();
  var filename = dirArr[0]; 
  var counter = 0;
  
  //test code  
  while(dirArr[counter]){
    //console.log(dirArr[counter]);
    counter++;
  }
  console.log("number of data in the array " + counter);
  
  //transfer one by one
  for(let i = 0; i < counter; i++){
    filename = dirArr[i]; 
    //console.log(filename + " is going to be transfered");     //test code
    let jsonData = fs.readFileSync(filename, "json");
    const data = {
      hrtime: jsonData.hrtime,
      strtime: jsonData.strtime,
      strLv: jsonData.strLv
    }
    //send message
    if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
       messaging.peerSocket.send(data);
       console.log("try to send " + filename);
       fs.unlinkSync(filename);
       console.log(filename + " has been deleted")
    }else{
      console.log("connection failed");   
    }
  }


}


/**
this function enables sleep functionality for transfer of files
@param ms:int
*/
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}


//Set the interval for queueing file,
//setInterval(transferFile, 1000*60);


/**
If device gets messages from companion successfully transferred files to the Internet,
it deletes the file in accordance with the flags sent from companion
1 => hrm.cbor
2 => str.cbor
messaging.peerSocket.addEventListener("message", (evt) => {
  var files = searchFiles();
  var filename = files[0];
  console.log(filename)
  //fs.unlinkSync(filename);
  //console.log(filename + "has deleted.");
});
*/

