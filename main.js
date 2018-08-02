const STATES = { WORKING: 'WORKING', RESTING: 'RESTING' }

const FPS = 30

// data that changes by user input
const userData = new RData({
  workMins: 0.25,
  restMins: 0.5,
  startTime: Date.now(),
})

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
})
userData.onChange('restMins', (val) => {
  lazyData.restTime = val * 60 * 1000
  lazyData.cycleTime = lazyData.workTime + lazyData.restTime
})

const renderedData = new RData({
  timeDisplay: '00:00',
  state: '',
  completionRate: 0,
})

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