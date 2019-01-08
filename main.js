const STATES = { WORKING: 'WORKING', RESTING: 'RESTING' }

const FPS = 30

// data that changes by user input
const userData = new RData({
  workMins: 25,
  restMins: 5,
  startTime: Date.now(),
})

// calculate share hash
function encodeHash(w, r, s) { return `${w}:${r}:${s}` }
function encodeUserHash() { return encodeHash(userData.workMins, userData.restMins, userData.startTime) }
// decodes a share hash.
// returns array containing [workMins, restMins, and startTime]
function decodeHash(hashValue) {
  if (!hashValue.length) throw new Error('Empty hash ' + hashValue)
  let parsingHash = hashValue
  if (parsingHash[0] === '#') parsingHash = hashValue.substring(1)
  const parts = parsingHash.split(':')
  if (parts.length !== 3) throw new Error('Not a valid hash: ' + hashValue)
  return parts
}

try {
  const parts = decodeHash(location.hash)
  userData.workMins = parts[0]
  userData.restMins = parts[1]
  userData.startTime = parts[2]
} catch (error) { console.info('No valid hash found. Using default cycle value.') }

// data computed from userData,
// and only has to change when userData changes
const lazyData = new RData({
  workTime: userData.workMins * 60 * 1000,
  restTime: userData.restMins * 60 * 1000,
})
lazyData.register('cycleTime', (lazyData.workTime + lazyData.restTime))

userData.onChange('workMins', (val) => {
  lazyData.workTime = val * 60 * 1000
  lazyData.cycleTime = lazyData.workTime + lazyData.restTime
  renderedData.hash = encodeUserHash()
})
userData.onChange('restMins', (val) => {
  lazyData.restTime = val * 60 * 1000
  lazyData.cycleTime = lazyData.workTime + lazyData.restTime
  renderedData.hash = encodeUserHash()
})
userData.onChange('startTime', (val) => {
  renderedData.hash = encodeUserHash()
})

const renderedData = new RData({
  timeDisplay: '00:00',
  state: '',
  completionRate: 0,
  hash: encodeUserHash(),
})

// set up inputs to modify data
const shareUrl = document.querySelector('.shareUrl')
shareUrl.value = location.origin + location.pathname + '#' + renderedData.hash
renderedData.onChange('hash', (val) => {
  location.hash = val
  shareUrl.value = location.origin + location.pathname + '#' + renderedData.hash
})

const btnRestartWork = document.querySelector('.btnRestartWork')
const btnRestartRest = document.querySelector('.btnRestartRest')
btnRestartWork.addEventListener('click', () => { userData.startTime = Date.now() })
btnRestartRest.addEventListener('click', () => {
  userData.startTime = Date.now() - (userData.workMins * 60 * 1000)
})

const inputWorkMins = document.querySelector('.inputWorkMins')
const inputRestMins = document.querySelector('.inputRestMins')
inputWorkMins.value = userData.workMins
inputRestMins.value = userData.restMins
inputWorkMins.addEventListener('change', () => { userData.workMins = inputWorkMins.value })
inputRestMins.addEventListener('change', () => { userData.restMins = inputRestMins.value })

/**
 * Pads the time display with extra zero, if needed.
 * Suitable for second, minute, or hour.
 * @param {Number|String} number 
 */
function leftPadTime(number) {
  const stringified = String(number)
  if (stringified.length > 1) return stringified
  return `0${stringified}`
}

const clockFace = {
  workClock: document.querySelector('.workClock'),
  restClock: document.querySelector('.restClock'),
  radius: undefined,
  circumference: undefined,
  initialize() {
    this.radius = this.workClock.getAttribute('r')
    this.circumference = this.radius * 2 * Math.PI
    this.workClock.style.strokeDasharray = this.circumference
    this.restClock.style.strokeDasharray = this.circumference
  },
  switchState(newState) {
    if (newState === STATES.WORKING) {
      this.workClock.style.opacity = 1
      this.restClock.style.opacity = 0
      this.restClock.style.strokeDashoffset = this.circumference
    } else if (newState === STATES.RESTING) {
      this.workClock.style.opacity = 0
      this.restClock.style.opacity = 1
    }
  },
  updateRing(state, completionRate) {
    if (state === STATES.WORKING) {
      this.workClock.style.strokeDashoffset = completionRate * this.circumference
    } else if (state === STATES.RESTING) {
      this.restClock.style.strokeDashoffset = (completionRate + 1) * this.circumference
    }
  }
}

const view = {
  timeDisplay: document.querySelector('.timeDisplay'),
  stateDisplay: document.querySelector('.stateDisplay'),

  workAudio: document.querySelector('.workAudio'),
  restAudio: document.querySelector('.restAudio'),

  playStateSwitchSound(newState) {
    if (newState === STATES.WORKING) this.workAudio.play()
    else if (newState === STATES.RESTING) this.restAudio.play()
  },
  updateTimeDisplay(display) {
    this.timeDisplay.innerText = display
  },
  updateStateDisplay(text) {
    this.stateDisplay.innerText = text
  },
  updateTitle(time, state) {
    document.title = `${time} - ${state}`
  },
}

renderedData.onChange('timeDisplay', (val) => {
  view.updateTimeDisplay(val)
  view.updateTitle(val, renderedData.state)
})
renderedData.onChange('state', (val) => {
  view.updateStateDisplay(val)
  view.updateTitle(renderedData.timeDisplay, val)
  view.playStateSwitchSound(val)

  clockFace.switchState(val)
  clockFace.updateRing(val, renderedData.completionRate)
})
renderedData.onChange('completionRate', (val) => {
  clockFace.updateRing(renderedData.state, val)
})


function loop() {
  // calculate how much time's passed since timer's start
  const timePassed = (Date.now() - userData.startTime)
  const timeThisCycle = timePassed % lazyData.cycleTime
  // if the time since last cycle is less than work time,
  // we are in working state.
  // otherwise, resting state.
  let timeRemain
  let timeRemainRate
  if (timeThisCycle < lazyData.workTime) {
    renderedData.state = STATES.WORKING
    timeRemain = lazyData.workTime - timeThisCycle
    timeRemainRate = timeRemain / lazyData.workTime
  } else {
    renderedData.state = STATES.RESTING
    timeRemain = lazyData.cycleTime - timeThisCycle
    timeRemainRate = timeRemain / lazyData.restTime
  }
  renderedData.completionRate = 1 - timeRemainRate
  
  const minutes = Math.floor(timeRemain / 60 / 1000)
  const seconds = Math.floor((timeRemain / 1000) % 60)
  renderedData.timeDisplay = `${leftPadTime(minutes)}:${leftPadTime(seconds)}`
}

clockFace.initialize()

setInterval(loop, 1000 / FPS)


// toggle About section
const toggleAbout = document.querySelector('.toggleAbout')
const aboutSection = document.querySelector('.infoContainer')
let isAboutActive = false
toggleAbout.addEventListener('click', () => {
  if (!isAboutActive) {
    aboutSection.classList.add('active')
    toggleAbout.classList.add('active')
  } else {
    aboutSection.classList.remove('active')
    toggleAbout.classList.remove('active')
  }
  isAboutActive = !isAboutActive
})