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
    if (timeThisCycle < workTime) {
      data.state = STATES.WORKING
      timeRemain = workTime - timeThisCycle
    } else {
      data.state = STATES.RESTING
      timeRemain = cycleTime - timeThisCycle
    }
    const minutes = Math.floor(timeRemain / 60 / 1000)
    const seconds = Math.floor((timeRemain / 1000) % 60)
    const timeDisplay = `${leftPadTime(minutes)}:${leftPadTime(seconds)}`
    this.timeDisplay.innerText = timeDisplay
    this.stateDisplay.innerText = data.state
    document.title = `${timeDisplay} - ${data.state}`

    // detect if state has changed on this update loop
    // if yes, play the corresponding sound
    if (state === data.state) return;
    if (data.state === STATES.WORKING) this.workAudio.play();
    else if (data.state === STATES.RESTING) this.restAudio.play();
  }
}

setInterval(() => {view.update(data)}, FPS)