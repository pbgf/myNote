```javascript
import { render } from "react-dom";

const memoState = [];
let index = 0;
function useMyState(initialState) {
  let id = useMyState.id;
  if (id === undefined) {
    id = useMyState.id = index++;
    memoState[id] = [initialState, setState];
  }
  function setState(val) {
    if (typeof val === "function") {
      memoState[id] = [val(memoState[id][0]), setState];
    }
    memoState[id] = [val, setState];
    renderApp();
  };
  return memoState[id];
}

function App() {
  const [state, setState] = useMyState(0);

  const handle = () => {
    setState(state + 1);
  };

  return (
    <>
      <div>{state}</div>
      <button onClick={handle}>button</button>
    </>
  );
}


function renderApp() {
    const rootElement = document.getElementById("root");
    render(<App />, rootElement);
}

renderApp();

```