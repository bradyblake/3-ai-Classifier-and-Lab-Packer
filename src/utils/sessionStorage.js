export const saveSessionToLocal = (data) => {
  try {
    localStorage.setItem('app_session', JSON.stringify(data));
  } catch (err) {
    console.error("Session save failed:", err);
  }
};

export const loadSessionFromLocal = () => {
  try {
    return JSON.parse(localStorage.getItem('app_session'));
  } catch (err) {
    console.error("Session load failed:", err);
    return null;
  }
};