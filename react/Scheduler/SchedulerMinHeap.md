## 二叉堆介绍

SchedulerMinHeap是最小堆的实现。那么什么是最小堆呢？最小堆属于二叉堆的一种

> **二叉堆** （英语：binary heap）是一种特殊的[堆](https://zh.wikipedia.org/wiki/%E5%A0%86_(%E6%95%B0%E6%8D%AE%E7%BB%93%E6%9E%84)) "堆 (数据结构)")，二叉堆是[完全二叉树](https://zh.wikipedia.org/wiki/%E5%AE%8C%E5%85%A8%E4%BA%8C%E5%8F%89%E6%A0%91 "完全二叉树")或者是近似完全二叉树。二叉堆满足堆特性：父节点的键值总是保持固定的序关系于任何一个子节点的键值，且每个节点的左子树和右子树都是一个二叉堆。

> 当父[节点](https://zh.wikipedia.org/wiki/%E7%AF%80%E9%BB%9E "节点")的键值总是大于或等于任何一个子节点的键值时为“最大堆”。当父节点的键值总是小于或等于任何一个子节点的键值时为“最小堆”。

完全二叉树的定义如下：

> 若设二叉树的高度为h，除第 h 层外，其它各层 (1～h-1) 的结点数都达到最大个数，第 h 层从右向左连续缺若干结点，这就是完全二叉树。

比如下图就是一颗完全二叉树：

```text
           10
         /     \  
      15        30  
     /  \      /  \
   40    50  100   40
```

Linux 内核中的调度器会根据各个进程的优先级对程序的执行进行调度。在操作系统运行时，通常会有很多个不同的进程，优先级各不相同。在调度器的作用下，优先级高的进程被有限执行，优先级靠后的就只能等待。堆是实现这种调度器的一种很合适的数据结构

一般都是通过数组来实现堆，在SchedulerMinHeap中也是，二叉堆中最重要的操作是插入

## 二叉堆的插入(上浮)

插入时，我们首先将要插入的数据放在数组的尾部。但是这样破坏了堆的特性，因此我们需要进行调整，保证堆的特性。调整操作如下：

1. 将刚插入的节点和其父节点比较，如果符合堆的形成条件或者已经是根节点，那么堆的插入操作就算结束。
2. 重复执行上一步。

这个操作通常被称为 Percolation Up 上浮，图示如下：

![](https://pic1.zhimg.com/80/v2-c2abbc2859f025188a5acf2a4f2c6b78_1440w.webp)


## 从二叉树中取出优先级最高的元素(下沉)

本质上和上浮的原理一致，分为以下几步：

1、取出堆顶元素

2、把堆底的最后一个元素，放到堆顶

3、把这个元素和子节点比较，要是子节点比较小则置换

4、重复第三步，直到这个元素比叶子结点都小或者没有叶子节点了

## SchedulerMinHeap

在其函数中Percolation Up(上浮)的对应函数为：

```javascript
function siftUp(heap, node, i) {
  let index = i;
  while (true) {
    const parentIndex = (index - 1) >>> 1;
    const parent = heap[parentIndex];
    if (parent !== undefined && compare(parent, node) > 0) {
      // The parent is larger. Swap positions.
      heap[parentIndex] = node;
      heap[index] = parent;
      index = parentIndex;
    } else {
      // The parent is smaller. Exit.
      return;
    }
  }
}
```
下沉对应函数为：
```javascript
function siftDown(heap, node, i) {
  let index = i;
  const length = heap.length;
  while (index < length) {
    const leftIndex = (index + 1) * 2 - 1;
    const left = heap[leftIndex];
    const rightIndex = leftIndex + 1;
    const right = heap[rightIndex];

    // If the left or right node is smaller, swap with the smaller of those.
    if (left !== undefined && compare(left, node) < 0) {
      if (right !== undefined && compare(right, left) < 0) {
        heap[index] = right;
        heap[rightIndex] = node;
        index = rightIndex;
      } else {
        heap[index] = left;
        heap[leftIndex] = node;
        index = leftIndex;
      }
    } else if (right !== undefined && compare(right, node) < 0) {
      heap[index] = right;
      heap[rightIndex] = node;
      index = rightIndex;
    } else {
      // Neither child is smaller. Exit.
      return;
    }
  }
}
```
