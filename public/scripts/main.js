const amongUs = document.getElementById('among-us');
const timer = document.querySelector('.timer');
const tomato = document.querySelector('#tomato');
const muteIcon = document.querySelector('#mute');
const today = document.querySelector('#today');
const interval = 200;
const pomodoroSound = new Audio('assets/be-quiet.mp3');
let mute = false;

/**
 * returns ID
 * @return {String}
 */
async function getId() {
  let id = localStorage.getItem('id');
  if (!id || id == 'undefined') {
    const res = await fetch('/api/request');
    const data = await res.json();
    localStorage.setItem('id', data.result.id);
    id = data.result.id;
  }
  return id;
}

/**
 * get or update pomodoro
 * @param {Boolean} getReward - get reward or just get score
 */
async function pomodoro(getReward) {
  const id = await getId();
  const res = await fetch(`/api/${getReward ? 'reward' : 'pomodoro'}/${id}`);
  const data = await res.json();
  if (data.code === 400 || data.code === 404) {
    localStorage.removeItem('id');
    pomodoro(getReward);
    return;
  }
  today.innerHTML = data.result.today;
}

/**
 * A simple function to display count down
 * @param {Date} end - counter end time
 * @param {Boolean} update - update pomodoro score
 */
async function countDown(end, update) {
  if (update) pomodoro();
  const delta = moment().diff(end, 'seconds');
  if (delta < 0) {
    let adjust = 0;
    if (delta >= -900) {
      if (!document.body.classList.contains('break')) {
        document.body.classList.add('break');
        document.body.classList.remove('pomodoro');
        tomato.classList.remove('hide');
      }
    } else {
      if (!document.body.classList.contains('pomodoro')) {
        pomodoroSound.muted = mute;
        if (!mute) {
          pomodoroSound.play();
        }
        amongUs.classList.remove('among-us-animation');
        void amongUs.offsetWidth;
        amongUs.classList.add('among-us-animation');
        document.body.classList.add('pomodoro');
        document.body.classList.remove('break');
        tomato.classList.add('hide');
      }
      adjust = 900;
    }
    const cd = moment.utc((Math.abs(delta) - adjust) * 1000).format('mm:ss');
    timer.innerText = cd.toString();
    setTimeout(() => countDown(end, false), interval);
  } else {
    setTimeout(() => countDown(end.add(1, 'hour'), true), interval);
  }
}

window.onload = async () => {
  try {
    const nextHour = moment().tz('Asia/Tehran').endOf('hour').add(1, 'second');
    countDown(nextHour, true);
  } catch (error) {
    console.error(error);
  };
};

tomato.onclick = async () => {
  try {
    await pomodoro(true);
    tomato.classList.add('hide');
  } catch (error) {
    console.error(error);
  }
};

muteIcon.onclick = () => {
  mute = !mute;
  muteIcon.src = `/images/${mute ? 'mute':'volume'}.svg`;
};
