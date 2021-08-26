import './b.js';

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    console.log(newModule);
  });
}