function debounce(func, ms) {
  let timeoutId = null;

  function wrapper(...args) {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func(...args);
    }, ms);
  }
  return wrapper;
}

function throttle(func, ms) {
  let thisSaved = null;
  let thisArg = null;
  let timeoutId = null;
  function wrapper(...args) {
    if (!timeoutId) {
      timeoutId = setTimeout(() => {
        func.apply(thisArg, args);
        timeoutId = null;
        if (thisSaved) {
          wrapper.apply(thisArg, thisSaved);
          thisSaved = null;
          thisArg = null;
        }
      }, ms);
    } else {
      thisSaved = args;
      thisArg = this;
    }
  }
  return wrapper;
}
