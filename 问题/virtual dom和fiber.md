### 虚拟dom

为什么框架需要虚拟dom?
首先，react作为一个ui框架，而不是web框架，那么必然要把react操作dom的部分和react本身拆开，如果用户不直接操作dom了，通过react暴露的api去更新ui，那么react是否是需要一层来记录用户的更新，以便后续通过react-dom反映到真实的ui上去，所以虚拟dom诞生了。因此虚拟 DOM 不是一个功能。它是达到目的的一种手段，目的是声明式的、状态驱动的 UI 开发。他通常有以下优点：

* 性能优化(部分场景)
* 降低用户心智负担
* 跨平台兼容性

但是，并不是所有框架都用了虚拟dom，比如svelte，那么为什么svelte不需要用虚拟dom呢？[原文](https://www.svelte.cn/blog/virtual-dom-is-pure-overhead)
简单来说是因为svelte可以通过在编译时做一些事情，达到实现声明式的、状态驱动的 UI 开发，而不需要像react一样通过运行时来做virtual dom diff。

在react中虚拟dom其实就是react elements树，也就是createElements创建出来的对象树。

### fiber

在react16之后，有了fiber架构，他会在react elements基础上再转换为fiber树结构，方便实现并发模式。本质上react从堆栈结构转换为了链表结构。
fiber这个词在计算机领域出现，是90年代windows推出了协程的api，当时也取名叫fiber。但在react中，fiber背后的思想不是协程，而是代数效应，代数效应的特点有：中断、恢复、状态管理以及副作用的隔离。可以看到这些在react中都有体现。

![](https://7km.top/static/code2dom.98309914.png)
