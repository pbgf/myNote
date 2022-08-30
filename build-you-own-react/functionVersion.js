/**
 * 从fiberVersion优化
 * if (fiber.parent) {
    fiber.parent.dom.appendChild(fiber.dom)
  }
  缺点是每次都会渲染不完整的dom，wipRootVersion 确保没有下一个工作单元后 再插入到dom中
 */
  let nextUnitOfWork = null
  let wipRoot = null
  let currentRoot = null
  let deletions = null
  
  function commitRoot() {
    deletions.forEach(commitWork)
    commitWork(wipRoot.child)
    currentRoot = wipRoot
    wipRoot = null
  }
  
  function commitWork(fiber) {
    if (!fiber) {
      return
    }
    let domParentFiber = fiber.parent
    while (!domParentFiber.dom) { // App这种自定义的函数组件没有实际的dom属性 需要跳过
      domParentFiber = domParentFiber.parent
    }
    const domParent = domParentFiber.dom
    if (
      fiber.effectTag === "PLACEMENT" &&
      fiber.dom != null
    ) {
      // 更新的顺序不太对,可通过insertBefore 和 sibling实现
      // domParent.appendChild(fiber.dom)
      // 改造为:
      if (fiber.sibling && domParent.contains(fiber.sibling.dom)) domParent.insertBefore(fiber.dom, fiber.sibling.dom);
      else domParent.appendChild(fiber.dom)
    } else if (
      fiber.effectTag === "UPDATE" &&
      fiber.dom != null
    ) {
      updateDom(
        fiber.dom,
        fiber.alternate.props,
        fiber.props
      )
    } else if (fiber.effectTag === "DELETION") {
      commitDeletion(fiber, domParent)
    }
    commitWork(fiber.child)
    commitWork(fiber.sibling)
  }

  function commitDeletion(fiber, domParent) {
    if (fiber.dom) {
      domParent.removeChild(fiber.dom)
    } else {
      commitDeletion(fiber.child, domParent)
    }
  }
  
  function createElement(type, props, ...children) {
    return {
      type,
      props: {
        ...props,
        children: children.map(child =>
          typeof child === "object" ? child : createTextElement(child)
        )
      }
    };
  }
  
  function createTextElement(text) {
    return {
      type: "TEXT_ELEMENT",
      props: {
        nodeValue: text,
        children: []
      }
    };
  }
  
  const isEvent = key => key.startsWith("on")
  const isProperty = key =>
    key !== "children" && !isEvent(key)
  const isNew = (prev, next) => key =>
    prev[key] !== next[key]
  const isGone = (prev, next) => key => !(key in next)
  function updateDom(dom, prevProps, nextProps) {
    //Remove old or changed event listeners
    Object.keys(prevProps)
      .filter(isEvent)
      .filter(
        key =>
          !(key in nextProps) ||
          isNew(prevProps, nextProps)(key)
      )
      .forEach(name => {
        const eventType = name
          .toLowerCase()
          .substring(2)
        dom.removeEventListener(
          eventType,
          prevProps[name]
        )
      })
    // Add event listeners
    Object.keys(nextProps)
      .filter(isEvent)
      .filter(isNew(prevProps, nextProps))
      .forEach(name => {
        const eventType = name
          .toLowerCase()
          .substring(2)
        dom.addEventListener(
          eventType,
          nextProps[name]
        )
      })
    // Remove old properties
    Object.keys(prevProps)
      .filter(isProperty)
      .filter(isGone(prevProps, nextProps))
      .forEach(name => {
        dom[name] = ""
      })
  
    // Set new or changed properties
    Object.keys(nextProps)
      .filter(isProperty)
      .filter(isNew(prevProps, nextProps))
      .forEach(name => {
        dom[name] = nextProps[name]
      })
  }
  
  function createDom(fiber) {
    const dom =
      fiber.type == "TEXT_ELEMENT"
        ? document.createTextNode("")
        : document.createElement(fiber.type)
  
    const isProperty = key => key !== "children"
    Object.keys(fiber.props)
      .filter(isProperty)
      .forEach(name => {
        dom[name] = fiber.props[name]
      })
  
    return dom
  }
  
  function render(element, container) {
    wipRoot = {
      dom: container,
      props: {
        children: [element],
      },
      alternate: currentRoot,
    }
    deletions = [];
    nextUnitOfWork = wipRoot
  }
  
  function workLoop(deadline) {
    let shouldYield = false
    while (nextUnitOfWork && !shouldYield) {
      nextUnitOfWork = performUnitOfWork(
        nextUnitOfWork
      )
      shouldYield = deadline.timeRemaining() < 1
    }
  
    if (!nextUnitOfWork && wipRoot) {
      commitRoot()
    }
  
    requestIdleCallback(workLoop)
  }
  
  function performUnitOfWork(fiber) {
    console.log('fiber', fiber);
    const isFunctionComponent = fiber.type instanceof Function
    if (isFunctionComponent) {
      updateFunctionComponent(fiber)
    } else {
      updateHostComponent(fiber)
    }
  
    if (fiber.child) {
      return fiber.child
    }
    let nextFiber = fiber
    while (nextFiber) {
      if (nextFiber.sibling) {
        return nextFiber.sibling
      }
      nextFiber = nextFiber.parent
    }
  }

  function updateFunctionComponent(fiber) {
    const children = [fiber.type(fiber.props)]
    reconcileChildren(fiber, children)
  }

  function updateHostComponent(fiber) {
    if (!fiber.dom) {
      fiber.dom = createDom(fiber)
    }
    reconcileChildren(fiber, fiber.props.children)
  }

  function reconcileChildren(wipFiber, elements) {
    let index = 0
    let oldFiber =
      wipFiber.alternate && wipFiber.alternate.child
    let prevSibling = null
    while (index < elements.length || oldFiber != null) {
      const element = elements[index]
  
      let newFiber = null
  
      const sameType =
        oldFiber &&
        element &&
        element.type == oldFiber.type
  
      if (sameType) {
        // update the node
        newFiber = {
          type: oldFiber.type,
          props: element.props,
          dom: oldFiber.dom,
          parent: wipFiber,
          alternate: oldFiber,
          effectTag: "UPDATE",
        }
      }
      if (element && !sameType) {
        // add this node
        newFiber = {
          type: element.type,
          props: element.props,
          dom: null,
          parent: wipFiber,
          alternate: null,
          effectTag: "PLACEMENT",
        }
      }
      if (oldFiber && !sameType) {
        // delete the oldFiber's node
        oldFiber.effectTag = "DELETION"
        deletions.push(oldFiber)
      }
  
      if (oldFiber) {
        oldFiber = oldFiber.sibling
      }
  
      if (index === 0) {
        wipFiber.child = newFiber
      } else {
        prevSibling.sibling = newFiber
      }
  
      prevSibling = newFiber
      index++
    }
  }
  
const Didact = {
  createElement,
  render
};
/** @jsx Didact.createElement */
function App(props) {
  return <h1>Hi {props.name}</h1>
}
const element = <App name="hyq" />
const container = document.getElementById("root")
Didact.render(element, container)
requestIdleCallback(workLoop)
