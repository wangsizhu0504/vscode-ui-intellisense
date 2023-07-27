import * as vscode from 'vscode'
import { addEventListener, copyText, getSelection, message, registerCommand, registerCompletionItemProvider } from '@vscode-use/utils'
import { findPkgUI, parser } from './utils'
import UI from './ui'
import { resolverExtensions } from './constants'
import type { IPackage, IUiCompletions } from './types'

declare const global: {
  commonIntellisense: {
    copyDom: string
  }
}

let uiNames: string[] = []
// 组件提示数据
let compCompletions: null | vscode.CompletionItem[] = null
// 属性提示数据
let attrCompletions: null | IUiCompletions = null
let cacheMap: any = {}
let extensionContext: any = null

// 启动插件
export function activate(context: vscode.ExtensionContext) {
  extensionContext = context
  global.commonIntellisense = {
    copyDom: '',
  }
  // 注册事件监听
  context.subscriptions.push(addEventListener('activeText-change', (editor: vscode.TextEditor) => {
    // 找到当前活动的编辑器
    const visibleEditors = vscode.window.visibleTextEditors
    const currentEditor = visibleEditors.find(e => e === editor)
    if (currentEditor)
      findUI()
  }))

  // 注册demo 复制命令
  context.subscriptions.push(registerCommand('intellisense.copyDemo', () => {
    copyText(global.commonIntellisense.copyDom)
    message.info('copy successfully')
  }))

  findUI()

  // 注册自动补全
  context.subscriptions.push(registerCompletionItemProvider(Object.values(resolverExtensions), (document, position) => {
    const result = parser(document.getText(), position)
    if (!result)
      return []
    if (attrCompletions && result?.type === 'props') {
      const name = result.tag[0].toUpperCase() + result.tag.replace(/(-\w)/g, (match: string) => match[1].toUpperCase()).slice(1)
      return result.propName === 'on'
        ? attrCompletions[name].events
        : attrCompletions[name].attrs
    } else if (!result.isInTemplate) {
      return []
    }
    const { lineText } = getSelection()!
    if (compCompletions && lineText?.slice(-1)[0] !== ' ')
      return compCompletions

    return []
  }, ['"', '\'', '-', ' ', '@']))
}

// 卸载插件
export function deactivate() {
  uiNames = []
  compCompletions = null
  attrCompletions = null
  cacheMap = null
}

// 查找当前项目的 UI 库
function findUI() {
  // 文件路径
  const cwd = vscode.window.activeTextEditor?.document.uri.fsPath
  const suffix = cwd?.split('.').slice(-1)[0]
  if (!suffix || !Object.keys(resolverExtensions).includes(suffix))
    return

  const values = Object.values(cacheMap) as string[]
  if (values[0] && values[0].includes(cwd))
    return
  findPkgUI(cwd).then((res) => {
    if (!res) return
    const { pkg, uis } = res
    if (!uis)
      return
    if (Object.keys(cacheMap).length) {
      if (!cacheMap[pkg]) {
        cacheMap = {}
        cacheMap[pkg] = []
      }
    } else if (!cacheMap[pkg]) {
      cacheMap[pkg] = []
    }
    cacheMap[pkg].push(cwd)
    const packageUINames: string[] = uis.map(({ name }: IPackage) => name)

    if (packageUINames.every(name => uiNames.includes(name))) return
    uiNames = packageUINames
    compCompletions = uis
      .reduce((result: any, { name, version }: IPackage) => {
        const componentsNames = (UI as any)[`${name}Components`]?.()?.[`v${version}`] as string[]
        if (componentsNames)
          result.push(...componentsNames)
        return result
      }, [])
    attrCompletions = uis.reduce((result: any, { name, version }: IPackage) => {
      return Object.assign(result, (UI as any)[name]?.(extensionContext)?.[`v${version}`])
    }, {} as any)
  })
}
