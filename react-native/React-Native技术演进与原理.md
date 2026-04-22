# React Native 技术演进与原理

> 整理自学习会话，涵盖 React Native 从诞生到新架构的技术演进、核心原理，以及与 Lynx、Mach Pro 等框架的对比。

---

## 目录

1. [React 与 React Native 的关系](#1-react-与-react-native-的关系)
2. [React Native 技术演进](#2-react-native-技术演进)
3. [核心技术原理](#3-核心技术原理)
4. [JS 引擎对比](#4-js-引擎对比)
5. [JIT 即时编译](#5-jit-即时编译)
6. [线程模型](#6-线程模型)
7. [渲染架构深入](#7-渲染架构深入)
8. [框架横向对比](#8-框架横向对比)

---

## 1. React 与 React Native 的关系

### React Fiber（2017年）

React 16.0 正式引入 Fiber 架构，研发从 2016 年初开始，历时约两年。

**解决的核心问题**：旧架构（Stack Reconciler）的 reconciliation 过程是同步且不可中断的，递归地一口气走完整棵组件树的 diff，期间完全占用主线程，可能持续几十甚至上百毫秒，导致浏览器无法响应用户输入、动画掉帧。

**Fiber 的解法**：把 reconciliation 拆成一个个小的工作单元（fiber node），每个单元执行完后可以把控制权交还给浏览器，让浏览器处理更高优先级的任务，之后再继续未完成的工作——即**可中断、可恢复的异步渲染**。

> 注意：Fiber 架构在 React 16 发布时，并发模式（Concurrent Mode）并没有默认开启。真正的异步调度能力要到 React 18（2022年）的 `createRoot` 才对外开放。

### React Hook（2019年，React 16.8）

Hook 和 Fiber 解决的是两个不同层面的问题：

- **Fiber** 解决"怎么渲染"——调度和执行层面
- **Hook** 解决"怎么写组件"——开发模式层面

**Hook 的实现依赖 Fiber**：每个组件对应一个 fiber node，fiber node 上有一个 `memoizedState` 链表，Hook 的状态就存在这个链表里。这也是为什么 Hook 不能放在条件语句里——顺序一旦变了，链表对应关系就乱了。

**Hook 真正要解决的是 Class 组件的痛点**：

- 逻辑复用困难：HOC 和 render props 造成"wrapper hell"
- 生命周期导致逻辑碎片化：同一功能的代码被拆散到 `componentDidMount`、`componentDidUpdate`、`componentWillUnmount` 三个地方
- `this` 的心智负担

### 为什么需要 useEffect

React 的组件函数本质上应该是纯函数，但现实中不可避免地需要做"不纯"的事情（请求数据、订阅事件、操作 DOM 等）。`useEffect` 的设计有三层含义：

1. **时机保证**：副作用在渲染提交后执行，不干扰渲染过程本身
2. **依赖声明**：通过依赖数组显式声明依赖，React 据此决定是否重新执行
3. **清理机制**：返回函数声明如何清理上一次副作用，避免内存泄漏和重复订阅

在 Fiber 并发模式下，组件函数可能被多次调用（中断后重新开始），如果副作用写在函数体里会触发多次，`useEffect` 保证副作用只在渲染结果真正提交到 DOM 之后才执行。

---

## 2. React Native 技术演进

### 诞生背景（2015年）

Facebook 将 React 的声明式 UI 思路搬到移动端，核心理念是 **"Learn once, write anywhere"**——用同一套思维模型（组件、状态、单向数据流）来写 iOS 和 Android。

### 初代架构：Bridge 架构

三层结构：

```
JS 线程  →  Bridge（异步消息队列，JSON 序列化）  →  原生 UI 线程
```

**核心问题**：
- Bridge 是异步的，JS 无法同步等待原生返回值
- JSON 序列化/反序列化有 CPU 开销
- 手势处理延迟，快速滑动时出现白屏或卡顿
- 无法做同步的布局测量

### 中期改良（2018-2019年）

**JSI（JavaScript Interface）** 被引入，这是整个新架构的基础。JSI 是一个轻量的 C++ 层，让 JS 引擎可以直接持有 C++ 对象的引用，完全绕过 Bridge 的异步序列化机制，实现 JS 和原生之间的同步直接调用。

**Hermes** 引擎发布（2019年），专门为 React Native 移动端优化，支持构建期预编译字节码（AOT），大幅提升启动速度。

### 新架构（2022年正式推出）

新架构由三个核心部分组成：

| 组件 | 作用 | 替代旧的 |
|---|---|---|
| **JSI** | 新的通信基础层，JS 与 C++ 直接互调 | Bridge |
| **Fabric** | 新的 UI 渲染器，C++ 重写 Shadow Tree | UIManager |
| **TurboModules** | 新的原生模块系统，按需懒加载 | NativeModules |
| **CodeGen** | 根据 TS/Flow 类型定义自动生成 C++ 胶水代码 | 手写胶水代码 |

> Hermes 严格来说不属于新架构的一部分，它是独立演进的 JS 引擎，在旧架构时代就已引入。

**新架构 vs Fiber 的对比**：
- React Fiber 主要解决**调度问题**（可中断渲染、优先级）
- React Native 新架构主要解决**跨线程通信问题**（同步直连替代异步 Bridge）

### JS 引擎演进

React Native 官方引擎演进路线：**JavaScriptCore（JSC）→ Hermes**，V8 从来不在官方路线上。

选择 JSC 的原因：iOS 系统内置，不需要额外打包；Android 上打包 JSC 保证两端一致。

没选 V8 的原因：iOS 苹果沙箱限制第三方引擎不能使用 JIT，V8 失去 JIT 优势后体积大、收益小。

---

## 3. 核心技术原理

### JSI 的核心原理

JSI 的本质是**在 JS 引擎和 C++ 之间建立直接的对象引用和函数调用机制**，让两侧可以像调用本地函数一样互相调用。

**关键概念**：

- **HostObject**：C++ 对象实现 `HostObject` 接口后被包装成 JS 对象，JS 访问其属性时实际调用 C++ 的 `get`/`set` 方法
- **HostFunction**：C++ 函数被包装成 JS 函数，JS 调用时直接跳转执行 C++ 代码，参数通过 JSI 的 `Value` 类型传递，无需序列化

```cpp
// C++ 侧注册函数给 JS 调用
auto add = Function::createFromHostFunction(
  runtime,
  PropNameID::forAscii(runtime, "add"),
  2,
  [](Runtime &rt, const Value &thisVal, const Value *args, size_t count) {
    double a = args[0].getNumber();
    double b = args[1].getNumber();
    return Value(a + b);  // 同步返回，无序列化
  }
);
```

```js
// JS 侧同步调用，直接拿到结果
const result = add(1, 2)  // 3
```

**内存协调**：JSI 通过引用计数解决 JS GC 和 C++ 内存管理的协调问题，C++ 持有 JS 对象时通过 JSI 的包装类型持有，析构时通知 JS 引擎减少引用计数。

**JSI 带来的价值**：
- Fabric 和 TurboModules 的实现基础
- 引擎可替换性：React Native 可以在不改上层代码的情况下换掉底层 JS 引擎

---

## 4. JS 引擎对比

### JavaScriptCore vs Hermes

| | JSC | Hermes |
|---|---|---|
| JIT | 有（iOS 系统特权） | 无 |
| 构建期预编译字节码 | 无 | 有 |
| 启动速度 | 慢（设备上编译） | 快 |
| 内存占用 | 较高 | 较低 |
| App 体积增量 | iOS 零 / Android 较大 | 较小 |
| ES 标准支持 | 完整及时 | 早期不完整 |
| 设计目标 | 浏览器通用场景 | 移动端 App 专用 |

iOS 也换成 Hermes 的原因：两端引擎一致，行为一致，排查问题更简单；构建期预编译的启动速度收益在 iOS 上同样存在。

### Hermes vs QuickJS

| | Hermes | QuickJS |
|---|---|---|
| 字节码生成时机 | 构建期（AOT） | 运行时 |
| JIT | 无 | 无 |
| 启动速度 | 最快 | 中 |
| 体积 | 较大，与 RN 深度绑定 | 极小，易嵌入 |
| ES 标准支持 | 早期不完整 | 完整 |
| 设计目标 | React Native 移动端专用 | 通用嵌入式引擎 |

**关键区别**：Hermes 在**构建期**把 JS 编译成字节码打包进 App，设备启动时直接加载字节码，跳过解析和编译阶段。QuickJS 在**运行时**在设备上编译字节码。

> QuickJS 也支持通过 `qjsc` 工具做构建期预编译，但字节码格式没有稳定性承诺，且没有与构建工具链的深度集成，工程化程度不如 Hermes。

### V8 引擎

V8 不是"直接解释 JS 源码"的，它同样会先把 JS 编译成字节码（由 Ignition 解释器完成），然后解释执行，同时对热点代码触发 JIT 编译成机器码。

V8 的多层编译架构：

```
JS 源码
  → [Ignition] 编译字节码 + 解释执行 + 收集类型反馈
  → [Sparkplug] 快速基线编译（无深度优化）
  → [Maglev] 中级优化编译
  → [TurboFan] 深度优化编译 → 机器码
```

---

## 5. JIT 即时编译

### 基本原理

JIT 介于 AOT（提前编译）和纯解释执行之间，核心思想：**先解释执行，发现热点代码后编译成机器码**。

**监控阶段**：给每个函数、每个循环打计数器，记录执行次数，频繁执行的代码称为**热点代码（Hot Code）**。

**编译阶段**：执行次数超过阈值时，JIT 编译器把这段代码编译成针对当前平台优化的机器码，缓存起来，后续调用直接运行机器码。

### 投机优化与去优化

JS 是动态类型语言，JIT 通过**在运行时观察实际类型**做出假设，生成针对该假设的优化机器码，这叫**投机优化（Speculative Optimization）**。

假设失效时触发**去优化（Deoptimization）**，退回解释执行模式重新观察。

这也是 JS 性能优化的一条经验：**保持函数参数类型稳定**，避免频繁触发去优化。

### JIT 的代价

- **内存开销**：编译生成的机器码和类型反馈信息需要存在内存里
- **编译耗时**：JIT 编译发生在运行时，本身会短暂占用 CPU
- **预热时间**：程序刚启动时代码还没跑热，JIT 还没介入

这就是 Hermes 和 QuickJS 都选择不做 JIT 的原因——移动端内存紧张，App 的 JS 逻辑跑不热，JIT 的收益覆盖不了成本。

---

## 6. 线程模型

### React Native 的线程模型

**旧架构（三条线程）**：

- **JS 线程**：运行所有 JS 代码，包括业务逻辑和 React reconciliation
- **原生 UI 线程（Main Thread）**：原生组件渲染和用户交互事件接收
- **Shadow 线程**：Yoga 布局计算

三条线程之间通过 Bridge 异步通信，是旧架构性能问题的根源。

**新架构的变化**：

- Shadow Tree 用 C++ 重写，通过 JSI 暴露给 JS，JS 可以**同步**访问布局信息
- TurboModules 通过 JSI 实现**可同步**的原生模块调用
- 引入 Worklet 机制，可以把 JS 逻辑直接在 UI 线程上同步执行

**各通信路径的同步性**：

| 通信路径 | 旧架构 | 新架构 |
|---|---|---|
| JS → UI 线程（渲染） | 异步（Bridge） | 异步（设计如此，避免死锁） |
| JS → Shadow Tree（布局） | 异步（Bridge） | **同步（JSI）** |
| JS → TurboModules | 异步（Bridge） | **可同步（JSI）** |
| JS → UI 线程（Worklet） | 不支持 | **同步（同线程）** |

> JSI 的价值不是把所有通信都变成同步，而是**把同步通信变成可能**，让框架在需要同步的地方做到同步，在不需要的地方依然保持异步以避免阻塞。

**关于 TurboModule 的同步与异步**：

- 需要 Promise 的情况：操作本身有等待时间（用户交互、网络请求、文件 IO）
- 不需要 Promise 的情况：操作可以立即返回，如读取设备信息 `DeviceInfo.getBrand()`
- 原生侧内部可以用 `dispatch_sync` 同步等待主线程结果，对 JS 侧透明，但需谨慎处理死锁风险

---

## 7. 渲染架构深入

### Virtual DOM 与 Shadow Tree 的区别

两者处于不同层次，解决不同问题，是串联关系。

**Virtual DOM** 是 React 在 JS 侧维护的轻量级 JS 对象树，描述"UI 应该长什么样"，和任何平台无关。React 每次状态更新时生成新的 Virtual DOM 树，和旧树做 diff，找出最小变更集（reconciliation）。

**Shadow Tree** 是 React Native 在原生侧维护的布局计算中间层，每个 Shadow Node 持有对应节点的布局属性，Yoga 布局引擎在 Shadow Tree 上计算每个节点的具体像素位置和尺寸。

三棵树的流转关系：

```
Virtual DOM（JS 侧，React 管理）
    ↓  reconciliation diff 后，把变更传给原生侧
Shadow Tree（原生侧，Yoga 布局计算）
    ↓  布局计算完成后，把位置尺寸传给渲染层
原生 UI 树（UIView / Android View，真实渲染）
```

核心区别：

| | Virtual DOM | Shadow Tree |
|---|---|---|
| 所在位置 | JS 内存，纯 JS 对象 | 原生侧（新架构为 C++） |
| 职责 | 描述 UI 结构，reconciliation 的工作对象 | 布局计算，Yoga 的工作对象 |
| 生命周期 | 每次 render 重新生成，短暂的中间产物 | 持久维护，只在有变更时局部更新 |
| 关注点 | "有什么变化" | "每个节点在屏幕上的位置和尺寸" |

### Fiber 在 React Native 中的角色

Fiber 是 React 核心的一部分，不是 React Native 独有的。React Native 使用的就是 React，所以 Fiber 架构从 React 16 开始就一直在 React Native 里运行，新架构并没有引入 Fiber，Fiber 一直都在。

**新架构改变的是 Fiber 之后的部分**，即"把 Fiber 的计算结果交给原生渲染"这一段：

```
Fiber reconciliation（JS 侧，新旧架构相同）
    ↓ 产出变更描述
Fabric 渲染器（新架构，C++ 实现）← 这里是新架构改变的地方
    ↓ 通过 JSI 同步操作
Shadow Tree（C++ 实现的布局层）
    ↓ Yoga 计算布局
原生 UI 树（UIView / Android View）
```

Fabric 是 React Native 的 renderer，Fiber 是 React 的 reconciler，两者是上下游关系，Fabric 是 Fiber 的下游消费者。同一套 Fiber reconciler 可以对接不同的 renderer——Web 上对接 ReactDOM，React Native 上对接 Fabric。

### Shadow Tree 的数据结构

Shadow Tree 是普通的**多叉树**，每个节点直接持有所有子节点的列表。Fiber 是"左子右兄弟"的链表结构（为了支持中断恢复），Shadow Tree 不需要中断恢复，所以直接用树形结构。

```
Fiber 链表（左子右兄弟）          Shadow Tree（多叉树）

FiberNode(App)                    ShadowNode(App)
  child ↓                           ├── ShadowNode(ScrollView)
FiberNode(ScrollView)               │     ├── ShadowNode(View)
  child ↓        sibling →          │     │     ├── ShadowNode(Image)
FiberNode(View)  FiberNode(Footer)  │     │     └── ShadowNode(Text)
  child ↓                           │     └── ShadowNode(View)
FiberNode(Image) → FiberNode(Text)  └── ShadowNode(Footer)
```

每个 Shadow Node 的内部结构：

```
ShadowNode
├── tag（组件类型，如 View / Text / Image）
├── props（样式属性，如 flex、width、padding）
├── yogaNode（布局计算的输入：flexDirection、width、padding 等）
└── layoutMetrics（布局计算的输出，Yoga 算完后填入：x、y、width、height）
```

**Fiber 和 Shadow Tree 的对应关系**：并非一一对应，只有**宿主组件**（`<View>`、`<Text>`、`<Image>` 等最终映射到真实 UI 的组件）才对应 Shadow Node，开发者自定义的复合组件（`<MyButton>`）不对应 Shadow Node，会被过滤掉。所以 Shadow Tree 比 Fiber 树更小、更扁平。

**Shadow Tree 不需要中断的原因**：Fiber 需要中断是因为它跑在 JS 线程，要和其他 JS 任务抢时间片。Shadow Tree 的 Yoga 布局计算运行在独立的后台线程（新架构里是 C++ 层），不占用 JS 线程，也不占用 UI 主线程，没有竞争者，慢慢算完再提交即可。

### Fabric vs UIManager

Fabric 是新架构的 UI 渲染器，替代了旧架构的 UIManager。

**旧架构 UIManager 的工作流程**：

```
JS 线程
  │  产出 UI 变更指令，序列化成 JSON 消息
  ▼
Bridge（异步消息队列）
  ▼
原生线程
  │  UIManager 接收消息，反序列化
  │  在 Java/OC 层维护 Shadow Tree
  │  调用 Yoga 计算布局
  ▼
UI 主线程渲染
```

**Fabric 的核心改变**：

| | UIManager（旧） | Fabric（新） |
|---|---|---|
| Shadow Tree 实现 | Java / OC，两端各一套 | C++，跨平台统一 |
| JS 与 Shadow Tree 通信 | 异步 Bridge + JSON 序列化 | 同步 JSI 直接调用 |
| 布局测量 | 异步回调 | 可同步返回 |
| 渲染阶段 | 三阶段，两次异步跨线程 | 两阶段，一次提交 |
| 数据结构 | 可变，需加锁 | 不可变，天然线程安全 |
| 并发渲染支持 | 不支持 | 支持 |
| 同步渲染模式 | 不支持 | 支持（flushSync） |

**不可变数据结构的价值**：Fabric 的 Shadow Tree 采用不可变设计，更新时创建新节点，复用未变更节点。好处有两个：一是线程安全，JS 线程和 UI 线程可以同时持有不同版本的 Shadow Tree 快照，互不干扰，不需要加锁；二是支持并发渲染，可以随时丢弃一个中间版本而无需回滚。

### 并发渲染支持

React 18 引入并发模式，核心能力是**可以同时准备多个版本的 UI 更新，并且可以中断低优先级的更新去处理高优先级的更新**。

```js
const [isPending, startTransition] = useTransition()

startTransition(() => {
  setResults(heavyFilter(data, text)) // 低优先级，可以被中断
})
setInputValue(e.target.value) // 高优先级，立即响应
```

**旧架构的问题**：即使 Fiber 在 JS 侧支持了优先级调度，UIManager 通过 Bridge 接收消息是严格串行的，没有优先级概念，无法丢弃"正在处理中"的更新，Fiber 的并发能力无法端到端发挥。

**Fabric 如何支持**：不可变 Shadow Tree 让多版本并存成为可能。当高优先级更新来了，Fabric 可以直接丢弃正在计算的低优先级版本，基于当前版本重新计算，零成本，不需要回滚任何状态。

实际效果：在搜索过滤这类场景里，输入框（高优先级）始终流畅响应，过滤结果列表（低优先级）稍后刷新，用户感知到的是丝滑的交互体验。

---

## 8. 框架横向对比

### React Native vs Lynx vs Mach Pro

#### Lynx 的双线程模型

字节跳动的 Lynx 框架（2025年开源）采用双线程设计：

- **主线程（跑在 UI 线程上）**：运行精简 JS 引擎（QuickJS），只处理 UI 相关逻辑（样式计算、布局、动画、手势响应），与原生渲染在同一条线程，UI 响应完全无延迟
- **后台线程**：运行完整 JS 引擎，处理业务逻辑、数据请求、状态管理等

解决的问题：React Native 里 JS 线程繁忙时（大量数据处理），UI 响应会变卡，因为业务逻辑和 UI 逻辑抢同一条线程。Lynx 从架构层面把两类工作隔离开。

代价：开发者需要理解哪些代码跑在主线程、哪些跑在后台线程，心智负担更重。

#### Mach Pro 的多线程改造

Mach Pro 最初设计为**单线程模型**（JS 和 Yoga 布局都在 UI 主线程），目的是解决多线程带来的交互动效卡顿问题。但高达平台复杂页面导致主线程压力过大，才引入 JS 独立线程支持。

**核心改造点**：

1. **DOM API 全部异步化**：JS 移到独立线程后，所有 DOM 操作（createElement、appendChild 等）改为异步，JS 线程发出指令后不等待主线程完成直接返回
2. **Module API 区分处理**：与 UI 无关的 Module 在 JS 线程同步执行，与 UI 有关的切换到主线程
3. **Yoga 布局时机重新设计**：布局时机与 JS 线程 RunLoop 关联，避免多次无效布局

**JS 引擎**：使用 QuickJS（从文档的 `quickjsVersion` 字段可见）

**性能测试结果**（iOS 高端机 iPhone 13 Pro）：

| 指标 | 单线程 | 多线程 | 差值 |
|---|---|---|---|
| 第一页渲染耗时 | 155.96ms | 137.46ms | ↓11.86% |
| 第二页渲染耗时 | 163.11ms | 134.90ms | ↓17.30% |
| 加载更多 FPS | 46 | 57 | +9 |

#### 为什么 Mach Pro 需要 DOM API 异步化，而 React Native 不需要

**React Native 根本没有 DOM API**。JS 侧写的是 React 组件，reconciliation 产出的是虚拟 UI 描述，真实 UI 对象完全由原生侧管理，JS 从来不直接触碰 UI 对象，线程隔离是天然的。

**Mach Pro 有真实的 DOM API**，设计更接近 Web，JS 代码可以直接调用 `createElement`、`appendChild` 等操作 UI 树。单线程时 JS 和 UI 渲染都在主线程，天然同步。JS 移到独立线程后，跨线程操作 UI 对象会崩溃，必须改为异步。

**本质差异**：

- React Native：JS 侧持有**虚拟节点**，用虚拟化隔离换来线程安全
- Mach Pro：JS 侧持有**真实 UI 对象的引用**，用接近 Web 标准的 DOM API 换来开发体验，多线程改造时需付出异步化的代价

#### 三者总结对比

| | React Native | Lynx | Mach Pro |
|---|---|---|---|
| JS 引擎 | Hermes | QuickJS | QuickJS |
| 线程模型 | JS 线程 + UI 线程分离，JSI 通信 | UI 相关 JS 在主线程，业务 JS 在后台线程 | 原单线程，改造为 JS 独立线程 |
| DOM API | 无，使用虚拟 UI 描述 | 类 Web DOM | 类 Web DOM（多线程后异步化） |
| UI 响应保障 | Worklet 机制（需手动标注） | 天然隔离（架构设计） | 异步 DOM 操作 |
| 开发体验 | React 组件模型，心智简单 | 需区分主线程/后台线程代码 | 接近 Web 标准 |
