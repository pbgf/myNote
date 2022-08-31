import { useState } from 'react';
import { composeContainer } from './util';

function useCounter(initialState = 0) {
  console.log('useCounter');
  const [count, setCount] = useState(initialState)
  const decrement = () => setCount(count - 1)
  const increment = () => setCount(count + 1)
  return { count, decrement, increment }
}

function useAnotherCounter(initialState = 0) {
  console.log('useAnotherCounter');
  const [count, setCount] = useState(initialState)
  const decrement = () => setCount(count - 1)
  const increment = () => setCount(count + 1)
  return { count, decrement, increment }
}

const { Provider, containers } = composeContainer({
  useCounter,
  useAnotherCounter
})
export { Provider, containers }