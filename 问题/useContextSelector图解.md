## 背景

react本身暂时不会支持响应式(signal)，本身react团队也不觉得响应式是合适的书写ui的方式。但是社区里有很多库用到了响应式的思想，框架层面：solid.js、状态管理库：redux的useSelector、heluxjs的signal等。响应式一大优点是提升了性能，今天从一个简单的开源库入手来学习下其思想。

## use-context-selector

[源码地址](https://github.com/dai-shi/use-context-selector/blob/HEAD/src/index.ts)

use-context-selector是一个很简单的库，核心代码300行，解决了react中useContext的性能问题

### context的性能问题

context中如果存储了两个变量：a和b，在A组件中通过useContext使用了a变量，在B组件中通过useContext使用了b变量。那么如果现在我修改了变量b，理想中的情况应该是只更新B组件，但实际上只要Context有更新，所有用到了的组件都会更新，在上面的场景中实际上A、B组件都会重新渲染。这就是Context的问题。

### use-context-selector的实现细节
use-context-selector实现响应式的核心思路是发布订阅模式。
#### 订阅
首先是订阅，在useContextSelector的源码中(下面会省略部分非关键代码)：
```javascript
export function useContextSelector<Value, Selected>(
  context: Context<Value>,
  selector: (value: Value) => Selected,
) {
  // useContextOrig = React.useContext
  // 这里是从context中获取值
  const contextValue = useContextOrig(
    context as unknown as ContextOrig<ContextValue<Value>>,
  )[CONTEXT_VALUE];
  if (typeof process === 'object' && process.env.NODE_ENV !== 'production') {
    if (!contextValue) {
      throw new Error('useContextSelector requires special context');
    }
  }
  const {
    /* "v"alue     */ v: { current: value },
    /* versio"n"   */ n: { current: version },
    /* "l"isteners */ l: listeners,
  } = contextValue;
  // 通过selector函数 返回具体的值
  const selected = selector(value);
  // 这里先不用关注useReducer里的函数，只需要知道这里会返回 [value, selected] 和 dispatch函数
  const [state, dispatch] = useReducer(() => {/*...稍后讲...*/}, [value, selected] );
  // 注册 监听器函数——dispatch，如果后续函数被触发 将会进入reducer函数
  // useIsomorphicLayoutEffect 在非ssr环境中等于 useLayoutEffect
  useIsomorphicLayoutEffect(() => {
    listeners.add(dispatch);
    return () => {
      listeners.delete(dispatch);
    };
  }, [listeners]);
  // 返回selected
  return state[1];
}
```
其实useContextSelector比较重要的就两件事，一个是通过useReducer返回状态变量和dispatch函数，然后把dispatch函数注册到监听器函数中，等后续进行通知。

#### 发布
在use-context-selector中，承担发布的角色是Provider，我们来看下下面的createProvider函数
```javascript
const createProvider = <Value>(
  ProviderOrig: Provider<ContextValue<Value>>,
) => {
  const ContextProvider = ({ value, children }: { value: Value; children: ReactNode }) => {
    const valueRef = useRef(value);
    const versionRef = useRef(0);

    const contextValue = useRef<ContextValue<Value>>();
    if (!contextValue.current) {
      // 监听器初始化
      const listeners = new Set<Listener<Value>>();
      const update = (thunk: () => void, options?: { suspense: boolean }) => {
        // 暂时不需要关心，update是为了支持react18的并发特性
      };
      contextValue.current = {
        [CONTEXT_VALUE]: {
          /* "v"alue     */ v: valueRef,
          /* versio"n"   */ n: versionRef,
          /* "l"isteners */ l: listeners,
          /* "u"pdate    */ u: update,
        },
      };
    }
    useIsomorphicLayoutEffect(() => {
      // 更新值
      valueRef.current = value;
      // 版本+1
      versionRef.current += 1;
      // runWithNormalPriority为react库中scheduler导出的方法
      // 这里可以理解为 函数里的更新任务(setState、dispatch等)会被以普通的优先级添加到 react的scheduler队列中
      runWithNormalPriority(() => {
        (contextValue.current as ContextValue<Value>)[CONTEXT_VALUE].l.forEach((listener) => {
          // 这里实际是dispatch({ n: versionRef.current, v: value }), 传入了新的版本和值
          listener({ n: versionRef.current, v: value });
        });
      });
    }, [value]);
    // 创建dom
    return createElement(ProviderOrig, { value: contextValue.current }, children);
  };
  return ContextProvider;
};
```
我们可以看到在自定义的provider组件中，每次value发生变化 都会去发布通知 监听器 执行订阅的回调函数，而这里的回调函数就是dispatch。
这时候我们再来看看reducer函数，即dispatch一个action后，它会怎么解析
#### reducer
```javascript
const [state, dispatch] = useReducer((
  prev: readonly [Value, Selected],
  action?: Parameters<Listener<Value>>[0],
) => {
  // 没有action，直接返回当前的值
  if (!action) {
    // case for `dispatch()` below
    return [value, selected] as const;
  }
  // 如果版本没有更新
  if (action.n === version) {
    // 且值没有变化，返回旧值，组件不会rerender
    if (Object.is(prev[1], selected)) {
      return prev; // bail out
    }
    // 返回当前的值
    return [value, selected] as const;
  }
  try {
    // action带有value
    if ('v' in action) {
      // value 没有变化返回旧值
      if (Object.is(prev[0], action.v)) {
        return prev; // do not update
      }
      // selected的值没有变化 返回旧值
      const nextSelected = selector(action.v);
      if (Object.is(prev[1], nextSelected)) {
        return prev; // do not update
      }
      // 返回新的值 rerender
      return [action.v, nextSelected] as const;
    }
  } catch (e) {
    // ignored (stale props or some other reason)
  }
  return [...prev] as const; // schedule update
}, [value, selected] as const);
```
至此，我们已经阅读完了use-context-selector的核心代码。整体来看还是比较简单的，通过封装useSelector实现注册订阅函数，通过封装Provider，再每次value更新时，去触发订阅函数，订阅函数通过Object.is判断前后selected是否一致，不一致则更新，一致则保持不变。下面是整体的流程图，比较简单：
![Alt text](assets/useSelector%E5%9B%BE%E8%A7%A3.png)

## 总结
前面我们通过阅读use-context-selector的核心代码了解了它是如何通过发布订阅模式来实现响应式的(严格来说，其实不太算响应式，但它在某种程度上体现了响应式编程的一些特点：1、状态与 UI 的自动同步。2、选择性订阅)。虽然它不具备响应式编程的所有特点，但是它有响应式编程的一些影子。本篇文章作为探寻响应式编程思想的一个开头(希望后续有时间继续完善)，探寻响应式原理在各个方面的应用和实现，如框架:vue.js、solid.js，状态管理：mobx，库：RxJs等，探寻其中的共同点和差异以及背后的响应式原理的具体应用。希望后续在遇到context类似的场景时，我能想到用响应式思想来解决问题，而不是由别人来告诉我。