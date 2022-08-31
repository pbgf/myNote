import { createContainer } from './unstated-next';

export function composeContainer(mapping) {
  const containerMap = {};  
  function compose(containers) {
      return function Component(props) {
        return containers.reduceRight((children, Container) => {
          return <Container.Provider>{children}</Container.Provider>
        }, props.children)
      }
    }
    const containers = Object.keys(mapping).map((key) => {
      const item = createContainer(mapping[key]);
      containerMap[key] = item;
      return item;
    });
    return {
        Provider: compose(containers),
        containers: Object.keys(containerMap).reduce((obj, key) => {
            obj[key] = function () {
                return containerMap[key].useContainer();
            }
            return obj
        }, {})
    }
}