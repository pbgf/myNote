import { b } from './b.js';

function app(text){
  document.body.innerHTML=`
  <h1>this is test ${text}</h1>
  `;
}


if (import.meta.hot) {
  import.meta.hot.accept('./b.js', (newModule) => {
    app(newModule.b);
  });
}

app(b);