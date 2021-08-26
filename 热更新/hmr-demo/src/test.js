// import { a } from './test.js';

let inputVal = '';

function app(){
  document.body.innerHTML=`
  <h1>this is test s a</h1>
  <input />
  `;
  setTimeout(() => {
    document.querySelector('input').oninput = () => {
      inputVal = document.querySelector('input').value;
    };
  });
}

export function setVal (val) {
  inputVal = val;
  document.querySelector('input').value = val;
}

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    newModule.setVal(inputVal);
  });
}

app();
