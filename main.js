const STATES = { WORKING: 'WORKING', RESTING: 'RESTING' }

const FPS = 30

// defaults
const data = {
  state: STATES.WORKING,
  startTime: Date.now(),
  workMins: 25,
  restMins: 5,
}

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
    this.switchState(STATES.WORKING)
  },
  switchState(newState) {
    if (newState === STATES.WORKING) {
      this.workClock.style.opacity = 1;
      this.restClock.style.opacity = 0;
      this.restClock.style.strokeDashoffset = this.circumference
    } else if (newState === STATES.RESTING) {
      this.workClock.style.opacity = 0;
      this.restClock.style.opacity = 1;
    }
  },
  update(state, completionRate) {
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

  update({state, startTime, workMins, restMins}) {
    // calculate how much time's passed since timer's start
    const timePassed = (Date.now() - startTime)
    const workTime = workMins * 60 * 1000
    const restTime = restMins * 60 * 1000
    const cycleTime = workTime + restTime
    const timeThisCycle = timePassed % cycleTime
    // if the time since last cycle is less than work time,
    // we are in working state.
    // otherwise, resting state.

    // TODO revise this part of logic
    // to separate data modification from view update.
    // view should only get info from data,
    // not write to it.
    let timeRemain;
    let timeRemainRate;
    if (timeThisCycle < workTime) {
      data.state = STATES.WORKING
      timeRemain = workTime - timeThisCycle
      timeRemainRate = timeRemain / workTime
    } else {
      data.state = STATES.RESTING
      timeRemain = cycleTime - timeThisCycle
      timeRemainRate = timeRemain / restTime
    }
    const minutes = Math.floor(timeRemain / 60 / 1000)
    const seconds = Math.floor((timeRemain / 1000) % 60)
    const timeDisplay = `${leftPadTime(minutes)}:${leftPadTime(seconds)}`
    this.timeDisplay.innerText = timeDisplay
    this.stateDisplay.innerText = data.state
    document.title = `${timeDisplay} - ${data.state}`

    const completionRate = 1 - timeRemainRate
    clockFace.update(data.state, completionRate)

    // detect if state has changed on this update loop
    if (state === data.state) return;
    // switch out which clock to display
    clockFace.switchState(data.state);
    // play the corresponding sound
    if (data.state === STATES.WORKING) this.workAudio.play();
    else if (data.state === STATES.RESTING) this.restAudio.play();
  }
}

clockFace.initialize();

setInterval(() => {view.update(data)}, FPS)