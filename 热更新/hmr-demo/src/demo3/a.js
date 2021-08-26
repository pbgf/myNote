import { render } from './b.js';
import { name } from './c.js';

render(name);

if (import.meta.hot) {
  import.meta.hot.accept((newModule) => {
    
  });
}