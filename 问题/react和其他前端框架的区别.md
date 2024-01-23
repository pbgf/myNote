## 响应式（signal）

* 在vue中计算属性会自动追踪响应式依赖，而不需要手动写依赖
* 在solid.js中 createEffect 也是不需要手动写依赖的
* redux的useSelector也是订阅式的只更新用到的组件
  而react中，无论是useEffect还是usememo以及useCallback都需要开发者手动维护依赖，那为什么react不支持响应式呢？

![react官方回复](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b3f45a6fbe8542a9ba005755a7cfd3e1~tplv-k3u1fbpfcp-zoom-in-crop-mark:1512:0:0:0.awebp)

react团队认为，响应式能带来很好的性能，但不是一个很好的书写UI code的方式。

> `React`的理念可以用一句话概括：**UI反映状态在某一刻的快照** 。(待验证 后续看dan的blog)

如果按照这个理念，那么既然是快照，那就不是局部的，而是个整体概念。在React中，状态更新会引起整个应用重新render，就是对React快照理念的最好诠释。但是react也不是坐以待毙什么都不做，如果不用响应式来提高性能，那么通过什么呢？

react 团队的黄玄在2021的react conf上提出了react forget的概念，意在减少用户的心智负担同时提升性能。大概是怎么一回事呢，思考下面的例子

```javascript
function VideoTab({heading, videos, filter}) {
  const filterdList = [];
  for (const video of videos) {
    if (applyFilter(video, filter)) {
      filterdList.push(video);
    }
  }
  if (filterdList.length === 0) {
    return <NoVideos />;
  }

  return (
    <>
      <Heading
        heading={heading}
        count={filterdList.length}
      />
      <VideoList videos={filterdList} />
    </>
  )
}
```

这个**VideoList**组件虽然只依赖了filterdList变量，但是如果传入了新的heading属性，也会重新生成新的filterdList，导致VideoList重复渲染。

那么react forget是什么呢，首先它是一个编译器，他会自动帮你优化代码，你不再需要手动写依赖等等，这样既减少了开发者心智负担又提高了性能。react forget的实现依托于静态分析程序代码。

`React Forget`当前仍处在`Meta`内部少数业务线的验证阶段。
