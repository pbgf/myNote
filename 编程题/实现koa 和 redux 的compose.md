koa compose 简易版
递归版本
```javascript
const middleware = []
let mw1 = function (next) {
    console.log("next前，第一个中间件")
    next()
    console.log("next后，第一个中间件")
}
let mw2 = function (next) {
    console.log("next前，第二个中间件")
    next()
    console.log("next后，第二个中间件")
}
let mw3 = function (next) {
    console.log("第三个中间件，没有next了")
}

function use(mw) {
  middleware.push(mw);
}

function compose(middleware) {
  function dispatch(index) {
    const current = middleware[index];
    if (!current) return;
    return () => current(dispatch(index + 1))
  }
 return dispatch(0)
}

use(mw1);
use(mw2);
use(mw3);

const fn = compose(middleware);
fn()
```
reduce版本：
我们需要实现的核心点是next函数，在简易版本中next函数的返回不重要，重要的是 next函数 `需要执行下一个函数`，所以有这样的结构体
```javascript
() => nextMw()
```
ok，但是nextMw是不是也得有next
```javascript
() => nextMw(next)
```
那么，现在问题是next函数从哪来，怎么构造。假设我们有如下数组：
1 -> 2 -> 3 -> 4
一般我们是从左往右遍历，mw执行顺序也是，那么为了构建 1(2(3(4))),我们可以`从里向外`构建，即从右向左遍历—— reduceRight，所以我们有了如下代码
```javascript
const middleware = [];
let mw1 = function(next) {
  console.log("next前，第一个中间件");
  next();
  console.log("next后，第一个中间件");
};
let mw2 = function(next) {
  console.log("next前，第二个中间件");
  next();
  console.log("next后，第二个中间件");
};
let mw3 = function(next) {
  console.log("第三个中间件，没有next了");
    next();
    console.log("第三个中间件???");
};
let mw4 = function(next) {
  console.log("第4个中间件，没有next了");
};

function use(mw) {
  middleware.push(mw);
}

function compose(middleware) {
  // 使用 reduce 从右到左组合中间件 1(2(3(4))) 推导出 (next, mw) => () => mw(next)
  const finalDispatch = middleware.reduceRight((next, mw) => () => mw(next));

  return finalDispatch;
}

use(mw1);
use(mw2);
use(mw3);
use(mw4);

const fn = compose(middleware);
fn();
```
redux的compose简易版
```javascript
// (x) => fn1(fn2(fn3(fn4(x)))) 推导出 list.reduce((acc, fn) => (x) => acc(fn(x)))
function fn1(x) {
  return x + 1;
}
function fn2(x) {
  return x + 2;
}
function fn3(x) {
  return x + 3;
}
function fn4(x) {
  return x + 4;
}
const a = compose(fn1, fn2, fn3, fn4);
console.log(a(1)); // 1+4+3+2+1=11
```