import { Provider as Global, containers } from './store'

export default function renderApp () {
    const AppInstance = (
        <Global>
            <App />
        </Global>
    )
    return AppInstance;
}

function App () {
  const { count, increment } = containers.useCounter();
  const { count: count2, increment: increment2 } = containers.useAnotherCounter();
  return (
      <>
        <div>{count}</div>
        <button onClick={() => {
          increment();
        }}>+</button>
        <div>{count2}</div>
        <button onClick={() => {
          increment2();
        }}>+</button>
      </>
  )
}