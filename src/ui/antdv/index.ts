import { componentsReducer, propsReducer } from '../utils'
import { componentInfos, components } from './v4'

export function antDesignVue() {
  return {
    v4: propsReducer(componentInfos),
  }
}

export function antDesignVueComponents() {
  return {
    v4: componentsReducer(components),
  }
}
