import { content } from './c';

// if (import.meta.hot) {
//   import.meta.hot.accept((newModule) => {
//     console.log(newModule);
//   });
//   import.meta.hot.accept('./c.js', (newModule) => {
//     console.log(newModule);
//   });
// }
function render(){
  document.body.innerHTML=`
  <div>${content('b')}</div>
  `;
}

render();